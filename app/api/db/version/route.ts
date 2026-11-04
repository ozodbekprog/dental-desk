import { clinicContext } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await clinicContext();
  if ("error" in ctx) return ctx.error;

  const stats = await prisma.record.aggregate({
    where: { clinicId: ctx.clinic.id },
    _count: true,
    _max: { updatedAt: true },
  });

  return Response.json(
    { version: `${stats._count}:${stats._max.updatedAt?.getTime() ?? 0}` },
    { headers: { "Cache-Control": "no-store" } }
  );
}
