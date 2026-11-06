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
  // v2 clinic structure
  "chairs",
  "branches",
  "waitlist",
  // v2 clinical
  "toothHistory",
  "diagnoses",
  "plans",
  "labOrders",
  "labs",
  "templates",
  "documents",
  // v2 communication & marketing
  "campaigns",
  "messages",
  "msgTemplates",
  "outbox",
  // v2 back office
  "inventory",
  "materialUse",
  "suppliers",
  "purchases",
  "payments",
  "payroll",
  "shifts",
  // v2 platform
  "audit",
  "files",
  "fileData",
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

/** Readable by staff but hidden from the call-centre role (clinical, financial, HR). */
export const CLINICAL_COLLECTIONS: readonly string[] = [
  "visits",
  "history",
  "toothHistory",
  "plans",
  "labOrders",
  "documents",
  "payments",
  "payroll",
  "materialUse",
  "audit",
  "fileData",
];

/** Collections that are never writable by the call-centre role either. */
export const CALL_CENTER_HIDDEN: readonly string[] = [
  ...CLINICAL_COLLECTIONS,
  "inventory",
  "purchases",
  "suppliers",
  "campaigns",
];

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
