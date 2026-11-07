import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toProfileDTO } from "@/app/api/doktor/shared";
import { DoctorDashboard } from "@/components/doctor/DoctorDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shifokor kabineti — Dental Desk",
  description: "Tarmoq shifokori uchun so'rovlar, jadval va profil boshqaruvi.",
  robots: { index: false, follow: false },
};

export default async function DoktorPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/doktor");
  if (session.role === "super") redirect("/admin");
  // Clinic staff and every other role keep using the clinic app.
  if (session.role !== "doctor" || session.cid) redirect("/app");

  const profile = await prisma.doctorProfile.findUnique({ where: { userId: session.uid } });

  return (
    <DoctorDashboard
      me={{ name: session.name || profile?.name || "Shifokor", email: session.email }}
      initialProfile={profile ? toProfileDTO(profile) : null}
    />
  );
}
