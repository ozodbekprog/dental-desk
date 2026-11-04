import { clinicWritable } from "./auth";
import { prisma } from "./prisma";
import { addDays, ymd } from "./util";

/**
 * Shared booking rules for the public booking page and the clinic app.
 * The app shell keeps the same constants in content/app.html; keep both in sync.
 */
export const WORK = {
  start: 540,
  end: 1080,
  step: 30,
  lunchStart: 780,
  lunchEnd: 840,
  closedDay: 0,
  horizonDays: 14,
} as const;

export const SLOT_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let m = WORK.start; m < WORK.end; m += WORK.step) {
    if (m >= WORK.lunchStart && m < WORK.lunchEnd) continue;
    out.push(fromMin(m));
  }
  return out;
})();

export const REASON_IDS = [
  "checkup",
  "pain",
  "cleaning",
  "filling",
  "rootcanal",
  "extraction",
  "crown",
  "whitening",
  "consult",
  "followup",
  "emergency",
] as const;

export type PublicDoctor = { id: string; name: string; spec: string };

export type PublicClinicInfo = {
  clinic: { id: string; name: string; slug: string };
  open: boolean;
  today: string;
  days: string[];
  doctors: PublicDoctor[];
};

type Appointment = {
  id: string;
  doctorId: string;
  date: string;
  time: string;
  duration: number;
  status: string;
};

type Slot = { doctorId: string; date: string; time: string };

export type RequestItem = {
  id: string;
  name?: string;
  phone?: string;
  doctorId: string;
  date: string;
  time: string;
  duration?: number;
  reason?: string;
  reasonOther?: string;
  source?: string;
  createdAt?: number;
};

type RequestDoc = { docId: string; items: RequestItem[] };

