import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminClient } from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "super") redirect("/app");

  const clinics = await prisma.clinic.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, records: true } } },
  });

  return (
    <AdminClient
      adminName={session.name}
      clinics={clinics.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        plan: c.plan,
        status: c.status,
        trialEndsAt: c.trialEndsAt?.toISOString() ?? null,
      paidUntil: c.paidUntil?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        users: c._count.users,
        records: c._count.records,
      }))}
    />
  );
}
