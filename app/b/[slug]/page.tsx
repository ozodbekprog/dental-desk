import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicClinic } from "@/lib/booking";
import { PublicBooking } from "@/components/PublicBooking";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const info = await getPublicClinic(slug);
  if (!info) return { title: "Onlayn qabul — Dental Desk" };
  return {
    title: `Onlayn qabul — ${info.clinic.name}`,
    description: `${info.clinic.name} uchun onlayn qabul: shifokorni tanlang, bo'sh vaqtni ko'ring va so'rov qoldiring.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params;
  const info = await getPublicClinic(slug);
  if (!info) notFound();
  return <PublicBooking info={info} />;
}