export type BookingData = {
  appointments: Appointment[];
  slots: Slot[];
  requests: RequestDoc[];
  reqstates: Record<string, { status?: string }>;
};

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

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function fromMin(m: number): string {
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function toMin(time: string): number {
  const [h, m] = String(time || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function parseYmd(date: string): Date {
  const [y, m, d] = String(date).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(parseYmd(date).getTime());
}

export function dayList(today = ymd(new Date())): string[] {
  const out: string[] = [];
  for (let i = 0; i < WORK.horizonDays; i++) {
    out.push(ymd(addDays(parseYmd(today), i)));
  }
  return out;
}

export function isClosed(date: string): boolean {
  return isValidDate(date) && parseYmd(date).getDay() === WORK.closedDay;
}

export function isPastSlot(date: string, time: string, now = new Date()): boolean {
  const today = ymd(now);
  if (date < today) return true;
  if (date > today) return false;
  return toMin(time) <= now.getHours() * 60 + now.getMinutes();
}

export function cellsFor(time: string, duration = 30): string[] {
  const out: string[] = [];
  const start = toMin(time);
  const count = Math.max(1, Math.ceil(duration / WORK.step));
  for (let i = 0; i < count; i++) out.push(fromMin(start + i * WORK.step));
  return out;
}

export function slotKey(doctorId: string, date: string, cell: string): string {
  return `${doctorId}_${date}_${cell.replace(":", "")}`;
}

export async function getPublicClinic(slug: string): Promise<PublicClinicInfo | null> {
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const clinic = await prisma.clinic.findUnique({ where: { slug } });
  if (!clinic) return null;

  const rows = await prisma.record.findMany({
    where: { clinicId: clinic.id, collection: "doctors" },
    select: { docId: true, data: true },
  });
  const doctors = rows
    .map((row) => {
      const d = parseJson(row.data);
      return {
        id: row.docId,
        name: str(d.name).trim(),
        spec: str(d.spec) || "dentist",
        pending: d.pending === true,
      };
    })
    .filter((d) => d.name && !d.pending)
    .map(({ id, name, spec }) => ({ id, name, spec }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const today = ymd(new Date());
  return {
    clinic: { id: clinic.id, name: clinic.name, slug: clinic.slug },
    open: clinicWritable(clinic),
    today,
    days: dayList(today),
    doctors,
  };
}

export async function loadBookingData(clinicId: string): Promise<BookingData> {
  const rows = await prisma.record.findMany({
    where: {
      clinicId,
      collection: { in: ["appointments", "slots", "requests", "reqstate"] },
    },
    select: { collection: true, docId: true, data: true },
  });

  const data: BookingData = { appointments: [], slots: [], requests: [], reqstates: {} };
  for (const row of rows) {
    const value = parseJson(row.data);
    if (row.collection === "appointments") {
      data.appointments.push({
        id: row.docId,
        doctorId: str(value.doctorId),
        date: str(value.date),
        time: str(value.time),
        duration: num(value.duration, 30),
        status: str(value.status) || "scheduled",
      });
    } else if (row.collection === "slots") {
      data.slots.push({
        doctorId: str(value.doctorId),
        date: str(value.date),
        time: str(value.time),
      });
    } else if (row.collection === "requests") {
      const items = Array.isArray(value.items) ? value.items : [];
      data.requests.push({
        docId: row.docId,
        items: items
          .map((item) => {
            const it = asObject(item);
            return {
              id: str(it.id),
              name: str(it.name),
              phone: str(it.phone),
              doctorId: str(it.doctorId),
              date: str(it.date),
              time: str(it.time),
              duration: num(it.duration, 30),
              reason: str(it.reason),
              reasonOther: str(it.reasonOther),
              source: str(it.source) || "app",
              createdAt: num(it.createdAt, 0),
            };
          })
          .filter((item) => item.id),
      });
    } else if (row.collection === "reqstate") {
      data.reqstates[row.docId] = { status: str(value.status) };
    }
  }
  return data;
}

export function requestStatus(data: BookingData, id: string): string {
  const state = data.reqstates[id];
  return state?.status || "requested";
}

export function busyTimes(
  data: BookingData,
  doctorId: string,
  date: string,
  exceptItemId?: string
): Set<string> {
  const busy = new Set<string>();
  const add = (time: string, duration: number) => {
    for (const cell of cellsFor(time, duration)) busy.add(cell);
  };

  for (const a of data.appointments) {
    if (a.doctorId !== doctorId || a.date !== date) continue;
    if (a.status === "cancelled" || a.status === "no-show") continue;
    if (a.time) add(a.time, a.duration);
  }
  for (const s of data.slots) {
    if (s.doctorId === doctorId && s.date === date && s.time) busy.add(s.time);
  }
  for (const doc of data.requests) {
    for (const item of doc.items) {
      if (item.id === exceptItemId) continue;
      if (item.doctorId !== doctorId || item.date !== date) continue;
      const status = requestStatus(data, item.id);
      if (status === "confirmed" || status === "declined") continue;
      if (item.time) add(item.time, item.duration || 30);
    }
  }
  return busy;
}

export function freeSlots(
  data: BookingData,
  doctorId: string,
  date: string,
  now = new Date()
): string[] {
  if (isClosed(date)) return [];
  const busy = busyTimes(data, doctorId, date);
  return SLOT_TIMES.filter((time) => !busy.has(time) && !isPastSlot(date, time, now));
}

export function requestTimeTaken(
  data: BookingData,
  doctorId: string,
  date: string,
  time: string
): boolean {
  const busy = busyTimes(data, doctorId, date);
  return cellsFor(time, 30).some((cell) => busy.has(cell));
}

/* Serialises public submissions per clinic+slot so two clients cannot take the
   same time between the availability check and the insert. */
const locks = new Map<string, Promise<unknown>>();

export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) || Promise.resolve();
  const run = previous.then(fn, fn);
  const stored = run.catch(() => undefined);
  locks.set(key, stored);
  return run.finally(() => {
    if (locks.get(key) === stored) locks.delete(key);
  });
}
