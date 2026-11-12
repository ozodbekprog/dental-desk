import { createPrismaClient } from "../lib/prisma-client";

/**
 * Demo bookings for the independent network doctor so the dashboard,
 * charts and request/confirm flows can be tested with realistic data.
 * Idempotent: only rows with code prefix DM- are replaced.
 */

const prisma = createPrismaClient();
const PROFILE_ID = "net-independent-demo";
const CODE_PREFIX = "DM-";

const NAMES = [
  "Dilnoza Rasulova",
  "Jasur Ahmedov",
  "Nigora Umarova",
  "Kamila Yuldasheva",
  "Shahzoda Mirzaeva",
  "Otabek Rahimov",
  "Gulnora Sattorova",
  "Aziz Karimov",
  "Madina Tosheva",
  "Bekzod Nazarov",
  "Malika Ergasheva",
  "Sardor Qodirov",
  "Umida Xolmatova",
  "Farrux Ismoilov",
  "Zilola Abdullayeva",
  "Temur Saidov",
  "Sevara Aliyeva",
  "Rustam Yoqubov",
];

const PHONES = [
  "+998 90 123 45 67",
  "+998 91 234 56 78",
  "+998 93 345 67 89",
  "+998 94 456 78 90",
  "+998 97 567 89 01",
  "+998 99 678 90 12",
  "+998 90 789 01 23",
  "+998 91 890 12 34",
  "+998 93 901 23 45",
  "+998 94 012 34 56",
];

const REASONS = [
  "Tish og'rig'i, kechasi uxlatmadi",
  "Profilaktik tozalash",
  "Plomba tushib qoldi",
  "Konsultatsiya va rentgen",
  "Tish oqartirish maslahati",
  "Kanal davolashni tekshirish",
  "Protez maslahati",
  "Bolaning tishini ko'rsatish",
  "Milklar qonayapti",
  "Tishni sug'urib olish bo'yicha maslahat",
];

const TIMES = ["09:00", "09:30", "10:00", "11:00", "11:30", "14:00", "14:30", "15:00", "16:00", "16:30", "17:00"];

type SeedInput = {
  code: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  duration: number;
  reason: string;
  status: string;
  createdAt: Date;
  confirmedAt: Date | null;
  doctorNote: string;
  address: string;
  mapUrl: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayAt(offset: number, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h, m, 0, 0);
}

function daysBefore(d: Date, days: number, hour = 11): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - days, hour, 0, 0, 0);
}

function nameAt(i: number): string {
  return NAMES[i % NAMES.length];
}

function phoneAt(i: number): string {
  return PHONES[i % PHONES.length];
}

function reasonAt(i: number): string {
  return REASONS[i % REASONS.length];
}

