import { isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";

const PLANS = ["trial", "start", "clinic", "network"];
const STATUSES = ["active", "expired", "suspended"];

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  if (!(await isSuperAdmin())) return jsonError("forbidden", 403);

  const { id } = await params;
  const clinic = await prisma.clinic.findUnique({ where: { id } });
  if (!clinic) return jsonError("not_found", 404);

  const body = await req.json().catch(() => null);
  const data: {
    plan?: string;
    status?: string;
    name?: string;
    trialEndsAt?: Date | null;
  } = {};

  if (body?.plan !== undefined) {
    const plan = String(body.plan);
    if (!PLANS.includes(plan)) return jsonError("plan_invalid");
    data.plan = plan;
  }
  if (body?.status !== undefined) {
    const status = String(body.status);
    if (!STATUSES.includes(status)) return jsonError("status_invalid");
    data.status = status;
  }
  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) return jsonError("name_invalid");
    data.name = name;
  }
  if (body?.extendTrialDays !== undefined) {
    const days = Number(body.extendTrialDays);
    if (!Number.isFinite(days) || days < 1 || days > 365) return jsonError("days_invalid");
    const base = clinic.trialEndsAt && clinic.trialEndsAt.getTime() > Date.now() ? clinic.trialEndsAt : new Date();
    data.trialEndsAt = new Date(base.getTime() + days * 86400000);
    if (clinic.plan === "trial") data.status = "active";
  }
  if (body?.trialEndsAt !== undefined) {
    data.trialEndsAt = body.trialEndsAt ? new Date(body.trialEndsAt) : null;
  }

  if (Object.keys(data).length === 0) return jsonError("no_changes");

  await prisma.clinic.update({ where: { id }, data });
  return Response.json({ ok: true });
}
