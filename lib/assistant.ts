import { clinicWritable, canWriteRole } from "./auth";
import { prisma } from "./prisma";
import { addDays, ymd } from "./util";

/* ------------------------------------------------------------------ */
/* Clinic data snapshot                                                */
/* ------------------------------------------------------------------ */

export type AssistantDoctor = { id: string; name: string; spec?: string };
export type AssistantPatient = {
  id: string;
  name: string;
  phone?: string;
  dob?: string;
};
export type AssistantAppointment = {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  reason?: string;
  reasonOther?: string;
  source?: string;
};
export type AssistantSlot = { ref: string; doctorId: string; date: string; time: string };
export type AssistantVisit = {
  id: string;
  patientId: string;
  date: string;
  total?: number;
  doctorName?: string;
};

export type ClinicData = {
  doctors: AssistantDoctor[];
  patients: AssistantPatient[];
  appointments: AssistantAppointment[];
  slots: AssistantSlot[];
  visits: AssistantVisit[];
};

export type AssistantContext = {
  clinic: { id: string; name: string; plan: string; status: string; trialEndsAt: Date | null };
  writable: boolean;
  data: ClinicData;
  actions: string[];
};

const DATA_COLLECTIONS = ["doctors", "patients", "appointments", "slots", "visits"] as const;

export async function loadClinicData(clinicId: string): Promise<ClinicData> {
  const rows = await prisma.record.findMany({
    where: { clinicId, collection: { in: [...DATA_COLLECTIONS] } },
  });
  const buckets: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(row.data) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
    (buckets[row.collection] ||= {})[row.docId] = parsed;
  }
  const list = (name: string) =>
    Object.entries(buckets[name] || {}).map(
      ([id, data]) => ({ id, ...(data as Record<string, unknown>) }) as Record<string, unknown>
    );

  return {
    doctors: list("doctors") as AssistantDoctor[],
    patients: list("patients") as AssistantPatient[],
    appointments: list("appointments") as AssistantAppointment[],
    slots: list("slots") as AssistantSlot[],
    visits: list("visits") as AssistantVisit[],
  };
}

export async function buildContext(clinic: {
  id: string;
  name: string;
  plan: string;
  status: string;
  trialEndsAt: Date | null;
}, role: string): Promise<AssistantContext> {
  const data = await loadClinicData(clinic.id);
  if (role === "callcenter") {
    // The call centre works with booking requests only; clinical data stays out.
    data.visits = [];
    data.patients = data.patients.map((p) => ({ id: p.id, name: p.name, phone: p.phone, dob: p.dob }));
  }
  return {
    clinic,
    writable: canWriteRole(role) && clinicWritable(clinic),
    data,
    actions: [],
  };
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

const MONTHS_UZ = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDateUz(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d}-${MONTHS_UZ[m - 1] || m} ${y}`;
}

const STATUS_UZ: Record<string, string> = {
  scheduled: "yozilgan",
  arrived: "kutmoqda",
  "in-chair": "kresloda",
  done: "tugagan",
  cancelled: "bekor qilingan",
  "no-show": "kelmagan",
};

const REASON_UZ: Record<string, string> = {
  checkup: "ko'rik",
  pain: "og'riq",
  cleaning: "tozalash",
  filling: "plomba",
  rootcanal: "kanal davolash",
  extraction: "tish olish",
  crown: "koronka",
  whitening: "oqartirish",
  consult: "maslahat",
  followup: "qayta ko'rik",
  emergency: "shoshilinch",
};

const REASON_HINTS: Array<[RegExp, string]> = [
  [/og'?ri|боль|pain/i, "pain"],
  [/tozala|чистк|clean/i, "cleaning"],
  [/plomb|пломб|fill/i, "filling"],
  [/kanal|канал|root/i, "rootcanal"],
  [/olish|удал|extract/i, "extraction"],
  [/koronka|коронк|crown|protez/i, "crown"],
  [/oqart|отбел|whiten/i, "whitening"],
  [/maslahat|консульт|consult/i, "consult"],
  [/ko'?rik|осмотр|checkup/i, "checkup"],
  [/shoshil|срочн|emergency/i, "emergency"],
];

function reasonFromText(text: string): string {
  for (const [re, code] of REASON_HINTS) if (re.test(text)) return code;
  return "consult";
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bb]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

function parseDate(text: string, today = new Date()): string | null {
  const t = norm(text);
  if (/\b(bugun|today|сегодня)\b/.test(t)) return ymd(today);
  if (/\b(ertaga|tomorrow|завтра)\b/.test(t)) return ymd(addDays(today, 1));
  if (/\b(indinga|послезавтра)\b/.test(t)) return ymd(addDays(today, 2));
  const iso = t.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
  const dm = t.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](20\d{2}))?\b/);
  if (dm) {
    const year = dm[3] ? Number(dm[3]) : today.getFullYear();
    return `${year}-${pad(Number(dm[2]))}-${pad(Number(dm[1]))}`;
  }
  return null;
}

function parseTime(text: string): string | null {
  const t = norm(text);
  const colon = t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (colon) return `${pad(Number(colon[1]))}:${colon[2]}`;
  const soat = t.match(/\bsoat\s*([01]?\d|2[0-3])(?::([0-5]\d))?\b/);
  if (soat) return `${pad(Number(soat[1]))}:${soat[2] || "00"}`;
  const da = t.match(/\b([01]?\d|2[0-3])\s*(?:da|da\b|да)/);
  if (da) return `${pad(Number(da[1]))}:00`;
  return null;
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function hhmm(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/* Work grid mirrors the app shell: 09:00–18:00, 30 min, lunch 13:00–14:00. */
const WORK_START = 540;
const WORK_END = 1080;
const WORK_STEP = 30;
const LUNCH = [780, 840];

function freeSlots(data: ClinicData, doctorId: string, date: string, todayStr: string, nowMin: number) {
  const taken = new Set(
    data.slots
      .filter((s) => s.doctorId === doctorId && s.date === date)
      .map((s) => s.time)
  );
  const out: string[] = [];
  for (let m = WORK_START; m + WORK_STEP <= WORK_END; m += WORK_STEP) {
    if (m >= LUNCH[0] && m < LUNCH[1]) continue;
    if (date === todayStr && m <= nowMin) continue;
    const t = hhmm(m);
    if (!taken.has(t)) out.push(t);
  }
  return out;
}

function matchDoctors(data: ClinicData, text: string): AssistantDoctor[] {
  const t = norm(text);
  const byName = data.doctors.filter((d) => t.includes(norm(d.name)) || t.includes(norm(d.name.replace(/^dr\.?\s*/i, ""))));
  if (byName.length) return byName;
  const SPEC: Array<[RegExp, string]> = [
    [/terapevt|therapist/i, "therapist"],
    [/jarroh|surgeon|хирург/i, "surgeon"],
    [/ortodont|orthodont/i, "orthodontist"],
    [/bolalar|pediatric/i, "pediatric"],
    [/protez|prosth/i, "prosth"],
    [/gigiyen|hygien/i, "hygienist"],
  ];
  for (const [re, spec] of SPEC) {
    if (re.test(t)) {
      const found = data.doctors.filter((d) => d.spec === spec);
      if (found.length) return found;
    }
  }
  return [];
}

function matchPatients(data: ClinicData, text: string): AssistantPatient[] {
  const t = norm(text);
  const full = data.patients.filter((p) => t.includes(norm(p.name)));
  if (full.length) return full;
  const first = data.patients.filter((p) => {
    const token = norm(p.name).split(" ")[0];
    return token.length >= 3 && new RegExp(`(^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i").test(t);
  });
  return first;
}

