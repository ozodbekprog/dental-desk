import { redirect } from "next/navigation";
import { getSession, canManageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "super") redirect("/admin");
  if (!session.cid) redirect("/login");

  const [user, staff] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.uid }, include: { clinic: true } }),
    prisma.user.findMany({
      where: { clinicId: session.cid },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user || !user.clinic) redirect("/login");

  return (
    <SettingsClient
      me={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      clinic={{
        name: user.clinic.name,
        slug: user.clinic.slug,
        plan: user.clinic.plan,
        status: user.clinic.status,
        trialEndsAt: user.clinic.trialEndsAt?.toISOString() ?? null,
        paidUntil: user.clinic.paidUntil?.toISOString() ?? null,
      }}
      staff={staff.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        createdAt: s.createdAt.toISOString(),
      }))}
      canManage={canManageRole(user.role)}
    />
  );
}