async function main() {
  const profile = await prisma.doctorProfile.findUnique({ where: { id: PROFILE_ID } });
  if (!profile) throw new Error(`Doctor profile ${PROFILE_ID} not found`);

  const removed = await prisma.networkBooking.deleteMany({
    where: { doctorId: profile.id, code: { startsWith: CODE_PREFIX } },
  });

  const address = profile.address;
  const mapUrl = profile.mapUrl;
  const rows: SeedInput[] = [];
  let serial = 1000;

  const push = (
    input: Omit<SeedInput, "code" | "address" | "mapUrl"> & { address?: string; mapUrl?: string }
  ) => {
    serial += 1;
    rows.push({
      ...input,
      code: `${CODE_PREFIX}${serial}`,
      address: input.address ?? "",
      mapUrl: input.mapUrl ?? "",
    });
  };

  // Completed visits across the last three weeks.
  for (let i = 0; i < 14; i++) {
    const offset = -(1 + i * 2);
    const time = TIMES[(i * 3) % TIMES.length];
    const appointment = dayAt(offset, time);
    const createdAt = daysBefore(appointment, 3 + (i % 4), 9 + (i % 6));
    push({
      name: nameAt(i),
      phone: phoneAt(i),
      date: ymd(appointment),
      time,
      duration: i % 3 === 0 ? 60 : i % 3 === 1 ? 45 : 30,
      reason: reasonAt(i),
      status: "completed",
      createdAt,
      confirmedAt: new Date(createdAt.getTime() + 2 * 3600_000),
      doctorNote: "",
      address,
      mapUrl,
    });
  }

  // Cancelled by the patient.
  for (let i = 0; i < 2; i++) {
    const appointment = dayAt(-(4 + i * 7), ["13:00", "10:30"][i]);
    const createdAt = daysBefore(appointment, 2, 15);
    push({
      name: nameAt(14 + i),
      phone: phoneAt(4 + i),
      date: ymd(appointment),
      time: ["13:00", "10:30"][i],
      duration: 30,
      reason: reasonAt(5 + i),
      status: "cancelled",
      createdAt,
      confirmedAt: null,
      doctorNote: "Bemor o'zi bekor qildi",
      address: "",
      mapUrl: "",
    });
  }

  // Declined by the doctor.
  for (let i = 0; i < 3; i++) {
    const appointment = dayAt([-3, -1, 2][i], ["12:00", "15:30", "09:30"][i]);
    const createdAt = new Date(Date.now() - (14 + i * 9) * 3600_000);
    push({
      name: nameAt(8 + i),
      phone: phoneAt(7 + i),
      date: ymd(appointment),
      time: ["12:00", "15:30", "09:30"][i],
      duration: 30,
      reason: reasonAt(2 + i),
      status: "declined",
      createdAt,
      confirmedAt: null,
      doctorNote: "Bu vaqt band, boshqa vaqtni taklif qildim",
      address: "",
      mapUrl: "",
    });
  }

  // Confirmed upcoming schedule, including two visits today.
  const confirmedPlan = [
    { offset: 0, time: "15:00", duration: 30 },
    { offset: 0, time: "17:30", duration: 45 },
    { offset: 1, time: "10:00", duration: 45 },
    { offset: 2, time: "09:30", duration: 30 },
    { offset: 2, time: "14:30", duration: 60 },
    { offset: 3, time: "11:00", duration: 30 },
    { offset: 5, time: "16:00", duration: 45 },
    { offset: 7, time: "10:00", duration: 30 },
    { offset: 9, time: "12:30", duration: 60 },
  ];
  confirmedPlan.forEach((plan, i) => {
    const appointment = dayAt(plan.offset, plan.time);
    const createdAt = new Date(Date.now() - (22 + i * 11) * 3600_000);
    push({
      name: nameAt(3 + i),
      phone: phoneAt(2 + i),
      date: ymd(appointment),
      time: plan.time,
      duration: plan.duration,
      reason: reasonAt(i + 1),
      status: "confirmed",
      createdAt,
      confirmedAt: new Date(createdAt.getTime() + 90 * 60_000),
      doctorNote: i === 0 ? "Qabuldan 10 daqiqa oldin keling" : "",
      address,
      mapUrl,
    });
  });

  // Fresh requests waiting for a decision.
  const requestedPlan = [
    { offset: 1, time: "12:00", duration: 30 },
    { offset: 2, time: "16:30", duration: 45 },
    { offset: 3, time: "09:00", duration: 30 },
    { offset: 4, time: "15:00", duration: 60 },
  ];
  requestedPlan.forEach((plan, i) => {
    const appointment = dayAt(plan.offset, plan.time);
    const createdAt = new Date(Date.now() - (2 + i * 9) * 3600_000);
    push({
      name: nameAt(10 + i),
      phone: phoneAt(5 + i),
      date: ymd(appointment),
      time: plan.time,
      duration: plan.duration,
      reason: reasonAt(i + 4),
      status: "requested",
      createdAt,
      confirmedAt: null,
      doctorNote: "",
      address: "",
      mapUrl: "",
    });
  });

  await prisma.networkBooking.createMany({
    data: rows.map((row) => ({ ...row, doctorId: profile.id })),
  });

  // Treatments behind the completed visits so the 3D tooth map has history.
  const TREATMENT_PLAN: { tooth: number; procedure: string; surfaces?: string }[][] = [
    [{ tooth: 16, procedure: "filling", surfaces: "O" }, { tooth: 26, procedure: "caries" }],
    [{ tooth: 36, procedure: "filling", surfaces: "OM" }, { tooth: 37, procedure: "extraction" }],
    [{ tooth: 0, procedure: "cleaning" }, { tooth: 11, procedure: "sealant", surfaces: "O" }],
    [{ tooth: 46, procedure: "crown" }, { tooth: 0, procedure: "xray" }],
    [{ tooth: 24, procedure: "endo" }, { tooth: 24, procedure: "crown" }],
    [{ tooth: 14, procedure: "caries" }],
    [{ tooth: 31, procedure: "filling" }],
    [{ tooth: 0, procedure: "exam" }, { tooth: 18, procedure: "extraction" }],
    [{ tooth: 21, procedure: "filling", surfaces: "O" }, { tooth: 22, procedure: "filling", surfaces: "O" }],
    [{ tooth: 38, procedure: "implant" }],
    [{ tooth: 33, procedure: "endo" }, { tooth: 0, procedure: "xray" }],
    [{ tooth: 44, procedure: "filling" }],
    [{ tooth: 0, procedure: "whitening" }, { tooth: 15, procedure: "filling" }],
    [{ tooth: 47, procedure: "extraction" }, { tooth: 0, procedure: "gum" }],
  ];

  const completedBookings = await prisma.networkBooking.findMany({
    where: { doctorId: profile.id, code: { startsWith: CODE_PREFIX }, status: "completed" },
    orderBy: { date: "asc" },
    select: { id: true, name: true, phone: true, date: true },
  });

  await prisma.treatmentRecord.deleteMany({
    where: { doctorId: profile.id, visitId: { startsWith: "seed-" } },
  });

  const treatmentRows = completedBookings
    .slice(0, TREATMENT_PLAN.length)
    .flatMap((booking, index) =>
      TREATMENT_PLAN[index].map((item) => ({
        visitId: `seed-${booking.id}`,
        doctorId: profile.id,
        bookingId: booking.id,
        patientName: booking.name,
        patientPhone: booking.phone,
        date: booking.date,
        tooth: item.tooth,
        procedure: item.procedure,
        surfaces: item.surfaces || "",
        note: "",
        createdAt: new Date(`${booking.date}T13:00:00`),
      }))
    );

  if (treatmentRows.length) {
    await prisma.treatmentRecord.createMany({ data: treatmentRows });
  }
  console.log(`Seeded ${treatmentRows.length} demo tooth treatments.`);

  const counts = await prisma.networkBooking.groupBy({
    by: ["status"],
    where: { doctorId: profile.id, code: { startsWith: CODE_PREFIX } },
    _count: true,
  });
  console.log(`Removed ${removed.count} old demo bookings.`);
  console.log(`Seeded ${rows.length} demo bookings for ${profile.name}:`);
  console.log(counts.map((c) => `${c.status}=${c._count}`).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