/* ------------------------------------------------------------------ */
/* Read tools                                                          */
/* ------------------------------------------------------------------ */

export function getDaySchedule(ctx: AssistantContext, date: string) {
  const appts = ctx.data.appointments
    .filter((a) => a.date === date && a.status !== "cancelled" && a.status !== "no-show")
    .sort((a, b) => a.time.localeCompare(b.time));
  return appts.map((a) => ({
    id: a.id,
    time: a.time,
    patient: a.patientName,
    doctor: a.doctorName,
    status: a.status,
    reason: REASON_UZ[a.reason || ""] || a.reason || "",
    source: a.source || "staff",
  }));
}

export function getStats(ctx: AssistantContext, today = new Date()) {
  const todayStr = ymd(today);
  const month = todayStr.slice(0, 7);
  const todays = ctx.data.appointments.filter(
    (a) => a.date === todayStr && a.status !== "cancelled" && a.status !== "no-show"
  );
  const byStatus: Record<string, number> = {};
  for (const a of todays) byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  const revenueToday = ctx.data.visits
    .filter((v) => v.date === todayStr)
    .reduce((sum, v) => sum + Number(v.total || 0), 0);
  const revenueMonth = ctx.data.visits
    .filter((v) => String(v.date).slice(0, 7) === month)
    .reduce((sum, v) => sum + Number(v.total || 0), 0);
  const upcoming = ctx.data.appointments
    .filter((a) => a.date > todayStr && (a.status === "scheduled" || a.status === "arrived"))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5)
    .map((a) => ({ date: a.date, time: a.time, patient: a.patientName, doctor: a.doctorName }));

  return {
    date: todayStr,
    appointments: todays.length,
    byStatus,
    patients: ctx.data.patients.length,
    doctors: ctx.data.doctors.length,
    revenueToday,
    revenueMonth,
    upcoming,
  };
}

export function searchPatients(ctx: AssistantContext, query: string) {
  const q = norm(query);
  if (!q) return [];
  const qDigits = digits(q);
  return ctx.data.patients
    .filter(
      (p) =>
        norm(p.name).includes(q) ||
        (qDigits.length >= 3 && digits(p.phone || "").includes(qDigits))
    )
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone || "",
      dob: p.dob || "",
      lastVisit: ctx.data.visits
        .filter((v) => v.patientId === p.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null,
    }));
}

export function findFreeSlots(
  ctx: AssistantContext,
  date: string,
  doctorName?: string,
  today = new Date()
) {
  if (new Date(date + "T00:00:00").getDay() === 0) {
    return { date, closed: true, doctors: [] as Array<{ doctor: string; slots: string[] }> };
  }
  const todayStr = ymd(today);
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const doctors = doctorName
    ? matchDoctors(ctx.data, doctorName)
    : ctx.data.doctors;
  const list = (doctors.length ? doctors : ctx.data.doctors).map((d) => ({
    doctor: d.name,
    slots: freeSlots(ctx.data, d.id, date, todayStr, nowMin).slice(0, 12),
  }));
  return { date, closed: false, doctors: list };
}

/* ------------------------------------------------------------------ */
/* Write tools                                                         */
/* ------------------------------------------------------------------ */

function writeGuard(ctx: AssistantContext): string | null {
  if (!ctx.writable) return "Sizda yozish huquqi yo'q (kuzatuvchi yoki tarif muddati tugagan).";
  return null;
}

