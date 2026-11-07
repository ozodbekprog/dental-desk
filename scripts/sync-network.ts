import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { refreshDoctorRating } from "../lib/network";

/**
 * Backfills the global doctor directory from the per-clinic `doctors` records,
 * creates the demo independent doctor and seeds ratings. Safe to re-run.
 */

const SPECS: Record<string, string> = {
  therapist: "therapist",
  surgeon: "surgeon",
  orthodontist: "orthodontist",
  hygienist: "hygienist",
  pediatric: "pediatric",
  dentist: "therapist",
};

const CLINIC_ADDRESS = "Toshkent, Chilonzor tumani, Bunyodkor ko'chasi 12";
const CLINIC_PHONE = "+998 71 200 12 12";
const CLINIC_MAP = `https://yandex.uz/maps/?text=${encodeURIComponent(CLINIC_ADDRESS)}`;

const NETWORK_DOCTOR = {
  name: "Dr. Sardor Aliyev",
  phone: "+998 90 777 45 45",
  email: "doktor@demo.uz",
  specialty: "therapist",
  licenseNo: "ST-2019-0442",
  experience: 11,
  bio: "Tarmoq shifokori: terapevtik stomatologiya, estetik plombalash va kanal davolash. Klinikadan mustaqil qabul qiladi.",
  address: "Toshkent, Yunusobod tumani, Amir Temur shoh ko'chasi 108, 3-qavat",
  priceFrom: 250_000,
};

const REVIEW_SEED: { rating: number; comment: string }[] = [
  { rating: 5, comment: "Juda e'tiborli shifokor, og'riqsiz davoladi. Rahmat!" },
  { rating: 5, comment: "Vaqtida qabul qildi, hammasi tushunarli tushuntirildi." },
  { rating: 4, comment: "Yaxshi mutaxassis, navbat biroz kutdirildi." },
  { rating: 5, comment: "Bolam ham qo'rqmadi, muomala a'lo." },
];

function digits(value: string): string {
  return String(value || "").replace(/\D+/g, "");
}

async function main() {
  const clinic = await prisma.clinic.findFirst({ where: { slug: "demo" } });
  if (!clinic) {
    console.error("demo clinic not found; run npm run seed:demo first");
    process.exit(1);
  }

  await prisma.clinic.update({
    where: { id: clinic.id },
    data: {
      address: clinic.address || CLINIC_ADDRESS,
      phone: clinic.phone || CLINIC_PHONE,
      mapUrl: clinic.mapUrl || CLINIC_MAP,
    },
  });

  const rows = await prisma.record.findMany({
    where: { clinicId: clinic.id, collection: "doctors" },
    select: { docId: true, data: true },
  });

  let linked = 0;
  for (const row of rows) {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(row.data);
    } catch {}
    const name = String(data.name || "").trim();
    if (!name) continue;
    const specialty = SPECS[String(data.spec || "therapist")] || "therapist";
    const experience = [8, 12, 6, 9][linked % 4];

    const doctor = await prisma.doctorProfile.upsert({
      where: { id: `net-${clinic.slug}-${row.docId}` },
      update: { name, specialty, isPublic: true },
      create: {
        id: `net-${clinic.slug}-${row.docId}`,
        name,
        specialty,
        experience,
        bio: `${name} — ${clinic.name} shifokori.`,
        contract: "clinic",
        isPublic: true,
      },
    });

    await prisma.clinicDoctor.upsert({
      where: { clinicId_doctorId: { clinicId: clinic.id, doctorId: doctor.id } },
      update: { recordId: row.docId, isPublic: true },
      create: {
        clinicId: clinic.id,
        doctorId: doctor.id,
        recordId: row.docId,
        isPublic: true,
      },
    });
    linked++;
  }

  const doctorEmail = NETWORK_DOCTOR.email;
  let user = await prisma.user.findUnique({ where: { email: doctorEmail } });
  if (!user) {
    const password = process.env.DEMO_DOCTOR_PASSWORD || "doktor1234";
    user = await prisma.user.create({
      data: {
        email: doctorEmail,
        name: NETWORK_DOCTOR.name,
        role: "doctor",
        clinicId: null,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
  }

  const networkDoctor = await prisma.doctorProfile.upsert({
    where: { id: "net-independent-demo" },
    update: { userId: user.id },
    create: {
      id: "net-independent-demo",
      userId: user.id,
      name: NETWORK_DOCTOR.name,
      phone: NETWORK_DOCTOR.phone,
      email: doctorEmail,
      specialty: NETWORK_DOCTOR.specialty,
      licenseNo: NETWORK_DOCTOR.licenseNo,
      experience: NETWORK_DOCTOR.experience,
      bio: NETWORK_DOCTOR.bio,
      contract: "platform",
      status: "active",
      isPublic: true,
      address: NETWORK_DOCTOR.address,
      mapUrl: `https://yandex.uz/maps/?text=${encodeURIComponent(NETWORK_DOCTOR.address)}`,
      priceFrom: NETWORK_DOCTOR.priceFrom,
    },
  });

  const allDoctors = await prisma.doctorProfile.findMany({ select: { id: true } });
  for (const doctor of allDoctors) {
    const count = await prisma.doctorReview.count({ where: { doctorId: doctor.id } });
    if (count === 0) {
      const take = doctor.id === networkDoctor.id ? 3 : 2;
      for (let i = 0; i < take; i++) {
        const seed = REVIEW_SEED[(i + doctor.id.length) % REVIEW_SEED.length];
        await prisma.doctorReview.create({
          data: { doctorId: doctor.id, rating: seed.rating, comment: seed.comment, status: "published" },
        });
      }
    }
    await refreshDoctorRating(doctor.id);
  }

  const networkBookings = await prisma.networkBooking.count();
  console.log(
    `network sync ok: ${linked} clinic doctors linked, independent doctor ${networkDoctor.id}, ` +
      `login ${doctorEmail}, reviews refreshed, bookings ${networkBookings}`
  );
  console.log(`clinic phone key demo: ${digits(clinic.phone)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
