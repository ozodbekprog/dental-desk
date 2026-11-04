import { clinicContext } from "@/lib/api";
import { canManageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await clinicContext();
  if ("error" in ctx) return ctx.error;

  const counts = await prisma.record.groupBy({
    by: ["collection"],
    where: { clinicId: ctx.clinic.id },
    _count: true,
  });
  const byCollection: Record<string, number> = {};
  for (const c of counts) byCollection[c.collection] = c._count;
  const staff = await prisma.user.count({ where: { clinicId: ctx.clinic.id } });

  return Response.json({
    id: ctx.clinic.id,
    name: ctx.clinic.name,
    slug: ctx.clinic.slug,
    plan: ctx.clinic.plan,
    status: ctx.clinic.status,
    trialEndsAt: ctx.clinic.trialEndsAt?.toISOString() ?? null,
    createdAt: ctx.clinic.createdAt.toISOString(),
    counts: byCollection,
    staff,
  });
}

export async function PUT(req: Request) {
  const ctx = await clinicContext();
  if ("error" in ctx) return ctx.error;
  if (!canManageRole(ctx.session.role)) return jsonError("forbidden", 403);

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (name.length < 2) return jsonError("Klinika nomini kiriting");

  await prisma.clinic.update({ where: { id: ctx.clinic.id }, data: { name } });
  return Response.json({ ok: true });
}