async function putRecord(clinicId: string, collection: string, docId: string, data: Record<string, unknown>) {
  await prisma.record.upsert({
    where: { clinicId_collection_docId: { clinicId, collection, docId } },
    create: { clinicId, collection, docId, data: JSON.stringify(data), rev: 1 },
    update: { data: JSON.stringify(data), rev: { increment: 1 } },
  });
}

async function listRecords(clinicId: string, collection: string): Promise<Record<string, unknown>[]> {
  const rows = await prisma.record.findMany({ where: { clinicId, collection } });
  return rows.map((row): Record<string, unknown> => {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(row.data) as Record<string, unknown>;
    } catch {
      data = {};
    }
    return { id: row.docId, ...data };
  });
}

function findPatient(ctx: AssistantContext, query: string) {
  const q = norm(query);
  if (!q) return undefined;
  return (
    ctx.data.patients.find((p) => norm(p.name) === q) ||
    ctx.data.patients.find((p) => norm(p.name).includes(q)) ||
    ctx.data.patients.find((p) => digits(p.phone || "").includes(digits(query)))
  );
}

async function addPayment(ctx: AssistantContext, args: Record<string, unknown>) {
  const denied = writeGuard(ctx);
  if (denied) return { ok: false, error: denied };
  const patient = findPatient(ctx, String(args.patient || ""));
  if (!patient) return { ok: false, error: "Bemor topilmadi." };
  const amount = Math.round(Number(args.amount) || 0);
  if (amount <= 0) return { ok: false, error: "Summa noto'g'ri." };
  const method = ["cash", "card", "transfer"].includes(String(args.method)) ? String(args.method) : "cash";

  const id = "pay" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  await putRecord(ctx.clinic.id, "payments", id, {
    patientId: patient.id,
    patientName: patient.name,
    amount,
    method,
    discount: 0,
    at: Date.now(),
    by: "AI",
    receiptNo: id,
  });
  ctx.actions.push(`To'lov qabul qilindi: ${patient.name} — ${amount.toLocaleString("ru")} so'm`);
  return { ok: true, paymentId: id, amount, method };
}

async function getLowStock(ctx: AssistantContext) {
  const items = await listRecords(ctx.clinic.id, "inventory");
  const low = items
    .map((i) => ({ id: i.id, name: String(i.name ?? ""), qty: Number(i.qty) || 0, min: Number(i.minQty) || 0, unit: String(i.unit ?? "") }))
    .filter((i) => i.qty <= i.min);
  return { count: low.length, items: low.slice(0, 20) };
}

async function getPayroll(ctx: AssistantContext, period: string) {
  const rows = await listRecords(ctx.clinic.id, "payroll");
  const items = rows
    .filter((r) => r.period === period)
    .map((r) => {
      const doctor = ctx.data.doctors.find((d) => d.id === r.doctorId);
      return {
        doctorId: r.doctorId,
        doctor: doctor?.name ?? String(r.doctorId ?? ""),
        revenue: Number(r.revenue) || 0,
        total: Number(r.total) || 0,
      };
    });
  return { period, items, total: items.reduce((s, i) => s + i.total, 0) };
}

async function createLabOrder(ctx: AssistantContext, args: Record<string, unknown>, today: Date) {
  const denied = writeGuard(ctx);
  if (denied) return { ok: false, error: denied };
  const patient = findPatient(ctx, String(args.patient || ""));
  if (!patient) return { ok: false, error: "Bemor topilmadi." };
  const labs = await listRecords(ctx.clinic.id, "labs");
  const wanted = String(args.lab || "").toLowerCase();
  const lab = labs.find((l) => String(l.name ?? "").toLowerCase().includes(wanted)) || labs[0];
  const dueDays = Math.max(1, Math.min(60, Number(args.dueInDays) || 7));

  const id = "lab" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  await putRecord(ctx.clinic.id, "labOrders", id, {
    patientId: patient.id,
    patientName: patient.name,
    labId: lab?.id ?? "",
    labName: lab ? String(lab.name ?? "") : "",
    work: String(args.work || ""),
    tooth: Number(args.tooth) || null,
    sentAt: ymd(today),
    dueAt: ymd(addDays(today, dueDays)),
    stages: [
      { name: "Skan", status: "active" },
      { name: "Modellashtirish", status: "pending" },
      { name: "Ishlab chiqarish", status: "pending" },
    ],
    fee: Number(args.fee) || 0,
    feeType: "fixed",
    source: "assistant",
  });
  ctx.actions.push(`Laboratoriya buyurtmasi yaratildi: ${patient.name} — ${args.work}`);
  return { ok: true, orderId: id };
}

export async function createPatient(
  ctx: AssistantContext,
  name: string,
  phone: string,
  dob = ""
): Promise<{ ok: boolean; error?: string; patient?: AssistantPatient; existing?: boolean }> {
  const denied = writeGuard(ctx);
  if (denied) return { ok: false, error: denied };
  const cleanName = name.trim().replace(/\s+/g, " ");
  const cleanPhone = phone.trim().replace(/\s+/g, " ");
  if (cleanName.length < 2) return { ok: false, error: "Ism juda qisqa." };
  if (digits(cleanPhone).length < 7) return { ok: false, error: "Telefon raqam noto'g'ri." };

  const existing = ctx.data.patients.find(
    (p) => digits(p.phone || "") === digits(cleanPhone) || norm(p.name) === norm(cleanName)
  );
  if (existing) return { ok: true, patient: existing, existing: true };

  const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const patient: AssistantPatient = { id, name: cleanName, phone: cleanPhone, dob };
  await putRecord(ctx.clinic.id, "patients", id, {
    name: cleanName,
    phone: cleanPhone,
    dob,
    alerts: "",
    alertIds: [],
    createdAt: Date.now(),
    source: "assistant",
  });
  ctx.data.patients.push(patient);
  ctx.actions.push(`Bemor qo'shildi: ${cleanName}`);
  return { ok: true, patient };
}

