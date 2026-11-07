import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDoctor } from "@/lib/network";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ doctorId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doctorId } = await params;
  const doctor = await getDoctor(doctorId);
  if (!doctor) return { title: "Onlayn yozilish — Dental Desk" };
  return {
    title: `${doctor.name} — onlayn yozilish | Dental Desk`,
    description: `${doctor.name} (${doctor.specialtyLabel}) qabuliga onlayn yoziling: bo'sh vaqtni tanlang, ism va telefonni qoldiring. Akkaunt shart emas.`,
    robots: { index: false, follow: false },
  };
}

export default async function DoctorBookingPage({ params }: Props) {
  const { doctorId } = await params;
  const doctor = await getDoctor(doctorId);
  if (!doctor) notFound();
  return <BookingFlow doctor={doctor} />;
}
