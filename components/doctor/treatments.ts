/**
 * Selection catalog for the independent doctor portal.
 * Pure data: shared by client components and server validation.
 */

export type ProcedureDef = {
  key: string;
  label: string;
  color: string;
  needsTooth: boolean;
  surfaces?: boolean;
  priority: number;
};

export const PROCEDURES: ProcedureDef[] = [
  { key: "caries", label: "Karies aniqlandi", color: "#b45309", needsTooth: true, surfaces: true, priority: 50 },
  { key: "filling", label: "Plomba", color: "#0c6a72", needsTooth: true, surfaces: true, priority: 60 },
  { key: "endo", label: "Kanal davolash", color: "#7c3aed", needsTooth: true, priority: 70 },
  { key: "crown", label: "Koronka", color: "#b58a2b", needsTooth: true, priority: 80 },
  { key: "implant", label: "Implant", color: "#2563eb", needsTooth: true, priority: 90 },
  { key: "extraction", label: "Tish olish", color: "#c3302a", needsTooth: true, priority: 100 },
  { key: "sealant", label: "Fissura germetigi", color: "#1c7549", needsTooth: true, surfaces: true, priority: 40 },
  { key: "exam", label: "Ko'rik", color: "#64748b", needsTooth: false, priority: 10 },
  { key: "xray", label: "Rentgen", color: "#475569", needsTooth: false, priority: 11 },
  { key: "cleaning", label: "Tish toshini olish", color: "#0e7490", needsTooth: false, priority: 12 },
  { key: "whitening", label: "Oqartirish", color: "#0ea5e9", needsTooth: false, priority: 13 },
  { key: "gum", label: "Milk davolash", color: "#db2777", needsTooth: false, priority: 14 },
  { key: "other", label: "Boshqa muolaja", color: "#587076", needsTooth: false, priority: 15 },
];

export const PROCEDURE_MAP: Record<string, ProcedureDef> = Object.fromEntries(
  PROCEDURES.map((item) => [item.key, item])
);

export const TOOTH_PROCEDURES = PROCEDURES.filter((item) => item.needsTooth);
export const GENERAL_PROCEDURES = PROCEDURES.filter((item) => !item.needsTooth);

/** Highest-priority colour wins when one tooth has several procedures. */
export function toothTone(procedures: string[]): string {
  let best: ProcedureDef | null = null;
  for (const key of procedures) {
    const def = PROCEDURE_MAP[key];
    if (!def || !def.needsTooth) continue;
    if (!best || def.priority > best.priority) best = def;
  }
  return best?.color || "";
}

export function procedureLabel(key: string): string {
  return PROCEDURE_MAP[key]?.label || key;
}

export const SURFACES: { key: string; label: string }[] = [
  { key: "O", label: "Tepa" },
  { key: "M", label: "Old" },
  { key: "D", label: "Orqa" },
  { key: "B", label: "Tashqi" },
  { key: "L", label: "Ichki" },
];

export const QUICK_NOTES = [
  "Og'riq yo'q",
  "Gigiyena tavsiya qilindi",
  "2 soat ovqat yemaslik",
  "Og'riq qoldiruvchi tavsiya qilindi",
  "Retsept yozildi",
  "Nazoratga chaqirildi",
  "Keyingi qabul belgilandi",
];

export const ARCH_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const ARCH_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const QUADRANTS: { key: string; label: string; short: string; teeth: number[] }[] = [
  { key: "1", label: "Yuqori o'ng", short: "Yuqori o'ng", teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
  { key: "2", label: "Yuqori chap", short: "Yuqori chap", teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
  { key: "3", label: "Pastki chap", short: "Pastki chap", teeth: [31, 32, 33, 34, 35, 36, 37, 38] },
  { key: "4", label: "Pastki o'ng", short: "Pastki o'ng", teeth: [48, 47, 46, 45, 44, 43, 42, 41] },
];

const TOOTH_KIND: Record<number, string> = {
  1: "keskich",
  2: "keskich",
  3: "qoziq",
  4: "kichik oziq",
  5: "kichik oziq",
  6: "katta oziq",
  7: "katta oziq",
  8: "donolik",
};

export function toothLabel(fdi: number): string {
  if (!fdi) return "Umumiy muolaja";
  const kind = TOOTH_KIND[fdi % 10];
  return kind ? `${fdi}-tish · ${kind}` : `${fdi}-tish`;
}

/** Address presets keep the profile form selectable instead of typed. */
export const ADDRESS_PRESETS = [
  "Toshkent, Yunusobod tumani",
  "Toshkent, Chilonzor tumani",
  "Toshkent, Yakkasaroy tumani",
  "Toshkent, Mirzo Ulug'bek tumani",
  "Toshkent, Shayxontohur tumani",
  "Toshkent, Olmazor tumani",
  "Toshkent, Sergeli tumani",
  "Toshkent, Uchtepa tumani",
  "Toshkent, Yashnobod tumani",
  "Toshkent, Mirobod tumani",
  "Toshkent, Bektemir tumani",
  "Samarqand",
  "Buxoro",
  "Namangan",
  "Andijon",
  "Farg'ona",
];

export const PRICE_PRESETS = [0, 50_000, 100_000, 150_000, 200_000, 250_000, 300_000, 400_000];
