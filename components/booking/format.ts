export const DAY_SHORT = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
export const MONTH_SHORT = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyn",
  "iyl",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
];

export function parseYmd(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isClosedDay(date: string): boolean {
  return parseYmd(date).getDay() === 0;
}

export function formatDay(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || "";
  const d = parseYmd(date);
  return `${DAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.min(60, Math.floor(seconds)));
  return `0:${String(s).padStart(2, "0")}`;
}

export function money(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function digits(value: string): string {
  return value.replace(/\D+/g, "");
}
