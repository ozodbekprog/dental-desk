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

export const PLAN_LABELS: Record<string, string> = {
  trial: "Sinov",
  start: "Start",
  clinic: "Klinika",
  network: "Tarmoq",
};
