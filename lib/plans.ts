// Doctor seats per plan. Trial gets the Clinic feature set during the 14-day trial.
const DOCTOR_SEATS: Record<string, number> = {
  trial: 5,
  start: 1,
  clinic: 5,
  network: Number.POSITIVE_INFINITY,
};

export function doctorSeatLimit(plan: string): number {
  return DOCTOR_SEATS[plan] ?? 5;
}

/** Hard caps on stored patient records; Infinity when the plan is unlimited. */
const PATIENT_CAPS: Record<string, number> = {
  trial: 50,
  start: 300,
  clinic: 3000,
  network: Number.POSITIVE_INFINITY,
};

export function patientCap(plan: string): number {
  return PATIENT_CAPS[plan] ?? 3000;
}

/** Which clinical collection holds what: used by documents and exams. */
export const PLAN_LABELS: Record<string, string> = {
  trial: "Sinov",
  start: "Start",
  clinic: "Klinika",
  network: "Tarmoq",
};

/** v2 module availability per plan. Start is a single-chair cabinet. */
export const PLAN_MODULES: Record<string, readonly string[]> = {
  trial: ["lab", "inventory", "marketing", "analytics", "documents", "chairs", "shifts", "waitlist"],
  start: ["lab", "analytics", "documents", "chairs", "waitlist"],
  clinic: [
    "lab",
    "inventory",
    "marketing",
    "analytics",
    "documents",
    "chairs",
    "shifts",
    "payroll",
    "plans",
    "toothHistory",
    "waitlist",
  ],
  network: [
    "lab",
    "inventory",
    "marketing",
    "analytics",
    "documents",
    "chairs",
    "shifts",
    "payroll",
    "plans",
    "toothHistory",
    "branches",
    "waitlist",
  ],
};

/** Collections gated behind a plan module; everything else is always available. */
export const COLLECTION_MODULES: Record<string, string> = {
  inventory: "inventory",
  materialUse: "inventory",
  suppliers: "inventory",
  purchases: "inventory",
  campaigns: "marketing",
  outbox: "marketing",
  payroll: "payroll",
  plans: "plans",
  toothHistory: "toothHistory",
  labOrders: "lab",
  labs: "lab",
  documents: "documents",
  chairs: "chairs",
  shifts: "shifts",
  branches: "branches",
};

export function planHasModule(plan: string, module: string): boolean {
  const list = PLAN_MODULES[plan];
  if (!list) return true;
  return list.includes(module);
}

export function collectionAllowed(plan: string, collection: string): boolean {
  const mod = COLLECTION_MODULES[collection];
  if (!mod) return true;
  return planHasModule(plan, mod);
}
