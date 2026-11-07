export type PatientClinicInfo = {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  mapUrl: string;
};

export type PatientMe = {
  recordId: string;
  name: string;
  phone: string;
  dob: string;
  alerts: string;
  alertIds: string[];
};

export type ToothEntry = {
  date: string;
  proc: string;
  surfaces: string[];
  note: string;
  canal: string;
};

export type VisitProcedure = {
  type: string;
  tooth: number | null;
  surfaces: string[];
  price: number;
  note: string;
};

export type PatientVisit = {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  reason: string;
  reasonOther: string;
  procedures: VisitProcedure[];
  notes: string;
  total: number;
};

export type PatientAppointment = {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  reason: string;
  reasonOther: string;
  status: string;
};

export type PatientComplaint = {
  id: string;
  tooth: number | null;
  visitId: string;
  text: string;
  authorName: string;
  at: string;
  hasAudio: boolean;
  audioData: string;
};

export type ClinicRequest = {
  id: string;
  doctorName: string;
  date: string;
  time: string;
  status: string;
  clinicName: string;
  address?: string;
  mapUrl?: string;
};

export type ClinicBlock = {
  clinic: PatientClinicInfo;
  me: PatientMe;
  teeth: Record<string, ToothEntry[]>;
  visits: PatientVisit[];
  appointments: PatientAppointment[];
  complaints: PatientComplaint[];
  requests: ClinicRequest[];
};

export type PatientBooking = {
  id: string;
  kind: "doctor" | "clinic";
  code: string;
  status: string;
  doctorId?: string;
  doctorName: string;
  date: string;
  time: string;
  clinicName: string;
  address?: string;
  mapUrl?: string;
  reviewed?: boolean;
  reviewRating?: number;
};

export type PatientHistory = {
  patient: { name: string; phone: string };
  clinics: ClinicBlock[];
  bookings: PatientBooking[];
};
