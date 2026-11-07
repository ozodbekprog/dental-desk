import { prisma } from "./prisma";
import {
  SLOT_TIMES,
  cellsFor,
  dayList,
  isClosed,
  isPastSlot,
  loadBookingData,
  parseYmd,
} from "./booking";
import { ymd } from "./util";

/**
 * Doctor network (v3): global doctor directory, clinic links and public booking
 * for independent doctors. Clinic doctors keep using the per-clinic requests
 * queue, so reception and the doctor see them in the existing app.
 */

export const SPECIALTIES = [
  "therapist",
  "surgeon",
  "orthodontist",
  "hygienist",
  "pediatric",
] as const;

export const SPECIALTY_LABELS: Record<string, string> = {
  therapist: "Terapevt",
  surgeon: "Jarroh",
  orthodontist: "Ortodont",
  hygienist: "Gigienist",
  pediatric: "Bolalar stomatologi",
};

export const HOLD_MINUTES = 120;

export function digits(value: string): string {
  return String(value || "").replace(/\D+/g, "");
}

export function phoneKey(value: string): string {
  const d = digits(value);
  return d.length === 9 ? `998${d}` : d;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function parseJson(data: string): Record<string, unknown> {
  try {
    return asObject(JSON.parse(data));
  } catch {
    return {};
  }
}

export type ClinicLink = {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  mapUrl: string;
};

export type DoctorCard = {
  id: string;
  name: string;
  specialty: string;
  specialtyLabel: string;
  experience: number;
  photoUrl: string;
  bio: string;
  contract: string;
  rating: number;
  ratingCount: number;
  priceFrom: number;
  place: string;
  address: string;
  mapUrl: string;
  phone: string;
  clinics: ClinicLink[];
};

export type ClinicCard = {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  mapUrl: string;
  doctorsCount: number;
  rating: number;
  doctors: { id: string; name: string; specialty: string; photoUrl: string }[];
};

export type DoctorDetail = DoctorCard & {
  reviews: { id: string; rating: number; comment: string; createdAt: string }[];
  days: string[];
  today: string;
};

type DoctorWithClinics = {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  experience: number;
  bio: string;
  photoUrl: string;
  contract: string;
  address: string;
  mapUrl: string;
  priceFrom: number;
  ratingAvg: number;
  ratingCount: number;
  clinics: {
    id: string;
    recordId: string;
    clinic: {
      id: string;
      name: string;
      slug: string;
      address: string;
      phone: string;
      mapUrl: string;
    };
  }[];
};

function minPrice(data: string): number {
  const items = parseJson(data).items;
  if (!items || typeof items !== "object") return 0;
  let min = 0;
  for (const group of Object.values(items as Record<string, unknown>)) {
    if (!group || typeof group !== "object") continue;
    for (const value of Object.values(group as Record<string, unknown>)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
      if (!min || value < min) min = value;
    }
  }
  return min;
}

function doctorCards(profiles: DoctorWithClinics[], priceMap: Map<string, number>): DoctorCard[] {
  return profiles.map((profile) => {
    const clinics: ClinicLink[] = profile.clinics.map((link) => ({
      id: link.clinic.id,
      name: link.clinic.name,
      slug: link.clinic.slug,
      address: link.clinic.address,
      phone: link.clinic.phone,
      mapUrl: link.clinic.mapUrl,
    }));
    const place = clinics[0] || null;
    const clinicPrice = profile.clinics.reduce((best, link) => {
      const price = priceMap.get(`${link.clinic.id}:${link.recordId}`) || 0;
      if (!price) return best;
      return !best || price < best ? price : best;
    }, 0);
    return {
      id: profile.id,
      name: profile.name,
      specialty: profile.specialty,
      specialtyLabel: SPECIALTY_LABELS[profile.specialty] || profile.specialty,
      experience: profile.experience,
      photoUrl: profile.photoUrl,
      bio: profile.bio,
      contract: profile.contract,
      rating: Math.round(profile.ratingAvg * 10) / 10,
      ratingCount: profile.ratingCount,
      priceFrom: clinicPrice || profile.priceFrom,
      place: place ? place.name : "Mustaqil qabul",
      address: place ? place.address : profile.address,
      mapUrl: place ? place.mapUrl : profile.mapUrl,
      phone: place ? place.phone : profile.phone,
      clinics,
    } satisfies DoctorCard;
  });
}

async function priceMapFor(profiles: DoctorWithClinics[]): Promise<Map<string, number>> {
  const pairs = profiles.flatMap((profile) =>
    profile.clinics.map((link) => ({ clinicId: link.clinic.id, docId: link.recordId }))
  );
  if (!pairs.length) return new Map();
  const rows = await prisma.record.findMany({
    where: {
      collection: "prices",
      OR: pairs.map((pair) => ({ clinicId: pair.clinicId, docId: pair.docId })),
    },
    select: { clinicId: true, docId: true, data: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    const price = minPrice(row.data);
    if (price) map.set(`${row.clinicId}:${row.docId}`, price);
  }
  return map;
}

const profileInclude = {
  clinics: {
    where: { isPublic: true },
    include: {
      clinic: {
        select: { id: true, name: true, slug: true, address: true, phone: true, mapUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} as const;

export async function listDoctors(filters: {
  q?: string;
  specialty?: string;
  clinicSlug?: string;
}): Promise<DoctorCard[]> {
  const q = String(filters.q || "").trim().slice(0, 60);
  const specialty = (SPECIALTIES as readonly string[]).includes(String(filters.specialty))
    ? String(filters.specialty)
    : "";
  const clinicSlug = String(filters.clinicSlug || "")
    .trim()
    .slice(0, 64);

  const profiles = await prisma.doctorProfile.findMany({
    where: {
      status: "active",
      isPublic: true,
      ...(specialty ? { specialty } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { bio: { contains: q } }] } : {}),
      ...(clinicSlug
        ? { clinics: { some: { isPublic: true, clinic: { slug: clinicSlug, status: "active" } } } }
        : {}),
    },
    include: profileInclude,
    orderBy: [{ ratingAvg: "desc" }, { name: "asc" }],
    take: 100,
  });

  return doctorCards(profiles as DoctorWithClinics[], await priceMapFor(profiles as DoctorWithClinics[]));
}

export async function getDoctor(id: string): Promise<DoctorDetail | null> {
  if (!id || id.length > 64) return null;
  const profile = await prisma.doctorProfile.findUnique({
    where: { id },
    include: profileInclude,
  });
  if (!profile || profile.status !== "active" || !profile.isPublic) return null;

  const prices = await priceMapFor([profile as DoctorWithClinics]);
  const card = doctorCards([profile as DoctorWithClinics], prices)[0];
  const reviews = await prisma.doctorReview.findMany({
    where: { doctorId: profile.id, status: "published" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, rating: true, comment: true, createdAt: true },
  });
  const today = ymd(new Date());
  return {
    ...card,
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    })),
    days: dayList(today),
    today,
  };
}

export async function listClinics(): Promise<ClinicCard[]> {
  const clinics = await prisma.clinic.findMany({
    where: { status: "active" },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      phone: true,
      mapUrl: true,
      doctors: {
        where: { isPublic: true, doctor: { status: "active", isPublic: true } },
        select: {
          doctor: {
            select: {
              id: true,
              name: true,
              specialty: true,
              photoUrl: true,
              ratingAvg: true,
              ratingCount: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return clinics
    .filter((clinic) => clinic.doctors.length > 0)
    .map((clinic) => {
      const rated = clinic.doctors.filter((link) => link.doctor.ratingCount > 0);
      const rating = rated.length
        ? rated.reduce((sum, link) => sum + link.doctor.ratingAvg, 0) / rated.length
        : 0;
      return {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        address: clinic.address,
        phone: clinic.phone,
        mapUrl: clinic.mapUrl,
        doctorsCount: clinic.doctors.length,
        rating: Math.round(rating * 10) / 10,
        doctors: clinic.doctors.map((link) => ({
          id: link.doctor.id,
          name: link.doctor.name,
          specialty: link.doctor.specialty,
          photoUrl: link.doctor.photoUrl,
        })),
      };
    });
}

export type HomeReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  doctor: { id: string; name: string; specialtyLabel: string };
};

export async function listRecentReviews(take = 4): Promise<HomeReview[]> {
  const rows = await prisma.doctorReview.findMany({
    where: { status: "published", comment: { not: "" } },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(take * 2, 2), 20),
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      doctor: { select: { id: true, name: true, specialty: true, isPublic: true, status: true } },
    },
  });
  return rows
    .filter((row) => row.doctor.isPublic && row.doctor.status === "active")
    .slice(0, take)
    .map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
      doctor: {
        id: row.doctor.id,
        name: row.doctor.name,
        specialtyLabel: SPECIALTY_LABELS[row.doctor.specialty] || row.doctor.specialty,
      },
    }));
}

export type SlotResult = {
  days: string[];
  today: string;
  closed: boolean;
  slots: string[];
};

export async function getDoctorSlots(
  doctorId: string,
  date: string,
  clinicId?: string
): Promise<SlotResult | null> {
  const profile = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: {
      clinics: {
        where: { isPublic: true, clinic: { status: "active" } },
        include: { clinic: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!profile || profile.status !== "active" || !profile.isPublic) return null;

  const today = ymd(new Date());
  const days = dayList(today);
  const result: SlotResult = { days, today, closed: false, slots: [] };
  if (!days.includes(date)) return result;

  if (isClosed(date)) {
    result.closed = true;
    return result;
  }

  const now = new Date();
  const link = clinicId
    ? profile.clinics.find((item) => item.clinicId === clinicId)
    : profile.clinics[0];

  if (link) {
    const data = await loadBookingData(link.clinicId);
    const busy = new Set<string>();
    for (const appointment of data.appointments) {
      if (appointment.doctorId !== link.recordId || appointment.date !== date) continue;
      if (appointment.status === "cancelled" || appointment.status === "no-show") continue;
      for (const cell of cellsFor(appointment.time, appointment.duration)) busy.add(cell);
    }
    for (const slot of data.slots) {
      if (slot.doctorId === link.recordId && slot.date === date) busy.add(slot.time);
    }
    const holdMs = HOLD_MINUTES * 60_000;
    for (const doc of data.requests) {
      for (const item of doc.items) {
        if (item.doctorId !== link.recordId || item.date !== date) continue;
        const status = data.reqstates[item.id]?.status || "requested";
        if (status === "confirmed" || status === "declined") continue;
        const created = item.createdAt || 0;
        if (status === "requested" && created && Date.now() - created > holdMs) continue;
        for (const cell of cellsFor(item.time, item.duration || 30)) busy.add(cell);
      }
    }
    result.slots = SLOT_TIMES.filter(
      (time) => !busy.has(time) && !isPastSlot(date, time, now)
    );
    return result;
  }

  const bookings = await prisma.networkBooking.findMany({
    where: {
      doctorId,
      date,
      status: { in: ["requested", "confirmed"] },
    },
    select: { time: true, duration: true, status: true, createdAt: true },
  });
  const holdMs = HOLD_MINUTES * 60_000;
  const busy = new Set<string>();
  for (const booking of bookings) {
    if (booking.status === "requested" && Date.now() - booking.createdAt.getTime() > holdMs) {
      continue;
    }
    for (const cell of cellsFor(booking.time, booking.duration)) busy.add(cell);
  }
  result.slots = SLOT_TIMES.filter((time) => !busy.has(time) && !isPastSlot(date, time, now));
  return result;
}

export function newBookingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `DD-${out}`;
}

export async function getBookingByCode(code: string) {
  const clean = String(code || "").trim().toUpperCase().slice(0, 16);
  if (!/^DD-[A-Z0-9]{4,8}$/.test(clean)) return null;
  return prisma.networkBooking.findUnique({
    where: { code: clean },
    include: {
      doctor: {
        select: { id: true, name: true, specialty: true, photoUrl: true, phone: true },
      },
      clinic: { select: { id: true, name: true, slug: true, address: true, mapUrl: true } },
    },
  });
}

export type ClinicRequestStatus = {
  id: string;
  status: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  duration: number;
  reason: string;
  reasonKind: string;
  doctorId: string;
  doctorName: string;
  clinic: { id: string; name: string; slug: string; address: string; mapUrl: string; phone: string };
  address: string;
  mapUrl: string;
  createdAt: number;
};

/** Status page for bookings made through the per-clinic queue. */
export async function getClinicRequestStatus(
  slug: string,
  requestId: string
): Promise<ClinicRequestStatus | null> {
  if (!/^[a-z0-9-]{1,64}$/.test(slug) || !/^[A-Za-z0-9_-]{1,64}$/.test(requestId)) return null;
  const clinic = await prisma.clinic.findUnique({ where: { slug } });
  if (!clinic) return null;

  const rows = await prisma.record.findMany({
    where: { clinicId: clinic.id, collection: { in: ["requests", "reqstate"] } },
    select: { collection: true, docId: true, data: true },
  });
  const state = rows.find((row) => row.collection === "reqstate" && row.docId === requestId);
  let item: Record<string, unknown> | null = null;
  for (const row of rows) {
    if (row.collection !== "requests") continue;
    const items = parseJson(row.data).items;
    if (!Array.isArray(items)) continue;
    const found = items
      .map((value) => asObject(value))
      .find((value) => value.id === requestId);
    if (found) {
      item = found;
      break;
    }
  }
  if (!item) return null;

  const doctorId = String(item.doctorId || "");
  const link = await prisma.clinicDoctor.findFirst({
    where: { clinicId: clinic.id, recordId: doctorId },
    include: { doctor: { select: { name: true, specialty: true } } },
  });
  const statusObj = state ? parseJson(state.data) : {};
  return {
    id: requestId,
    status: String(statusObj.status || "requested"),
    name: String(item.name || ""),
    phone: String(item.phone || ""),
    date: String(item.date || ""),
    time: String(item.time || ""),
    duration: Number(item.duration) || 30,
    reason: String(item.reasonText || item.reasonOther || item.reason || ""),
    reasonKind: String(item.reasonKind || ""),
    doctorId,
    doctorName: link?.doctor.name || String(item.doctorName || ""),
    clinic: {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      address: clinic.address,
      mapUrl: clinic.mapUrl,
      phone: clinic.phone,
    },
    address: clinic.address,
    mapUrl: clinic.mapUrl,
    createdAt: Number(item.createdAt) || 0,
  };
}

export async function refreshDoctorRating(doctorId: string): Promise<void> {
  const reviews = await prisma.doctorReview.findMany({
    where: { doctorId, status: "published" },
    select: { rating: true },
  });
  const count = reviews.length;
  const avg = count ? reviews.reduce((sum, review) => sum + review.rating, 0) / count : 0;
  await prisma.doctorProfile.update({
    where: { id: doctorId },
    data: { ratingAvg: Math.round(avg * 100) / 100, ratingCount: count },
  });
}

export function isBookableDate(date: string, days: string[]): boolean {
  return days.includes(date) && !isClosed(date) && !Number.isNaN(parseYmd(date).getTime());
}
