import { getSession, canWriteRole, clinicWritable } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    include: { clinic: true },
  });
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const clinic = user.clinic;
  return Response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    clinicId: user.clinicId,
    clinicName: clinic?.name ?? "",
    clinicSlug: clinic?.slug ?? "",
    plan: clinic?.plan ?? null,
    status: clinic?.status ?? null,
    trialEndsAt: clinic?.trialEndsAt?.toISOString() ?? null,
    canEdit: !!clinic,
    canWrite: !!clinic && canWriteRole(user.role) && clinicWritable(clinic),
  });
}
