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

/** 50000 -> "50 000" (deterministic on server and client). */
export function formatNumber(value: number): string {
  const rounded = Math.round(Number(value) || 0);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatPrice(value: number): string {
  return value > 0 ? `${formatNumber(value)} so'mdan` : "Kelishiladi";
}

export function experienceText(years: number): string {
  return years > 0 ? `${years} yil tajriba` : "Tajriba ko'rsatilmagan";
}

export function initials(name: string): string {
  const clean = String(name || "")
    .replace(/^(dr\.?|shifokor)\s+/i, "")
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function formatReviewDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS_UZ[date.getMonth()]} ${date.getFullYear()}`;
}

export function reviewCountText(count: number): string {
  return `${count} sharh`;
}

export function telHref(phone: string): string {
  return `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
}
