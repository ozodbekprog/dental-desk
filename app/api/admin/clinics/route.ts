import { isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isSuperAdmin())) return jsonError("forbidden", 403);

  const clinics = await prisma.clinic.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, records: true } } },
  });

  return Response.json({
    clinics: clinics.map((c) => ({
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
    })),
  });
}