export async function bookAppointment(
  ctx: AssistantContext,
  opts: {
    patientName: string;
    patientId?: string;
    doctorName?: string;
    date: string;
    time: string;
    reason?: string;
  },
  today = new Date()
): Promise<{
  ok: boolean;
  error?: string;
  appointment?: AssistantAppointment;
  alternatives?: string[];
}> {
  const denied = writeGuard(ctx);
  if (denied) return { ok: false, error: denied };

  const date = opts.date;
  const time = opts.time;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Sana noto'g'ri." };
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: "Vaqt noto'g'ri." };
  const when = new Date(`${date}T${time}:00`);
  if (Number.isNaN(when.getTime())) return { ok: false, error: "Sana yoki vaqt noto'g'ri." };
  if (when.getTime() < today.getTime() - 60_000) return { ok: false, error: "Bu vaqt allaqachon o'tgan." };
  if (when.getDay() === 0) return { ok: false, error: "Yakshanba — klinika dam olish kuni." };
  const m = minutes(time);
  if (m < WORK_START || m + 30 > WORK_END || (m >= LUNCH[0] && m < LUNCH[1])) {
    return { ok: false, error: "Ish vaqti 09:00–18:00, tushlik 13:00–14:00." };
  }

  const doctors = opts.doctorName ? matchDoctors(ctx.data, opts.doctorName) : [];
  const doctor = doctors.length === 1 ? doctors[0] : !opts.doctorName && ctx.data.doctors.length === 1 ? ctx.data.doctors[0] : null;
  if (!doctor) {
    return {
      ok: false,
      error:
        doctors.length > 1
          ? "Bir nechta shifokor mos keldi, ismni aniqroq yozing."
          : "Shifokor topilmadi. Mavjudlar: " + ctx.data.doctors.map((d) => d.name).join(", "),
    };
  }

  const patient =
    (opts.patientId ? ctx.data.patients.find((p) => p.id === opts.patientId) : null) ||
    matchPatients(ctx.data, opts.patientName)[0];
  if (!patient) {
    return { ok: false, error: `Bemor topilmadi: ${opts.patientName}. Avval "yangi bemor Ism, telefon" deng.` };
  }

  const slotKey = `${doctor.id}_${date}_${time.replace(":", "")}`;
  const conflict =
    ctx.data.slots.some((s) => s.doctorId === doctor.id && s.date === date && s.time === time) ||
    ctx.data.appointments.some(
      (a) =>
        a.doctorId === doctor.id &&
        a.date === date &&
        a.status !== "cancelled" &&
        a.status !== "no-show" &&
        m < minutes(a.time) + (Number(a.duration) || 30) &&
        minutes(a.time) < m + 30
    );
  if (conflict) {
    const free = freeSlots(ctx.data, doctor.id, date, ymd(today), today.getHours() * 60 + today.getMinutes()).slice(0, 6);
    return { ok: false, error: `${time} band. Bo'sh vaqtlar: ${free.join(", ") || "yo'q"}`, alternatives: free };
  }

  const id = "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const reason = opts.reason || "consult";
  const appointment: AssistantAppointment = {
    id,
    patientId: patient.id,
    patientName: patient.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    date,
    time,
    duration: 30,
    status: "scheduled",
    reason,
    reasonOther: "",
    source: "assistant",
  };
  await putRecord(ctx.clinic.id, "appointments", id, {
    patientId: patient.id,
    patientName: patient.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    date,
    time,
    duration: 30,
    reason,
    reasonOther: "",
    status: "scheduled",
    source: "assistant",
    createdAt: Date.now(),
  });
  await putRecord(ctx.clinic.id, "slots", slotKey, {
    ref: id,
    doctorId: doctor.id,
    date,
    time,
  });
  ctx.data.appointments.push(appointment);
  ctx.data.slots.push({ ref: id, doctorId: doctor.id, date, time });
  ctx.actions.push(`Navbat yaratildi: ${patient.name} — ${fmtDateUz(date)} ${time}`);
  return { ok: true, appointment };
}

