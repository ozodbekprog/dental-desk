import type { ToothEntry } from "./types";

/** FDI codes in display order: upper 18–11, 21–28 then lower 48–41, 31–38. */
export const FDI_UPPER: string[] = [
  "18", "17", "16", "15", "14", "13", "12", "11",
  "21", "22", "23", "24", "25", "26", "27", "28",
];

export const FDI_LOWER: string[] = [
  "48", "47", "46", "45", "44", "43", "42", "41",
  "31", "32", "33", "34", "35", "36", "37", "38",
];

const POSITION_NAMES = [
  "markaziy kesuvchi",
  "yon kesuvchi",
  "qoziq",
  "birinchi premolyar",
  "ikkinchi premolyar",
  "birinchi molar",
  "ikkinchi molar",
  "aql tishi",
];

const QUADRANTS: Record<string, string> = {
  "1": "Yuqori o'ng",
  "2": "Yuqori chap",
  "3": "Pastki chap",
  "4": "Pastki o'ng",
};

export function toothName(fdi: string): string {
  if (!/^\d{2}$/.test(fdi)) return `Tish ${fdi}`;
  const quadrant = QUADRANTS[fdi[0]] || "";
  const name = POSITION_NAMES[Number(fdi[1]) - 1] || "";
  return `${quadrant} ${name}`.trim();
}

export function isUpperTooth(fdi: string): boolean {
  return fdi.startsWith("1") || fdi.startsWith("2");
}

/** Uzbek procedure labels, mirroring the clinic app catalogue. */
export const PROC_LABELS: Record<string, string> = {
  exam: "Ko'rik",
  xray: "Rentgen",
  cleaning: "Tish toshini olish",
  caries: "Karies aniqlandi",
  filling: "Plomba",
  endo: "Ildiz kanali davolash",
  crown: "Koronka",
  implant: "Implant",
  extraction: "Tishni olish",
  sealant: "Fissura germetigi",
  whitening: "Tishni oqartirish",
  gum: "Milk davolash",
  other: "Boshqa",
  rootcanal: "Ildiz kanali davolash",
  checkup: "Ko'rik",
  consult: "Maslahat",
  followup: "Nazorat ko'rigi",
  emergency: "Shoshilinch yordam",
};

export function procLabel(proc: string): string {
  if (!proc) return "Muolaja";
  return PROC_LABELS[proc] || proc;
}

export const SURFACE_LABELS: Record<string, string> = {
  O: "Chaynash yuzasi",
  M: "Medial",
  D: "Distal",
  B: "Tashqi (yonoq)",
  L: "Ichki (til)",
};

export function surfaceLabels(surfaces: string[]): string {
  return surfaces.map((s) => SURFACE_LABELS[s] || s).join(", ");
}

export const ALERT_LABELS: Record<string, string> = {
  hypertension: "Yuqori qon bosimi",
  diabetes: "Qandli diabet",
  heart: "Yurak kasalligi",
  anticoag: "Qon suyultiruvchi dorilar",
  allergy: "Allergiya",
  pregnancy: "Homiladorlik",
  asthma: "Astma",
  hepatitis: "Gepatit",
};

export type ToothMark = "healthy" | "treated" | "complaint" | "alert";

export function toothMark(
  fdi: string,
  teeth: Record<string, ToothEntry[]>,
  complaints: Record<string, number>
): ToothMark {
  const complaintsCount = complaints[fdi] || 0;
  if (complaintsCount > 1) return "alert";
  if (complaintsCount === 1) return "complaint";
  if ((teeth[fdi] || []).length > 0) return "treated";
  return "healthy";
}

const MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

/** Accepts YYYY-MM-DD or ISO; returns a short readable Uzbek date. */
export function formatDate(value: string): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, y, m, d] = match;
    return `${Number(d)} ${MONTHS[Number(m) - 1] || ""} ${y}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${parsed.getDate()} ${MONTHS[parsed.getMonth()] || ""} ${parsed.getFullYear()}`;
}

export function formatShortDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value || "—";
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export function money(value: number): string {
  if (!value) return "Kelishilgan";
  return `${value.toLocaleString("ru-RU").replace(/,/g, " ")} so'm`;
}

export function todayYmd(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

/** 998901234567 -> +998 90 123 45 67 */
export function formatPhone(digits: string): string {
  if (digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return digits;
}

export const BOOKING_STATUS: Record<string, { label: string; tone: string }> = {
  requested: { label: "Kutilmoqda", tone: "warn" },
  contacted: { label: "Bog'lanildi", tone: "accent" },
  confirmed: { label: "Tasdiqlangan", tone: "ok" },
  declined: { label: "Rad etilgan", tone: "danger" },
  cancelled: { label: "Bekor qilingan", tone: "muted" },
  completed: { label: "O'tkazilgan", tone: "ok" },
  scheduled: { label: "Rejalashtirilgan", tone: "accent" },
  arrived: { label: "Keldi", tone: "ok" },
  "in-chair": { label: "Qabulda", tone: "accent" },
  done: { label: "Yakunlangan", tone: "ok" },
  "no-show": { label: "Kelmadi", tone: "danger" },
};

export function statusMeta(status: string): { label: string; tone: string } {
  return BOOKING_STATUS[status] || { label: status || "—", tone: "muted" };
}
