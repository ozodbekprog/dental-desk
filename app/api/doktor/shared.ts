import type { DoctorProfile, NetworkBooking, TreatmentRecord } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/util";
import {
  SPECIALTY_LABELS,
  type DoctorBookingDTO,
  type DoctorCounts,
  type DoctorProfileDTO,
  type TreatmentDTO,
} from "@/components/doctor/types";

/**
 * Helpers shared by the independent doctor endpoints. Everything is scoped to
 * the session's own DoctorProfile, so no other doctor's data can leak.
 */

export const NO_STORE = { "Cache-Control": "no-store" } as const;

export type DoctorContext =
  | { ok: true; uid: string; profile: DoctorProfile | null }
  | { ok: false; error: Response };

/**
 * Session must belong to a clinic-less doctor. Role and clinic membership are
 * re-read from the database so stale tokens cannot reach the portal.
 */
export async function requireDoctor(): Promise<DoctorContext> {
  const session = await getSession();
  if (!session) return { ok: false, error: jsonError("unauthorized", 401) };

  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { id: true, role: true, clinicId: true },
  });
  if (!user || user.role !== "doctor" || user.clinicId) {
    return { ok: false, error: jsonError("forbidden", 403) };
  }

  const profile = await prisma.doctorProfile.findUnique({ where: { userId: user.id } });
  return { ok: true, uid: user.id, profile };
}

export function toProfileDTO(profile: DoctorProfile): DoctorProfileDTO {
  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    specialty: profile.specialty,
    specialtyLabel: SPECIALTY_LABELS[profile.specialty] || profile.specialty,
    bio: profile.bio,
    address: profile.address,
    mapUrl: profile.mapUrl,
    priceFrom: profile.priceFrom,
    status: profile.status,
    contract: profile.contract,
    experience: profile.experience,
    rating: Math.round(profile.ratingAvg * 10) / 10,
    ratingCount: profile.ratingCount,
  };
}

type BookingWithClinic = NetworkBooking & { clinic?: { name: string } | null };

export function toBookingDTO(booking: BookingWithClinic): DoctorBookingDTO {
  return {
    id: booking.id,
    code: booking.code,
    name: booking.name,
    phone: booking.phone,
    date: booking.date,
    time: booking.time,
    duration: booking.duration,
    reason: booking.reason,
    reasonKind: booking.reasonKind,
    audioData: booking.audioData,
    status: booking.status,
    address: booking.address,
    mapUrl: booking.mapUrl,
    doctorNote: booking.doctorNote,
    clinicName: booking.clinic?.name || "",
    createdAt: booking.createdAt.toISOString(),
    confirmedAt: booking.confirmedAt ? booking.confirmedAt.toISOString() : null,
  };
}

export function toTreatmentDTO(record: TreatmentRecord): TreatmentDTO {
  return {
    id: record.id,
    visitId: record.visitId,
    bookingId: record.bookingId,
    patientName: record.patientName,
    patientPhone: record.patientPhone,
    date: record.date,
    tooth: record.tooth,
    procedure: record.procedure,
    surfaces: record.surfaces,
    note: record.note,
    createdAt: record.createdAt.toISOString(),
  };
}

const RANK: Record<string, number> = {
  requested: 0,
  confirmed: 1,
  declined: 2,
  completed: 3,
  cancelled: 4,
};

/** Pending requests first, then confirmed by date/time, then the rest. */
export async function listDoctorBookings(doctorId: string): Promise<DoctorBookingDTO[]> {
  const rows = await prisma.networkBooking.findMany({
    where: {
      doctorId,
      status: { in: ["requested", "confirmed", "declined", "completed", "cancelled"] },
    },
    include: { clinic: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return rows
    .slice()
    .sort((a, b) => {
      const ra = RANK[a.status] ?? 3;
      const rb = RANK[b.status] ?? 3;
      if (ra !== rb) return ra - rb;
      if (a.status === "confirmed") {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        if (a.time !== b.time) return a.time < b.time ? -1 : 1;
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .map(toBookingDTO);
}

export async function doctorCounts(doctorId: string): Promise<DoctorCounts> {
  const rows = await prisma.networkBooking.groupBy({
    by: ["status"],
    where: { doctorId, status: { in: ["requested", "confirmed", "declined"] } },
    _count: { _all: true },
  });
  const by: Record<string, number> = {};
  for (const row of rows) by[row.status] = row._count._all;
  const requested = by.requested || 0;
  const confirmed = by.confirmed || 0;
  const declined = by.declined || 0;
  return { requested, confirmed, declined, total: requested + confirmed + declined };
}

/** "09:00" -> 540 */
export function minutesOf(time: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(time || "").trim());
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function stepDuration(duration: number): number {
  const value = Number.isFinite(duration) && duration > 0 ? duration : 30;
  return Math.max(30, Math.ceil(value / 30) * 30);
}

/** Two slots collide when their 30-minute cell ranges intersect. */
export function slotsOverlap(
  aTime: string,
  aDuration: number,
  bTime: string,
  bDuration: number
): boolean {
  const aStart = minutesOf(aTime);
  const bStart = minutesOf(bTime);
  const aEnd = aStart + stepDuration(aDuration);
  const bEnd = bStart + stepDuration(bDuration);
  if (!aStart || !bStart) return false;
  return aStart < bEnd && bStart < aEnd;
}
