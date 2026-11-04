export const COLLECTIONS = [
  "doctors",
  "patients",
  "appointments",
  "visits",
  "slots",
  "requests",
  "reqstate",
  "links",
  "history",
  "prices",
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

export function isCollection(name: string): name is CollectionName {
  return (COLLECTIONS as readonly string[]).includes(name);
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "clinic";
}
