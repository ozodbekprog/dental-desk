import { prisma } from "@/lib/prisma";
import { patientSession } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await patientSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const account = await prisma.patientAccount.findUnique({ where: { id: session.uid } });
  if (!account) return Response.json({ error: "unauthorized" }, { status: 401 });

  const links = await prisma.patientClinicLink.count({ where: { patientId: account.id } });

  return Response.json(
    {
      ok: true,
      patient: {
        id: account.id,
        name: account.name,
        phone: account.phone,
        lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
      },
      links,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