export async function setAppointmentStatus(
  ctx: AssistantContext,
  opts: { patientName: string; date?: string; status: string },
  today = new Date()
): Promise<{ ok: boolean; error?: string; appointment?: AssistantAppointment }> {
  const denied = writeGuard(ctx);
  if (denied) return { ok: false, error: denied };
  const allowed = ["scheduled", "arrived", "in-chair", "done", "cancelled", "no-show"];
  if (!allowed.includes(opts.status)) return { ok: false, error: "Holat noto'g'ri." };

  const patients = matchPatients(ctx.data, opts.patientName);
  if (!patients.length) return { ok: false, error: `Bemor topilmadi: ${opts.patientName}` };
  const ids = new Set(patients.map((p) => p.id));
  const day = opts.date || ymd(today);
  const candidates = ctx.data.appointments
    .filter((a) => ids.has(a.patientId) && (a.date === day || (!opts.date && a.date >= day)))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const appt = candidates[0];
  if (!appt) {
    return { ok: false, error: `${patients[0].name} uchun ${fmtDateUz(day)} kuni navbat topilmadi.` };
  }
  const row = await prisma.record.findUnique({
    where: { clinicId_collection_docId: { clinicId: ctx.clinic.id, collection: "appointments", docId: appt.id } },
  });
  if (!row) return { ok: false, error: "Navbat topilmadi." };
  const data = JSON.parse(row.data) as Record<string, unknown>;
  data.status = opts.status;
  if (opts.status === "arrived") data.arrivedAt = Date.now();
  await putRecord(ctx.clinic.id, "appointments", appt.id, data);

  /* Keep the slots collection in sync, exactly like the app's syncSlots(). */
  const active = opts.status !== "cancelled" && opts.status !== "no-show";
  const doctorId = String(data.doctorId || appt.doctorId);
  const date = String(data.date || appt.date);
  const start = minutes(String(data.time || appt.time));
  const count = Math.max(1, Math.ceil((Number(data.duration) || appt.duration || 30) / 30));
  for (let i = 0; i < count; i++) {
    const cell = hhmm(start + i * 30);
    const key = `${doctorId}_${date}_${cell.replace(":", "")}`;
    const covered = ctx.data.appointments.some((other) => {
      if (other.id === appt.id || other.doctorId !== doctorId || other.date !== date) return false;
      if (other.status === "cancelled" || other.status === "no-show") return false;
      const oStart = minutes(other.time);
      const oEnd = oStart + (Number(other.duration) || 30);
      const cellStart = minutes(cell);
      return cellStart < oEnd && oStart < cellStart + 30;
    });
    if (active) {
      const existing = ctx.data.slots.some((s) => s.doctorId === doctorId && s.date === date && s.time === cell);
      if (!existing) {
        await putRecord(ctx.clinic.id, "slots", key, { ref: appt.id, doctorId, date, time: cell });
        ctx.data.slots.push({ ref: appt.id, doctorId, date, time: cell });
      }
    } else if (!covered) {
      await prisma.record.deleteMany({
        where: { clinicId: ctx.clinic.id, collection: "slots", docId: key },
      });
      ctx.data.slots = ctx.data.slots.filter((s) => !(s.doctorId === doctorId && s.date === date && s.time === cell));
    }
  }

  appt.status = opts.status;
  ctx.actions.push(`${appt.patientName}: holat → ${STATUS_UZ[opts.status] || opts.status}`);
  return { ok: true, appointment: appt };
}

/* ------------------------------------------------------------------ */
/* Local (no-LLM) engine                                               */
/* ------------------------------------------------------------------ */

export type AssistantReply = {
  reply: string;
  actions: string[];
  mode: "local" | "llm";
};

function scheduleReply(ctx: AssistantContext, date: string): string {
  const rows = getDaySchedule(ctx, date);
  if (!rows.length) return `${fmtDateUz(date)} uchun navbat yo'q.`;
  const lines = rows.map(
    (r) => `${r.time} — ${r.patient} · ${r.doctor} (${STATUS_UZ[r.status] || r.status})${r.reason ? ", " + r.reason : ""}`
  );
  return `${fmtDateUz(date)} navbatlari (${rows.length}):\n` + lines.join("\n");
}

function statsReply(ctx: AssistantContext, today = new Date()): string {
  const s = getStats(ctx, today);
  const parts = Object.entries(s.byStatus).map(([k, v]) => `${STATUS_UZ[k] || k} ${v}`);
  const money = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm";
  let out =
    `Bugun (${fmtDateUz(s.date)}): ${s.appointments} navbat` +
    (parts.length ? ` — ${parts.join(", ")}` : "") +
    `.\nBemorlar: ${s.patients}, shifokorlar: ${s.doctors}.` +
    `\nBugungi tushum: ${money(s.revenueToday)} · shu oy: ${money(s.revenueMonth)}.`;
  if (s.upcoming.length) {
    out +=
      "\nKeyingi navbatlar:\n" +
      s.upcoming.map((u) => `${fmtDateUz(u.date)} ${u.time} — ${u.patient} (${u.doctor})`).join("\n");
  }
  return out;
}

function freeReply(ctx: AssistantContext, date: string, doctorName: string | undefined, today: Date): string {
  const res = findFreeSlots(ctx, date, doctorName, today);
  if (res.closed) return `${fmtDateUz(date)} — yakshanba, klinika dam oladi.`;
  const lines = res.doctors
    .filter((d) => d.slots.length)
    .map((d) => `${d.doctor}: ${d.slots.join(", ")}`);
  if (!lines.length) return `${fmtDateUz(date)} uchun bo'sh vaqt qolmagan.`;
  return `${fmtDateUz(date)} bo'sh vaqtlar:\n` + lines.join("\n");
}

