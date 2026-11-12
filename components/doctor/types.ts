/**
 * Shared shapes for the independent doctor portal.
 * Kept free of server imports so the client dashboard can use them too.
 */

export type DoctorProfileDTO = {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialty: string;
  specialtyLabel: string;
  bio: string;
  address: string;
  mapUrl: string;
  priceFrom: number;
  status: string;
  contract: string;
  experience: number;
  rating: number;
  ratingCount: number;
};

export type DoctorBookingDTO = {
  id: string;
  code: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  duration: number;
  reason: string;
  reasonKind: string;
  audioData: string;
  status: string;
  address: string;
  mapUrl: string;
  doctorNote: string;
  clinicName: string;
  createdAt: string;
  confirmedAt: string | null;
};

export type TreatmentDTO = {
  id: string;
  visitId: string;
  bookingId: string | null;
  patientName: string;
  patientPhone: string;
  date: string;
  tooth: number;
  procedure: string;
  surfaces: string;
  note: string;
  createdAt: string;
};

export type TreatmentDraftItem = {
  tooth: number;
  procedure: string;
  surfaces: string;
};

export type DoctorCounts = {
  requested: number;
  confirmed: number;
  declined: number;
  total: number;
};

export type DoctorMe = {
  profile: DoctorProfileDTO | null;
  counts: DoctorCounts;
};

export const SPECIALTY_LABELS: Record<string, string> = {
  therapist: "Terapevt",
  surgeon: "Jarroh",
  orthodontist: "Ortodont",
  hygienist: "Gigienist",
  pediatric: "Bolalar stomatologi",
};

export function emptyCounts(): DoctorCounts {
  return { requested: 0, confirmed: 0, declined: 0, total: 0 };
}