function findPatientIntent(text: string): string {
  const t = norm(text);
  return t
    .replace(/\b(qidir|top|izla|find|search|найди|поиск)\b/g, " ")
    .replace(/\b(bemor|bemorni|patient|пациент|пациента)\b/g, " ")
    .replace(/[?.!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNewPatient(text: string): { name: string; phone: string; dob: string } | null {
  const phoneMatch = text.match(/(\+?\d[\d\s()-]{6,}\d)/);
  const phone = phoneMatch ? phoneMatch[1].trim() : "";
  const dobMatch = text.match(/\b(19\d{2}|20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  const dob = dobMatch ? `${dobMatch[1]}-${pad(Number(dobMatch[2]))}-${pad(Number(dobMatch[3]))}` : "";

  let rest = text;
  if (phoneMatch) rest = rest.replace(phoneMatch[0], " ");
  if (dobMatch) rest = rest.replace(dobMatch[0], " ");

  // Keep the name intact: cut everything before the command marker instead of
  // stripping words globally (so a name like "AI Bemor" survives).
  const marker =
    rest.match(/(?:yangi\s+bemor|new patient|add patient|добав(?:ь|ить)\s+пациент[а]?)\s*[:,]?\s*(.*)/i) ||
    rest.match(/(?:bemor\w*|patient\w*|пациент\w*)\s+(?:qo'?sh\w*|add)\s*[:,]?\s*(.*)/i);
  if (marker) rest = marker[1];

  rest = rest
    .replace(/\b(ismi|ism|telefon|phone|raqami|raqam|tug'ilgan|sana)\b/gi, " ")
    .replace(/[,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!rest) return null;
  const name = rest
    .split(" ")
    .filter(Boolean)
    .slice(0, 4)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { name, phone, dob };
}

export async function localAnswer(
  ctx: AssistantContext,
  text: string,
  today = new Date()
): Promise<AssistantReply> {
  const t = norm(text);
  const before = ctx.actions.length;

  try {
    /* status update */
    const statusIntent: Array<[RegExp, string]> = [
      [/\b(keldi|kutmoqda|arrived|приш[её]л)\b/, "arrived"],
      [/\b(kreslo|kresloda|start|в кресл[ео])\b/, "in-chair"],
      [/\b(tugadi|tugat|done|заверш|законч)\b/, "done"],
      [/\b(kelmadi|no-show|не приш[её]л)\b/, "no-show"],
      [/\b(bekor|cancel|отмен)\b/, "cancelled"],
    ];
    const statusHit = statusIntent.find(([re]) => re.test(t));
    const looksLikeBooking = /(yoz|book|запиш|navbat)/.test(t);
    if (statusHit && !looksLikeBooking) {
      const patients = matchPatients(ctx.data, text);
      if (patients.length === 1) {
        const r = await setAppointmentStatus(ctx, { patientName: patients[0].name, status: statusHit[1] }, today);
        if (!r.ok) return { reply: r.error || "Bajarilmadi.", actions: ctx.actions.slice(before), mode: "local" };
        return {
          reply: `${r.appointment?.patientName} — holat "${STATUS_UZ[statusHit[1]]}" qilib belgilandi.`,
          actions: ctx.actions.slice(before),
          mode: "local",
        };
      }
    }

    /* new patient */
    if (/\b(yangi bemor|bemor\w* qo'?sh\w*|add patient|new patient|добав(ь|ить) пациент)/.test(t)) {
      const parsed = extractNewPatient(text);
      if (!parsed) {
        return {
          reply: "Format: \"yangi bemor Ism Familiya, +998 90 123 45 67\". Telefon majburiy.",
          actions: ctx.actions.slice(before),
          mode: "local",
        };
      }
      if (!parsed.phone) {
        return {
          reply: "Telefon raqamini ham yozing: \"yangi bemor " + parsed.name + ", +998 90 123 45 67\".",
          actions: ctx.actions.slice(before),
          mode: "local",
        };
      }
      const r = await createPatient(ctx, parsed.name, parsed.phone, parsed.dob);
      if (!r.ok) return { reply: r.error || "Bemor qo'shilmadi.", actions: ctx.actions.slice(before), mode: "local" };
      return {
        reply: r.existing
          ? `${r.patient?.name} allaqachon mavjud (${r.patient?.phone || "telefon yo'q"}).`
          : `${r.patient?.name} qo'shildi. Telefon: ${r.patient?.phone}.`,
        actions: ctx.actions.slice(before),
        mode: "local",
      };
    }

    /* booking */
    /* booking needs an explicit write verb, or "navbat" plus a concrete time */
    const wantsBooking =
      /\b(yozib|yoz\w*|book|запиш\w*|запись)/.test(t) ||
      (/navbat/.test(t) && !!parseTime(t));
    if (wantsBooking && !/\b(bekor|cancel|отмен)\b/.test(t)) {
      const date = parseDate(t) || ymd(today);
      const time = parseTime(t);
      const doctors = matchDoctors(ctx.data, t);
      const patients = matchPatients(ctx.data, t);
      const doctorName = doctors.length === 1 ? doctors[0].name : doctors[0]?.name;
      const patient = patients[0];
      if (!patient) {
        return {
          reply:
            "Qaysi bemor? Avval mavjud bemorni tanlang yoki \"yangi bemor Ism, telefon\" bilan qo'shing.",
          actions: ctx.actions.slice(before),
          mode: "local",
        };
      }
      if (!doctorName) {
        return {
          reply:
            "Qaysi shifokor? Mavjudlar: " + ctx.data.doctors.map((d) => d.name).join(", "),
          actions: ctx.actions.slice(before),
          mode: "local",
        };
      }
      if (!time) {
        const free = findFreeSlots(ctx, date, doctorName, today);
        const slots = free.doctors[0]?.slots.slice(0, 6).join(", ") || "bo'sh vaqt yo'q";
        return {
          reply: `Vaqtni ayting (masalan "10:30"). ${fmtDateUz(date)} bo'sh: ${slots}.`,
          actions: ctx.actions.slice(before),
          mode: "local",
        };
      }
      const r = await bookAppointment(
        ctx,
        {
          patientName: patient.name,
          patientId: patient.id,
          doctorName,
          date,
          time,
          reason: reasonFromText(text),
        },
        today
      );
      if (!r.ok) return { reply: r.error || "Navbat yaratilmadi.", actions: ctx.actions.slice(before), mode: "local" };
      return {
        reply: `Navbat yaratildi: ${patient.name} — ${fmtDateUz(date)} ${time}, ${doctorName} (${REASON_UZ[reasonFromText(text)] || "maslahat"}).`,
        actions: ctx.actions.slice(before),
        mode: "local",
      };
    }

    /* patient search */
    if (/\b(bemor\w*|patient\w*|пациент\w*|qidir\w*|top\w*|find|search|найди)/.test(t)) {
      const q = findPatientIntent(text);
      const found = searchPatients(ctx, q);
      if (found.length) {
        return {
          reply:
            "Topildi:\n" +
            found
              .map((p) => `${p.name} · ${p.phone || "telefon yo'q"}${p.lastVisit ? ` · oxirgi tashrif ${fmtDateUz(p.lastVisit)}` : ""}`)
              .join("\n"),
          actions: ctx.actions.slice(before),
          mode: "local",
        };
      }
      return {
        reply: `"${q || text}" bo'yicha bemor topilmadi. "yangi bemor" bilan qo'shishingiz mumkin.`,
        actions: ctx.actions.slice(before),
        mode: "local",
      };
    }

    /* free slots */
    if (/\b(bo'?sh|free|свобод|mavjud vaqt)\b/.test(t)) {
      const date = parseDate(t) || ymd(today);
      const doctors = matchDoctors(ctx.data, t);
      return {
        reply: freeReply(ctx, date, doctors.length === 1 ? doctors[0].name : undefined, today),
        actions: ctx.actions.slice(before),
        mode: "local",
      };
    }

    /* statistics */
    if (/\b(statistika\w*|hisobot\w*|stat|report|сводка|статистика|qancha|nechta|tushum\w*|daromad\w*|revenue)/.test(t)) {
      return { reply: statsReply(ctx, today), actions: ctx.actions.slice(before), mode: "local" };
    }

    /* inventory */
    if (/\b(ombor\w*|material\w*|qoldiq\w*|zapas\w*|stock|inventory|склад\w*|запас\w*|остат\w*)/.test(t)) {
      const low = await getLowStock(ctx);
      const lines = (low.items as Array<{ name: string; qty: number; unit: string; min: number }>).map(
        (i) => `${i.name}: ${i.qty} ${i.unit || "dona"} (min ${i.min})`
      );
      return {
        reply: low.count ? `Kam qoldiq (${low.count}):\n${lines.join("\n")}` : "Barcha materiallar yetarli.",
        actions: ctx.actions.slice(before),
        mode: "local",
      };
    }

    /* schedule */
    if (/\b(navbat\w*|qabul\w*|jadval\w*|schedule|appointment\w*|расписани\w*|при[её]м\w*)/.test(t)) {
      const date = parseDate(t) || ymd(today);
      return { reply: scheduleReply(ctx, date), actions: ctx.actions.slice(before), mode: "local" };
    }

    /* greeting */
    if (/^(salom|assalom|hello|hi|привет|здравствуй)/.test(t)) {
      return {
        reply:
          `Assalomu alaykum! Men ${ctx.clinic.name} klinikasining AI yordamchisiman.` +
          "\nQuyidagilarni qila olaman:\n• Bugungi navbatlar\n• Bo'sh vaqtlarni ko'rsatish\n• Yangi bemor qo'shish\n• Navbat yozish\n• Statistika va tushum\n\nMasalan: \"ertaga 10:30 ga Dilnoza Rasulovani Aziza Karimova qabuliga yoz\".",
        actions: [],
        mode: "local",
      };
    }

    return {
      reply:
        "Tushunmadim. Quyidagilarni sinab ko'ring:\n" +
        "• \"bugun navbatlar\"\n" +
        "• \"ertaga bo'sh vaqtlar\"\n" +
        "• \"statistika\"\n" +
        "• \"Dilnoza qidir\"\n" +
        "• \"yangi bemor Ism Familiya, +998 90 123 45 67\"\n" +
        "• \"ertaga 10:30 Dilnozani Aziza Karimova qabuliga yoz\"",
      actions: [],
      mode: "local",
    };
  } catch (err) {
    console.error("assistant local error", err);
    return { reply: "Xatolik yuz berdi. Qayta urinib ko'ring.", actions: ctx.actions.slice(before), mode: "local" };
  }
}

/* ------------------------------------------------------------------ */
/* Optional LLM (OpenAI-compatible)                                    */
/* ------------------------------------------------------------------ */

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_day_schedule",
      description: "Get the appointment schedule for one date (YYYY-MM-DD).",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "YYYY-MM-DD" } },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stats",
      description: "Clinic KPIs: today's appointments by status, patient and doctor counts, today's and this month's revenue.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "search_patients",
      description: "Search patients by name or phone.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_free_slots",
      description: "Find free 30-minute slots on a date, optionally for one doctor.",
      parameters: {
        type: "object",
        properties: { date: { type: "string" }, doctor: { type: "string" } },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_patient",
      description: "Create a patient. Requires name and phone. Fails if a patient with the same phone or name exists.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" }, phone: { type: "string" }, dob: { type: "string" } },
        required: ["name", "phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Book a 30-minute appointment for an existing patient. Use find_free_slots first if unsure.",
      parameters: {
        type: "object",
        properties: {
          patient: { type: "string" },
          doctor: { type: "string" },
          date: { type: "string" },
          time: { type: "string" },
          reason: {
            type: "string",
            enum: Object.keys(REASON_UZ),
          },
        },
        required: ["patient", "doctor", "date", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_appointment_status",
      description: "Update the status of a patient's next appointment.",
      parameters: {
        type: "object",
        properties: {
          patient: { type: "string" },
          date: { type: "string" },
          status: {
            type: "string",
            enum: ["scheduled", "arrived", "in-chair", "done", "cancelled", "no-show"],
          },
        },
        required: ["patient", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_payment",
      description: "Record a payment received from a patient (cash or card).",
      parameters: {
        type: "object",
        properties: {
          patient: { type: "string" },
          amount: { type: "number", description: "Amount in so'm" },
          method: { type: "string", enum: ["cash", "card", "transfer"] },
        },
        required: ["patient", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_low_stock",
      description: "List inventory materials at or below their minimum quantity.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_payroll",
      description: "Payroll totals per doctor for a month (YYYY-MM).",
      parameters: {
        type: "object",
        properties: { period: { type: "string", description: "YYYY-MM" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lab_order",
      description: "Send a prosthetics work order to a laboratory for a patient.",
      parameters: {
        type: "object",
        properties: {
          patient: { type: "string" },
          lab: { type: "string" },
          work: { type: "string" },
          tooth: { type: "number" },
          dueInDays: { type: "number" },
          fee: { type: "number" },
        },
        required: ["patient", "work"],
      },
    },
  },
] as const;

async function runTool(ctx: AssistantContext, name: string, args: Record<string, unknown>, today: Date) {
  switch (name) {
    case "get_day_schedule":
      return getDaySchedule(ctx, String(args.date || ymd(today)));
    case "get_stats":
      return getStats(ctx, today);
    case "search_patients":
      return searchPatients(ctx, String(args.query || ""));
    case "find_free_slots":
      return findFreeSlots(ctx, String(args.date || ymd(today)), args.doctor ? String(args.doctor) : undefined, today);
    case "create_patient":
      return createPatient(ctx, String(args.name || ""), String(args.phone || ""), String(args.dob || ""));
    case "book_appointment":
      return bookAppointment(
        ctx,
        {
          patientName: String(args.patient || ""),
          doctorName: args.doctor ? String(args.doctor) : undefined,
          date: String(args.date || ""),
          time: String(args.time || ""),
          reason: args.reason ? String(args.reason) : "consult",
        },
        today
      );
    case "set_appointment_status":
      return setAppointmentStatus(
        ctx,
        { patientName: String(args.patient || ""), date: args.date ? String(args.date) : undefined, status: String(args.status || "") },
        today
      );
    case "add_payment":
      return addPayment(ctx, args);
    case "get_low_stock":
      return getLowStock(ctx);
    case "get_payroll":
      return getPayroll(ctx, String(args.period || ymd(today).slice(0, 7)));
    case "create_lab_order":
      return createLabOrder(ctx, args, today);
    default:
      return { error: "unknown_tool" };
  }
}

function llmConfigured(): boolean {
  return !!process.env.AI_API_KEY;
}

export async function assistantAnswer(
  ctx: AssistantContext,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  today = new Date()
): Promise<AssistantReply> {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return { reply: "Savolingizni yozing.", actions: [], mode: "local" };

  if (llmConfigured()) {
    const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = process.env.AI_MODEL || "gpt-4o-mini";
    const system =
      `You are the in-app AI assistant of "Dental Desk", a dental clinic SaaS. Clinic: ${ctx.clinic.name}. ` +
      `Today is ${ymd(today)} (${today.toLocaleDateString("en-GB", { weekday: "long" })}). ` +
      `Doctors: ${ctx.data.doctors.map((d) => d.name).join(", ") || "none"}. ` +
      `Working hours 09:00–18:00, lunch 13:00–14:00, closed Sunday. ` +
      `The user ${ctx.writable ? "CAN" : "CANNOT"} write data. Use tools to read or change the clinic database; never invent patient data. ` +
      `Reply in the user's language (Uzbek by default), concisely, plain text without markdown tables. ` +
      `Dates are YYYY-MM-DD; times are HH:MM (24h). After a successful write, confirm exactly what changed.`;

    const chat: Array<Record<string, unknown>> = [
      { role: "system", content: system },
      ...messages.slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })),
    ];

    try {
      for (let step = 0; step < 4; step++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 25_000);
        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
          body: JSON.stringify({ model, messages: chat, tools: TOOLS, tool_choice: "auto", temperature: 0.2 }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (!res.ok) throw new Error(`llm ${res.status}`);
        const data = (await res.json()) as {
          choices?: Array<{
            message?: {
              content?: string | null;
              tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
            };
          }>;
        };
        const msg = data.choices?.[0]?.message;
        if (!msg) throw new Error("llm_empty");

        if (msg.tool_calls?.length) {
          chat.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });
          for (const call of msg.tool_calls) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
            } catch {
              args = {};
            }
            const result = await runTool(ctx, call.function.name, args, today);
            chat.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result).slice(0, 4000),
            });
          }
          continue;
        }

        return {
          reply: (msg.content || "").trim() || "Bajarildi.",
          actions: ctx.actions,
          mode: "llm",
        };
      }
      return {
        reply: "So'rov juda murakkab bo'ldi. Iltimos, aniqroq yozing.",
        actions: ctx.actions,
        mode: "llm",
      };
    } catch (err) {
      console.error("assistant llm error", err);
      const local = await localAnswer(ctx, last.content, today);
      return {
        ...local,
        reply: local.reply + "\n\n(AI xizmatiga ulanmadi — lokal javob.)",
      };
    }
  }

  return localAnswer(ctx, last.content, today);
}

export function assistantMode(): "llm" | "local" {
  return llmConfigured() ? "llm" : "local";
}