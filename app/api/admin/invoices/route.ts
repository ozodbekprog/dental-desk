import { isSuperAdmin } from "@/lib/auth";
import {
  BILLABLE_PLANS,
  addMonths,
  billingStart,
  invoiceNumber,
  planPrice,
} from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";

const METHODS = ["manual", "bank", "payme", "click"];

export async function GET(req: Request) {
  if (!(await isSuperAdmin())) return jsonError("forbidden", 403);

  const url = new URL(req.url);
  const clinicId = url.searchParams.get("clinicId") || undefined;

  const invoices = await prisma.invoice.findMany({
    where: clinicId ? { clinicId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { clinic: { select: { name: true } } },
  });

  return Response.json({
    invoices: invoices.map((i) => ({
      id: i.id,
      number: i.number,
      clinicId: i.clinicId,
      clinicName: i.clinic.name,
      plan: i.plan,
      amount: i.amount,
      months: i.months,
      periodStart: i.periodStart.toISOString(),
      periodEnd: i.periodEnd.toISOString(),
      status: i.status,
      method: i.method,
      note: i.note,
      createdAt: i.createdAt.toISOString(),
      paidAt: i.paidAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return jsonError("forbidden", 403);

  const body = await req.json().catch(() => null);
  const clinicId = String(body?.clinicId || "");
  const plan = String(body?.plan || "");
  const months = Math.floor(Number(body?.months ?? 1));

  if (!clinicId) return jsonError("clinic_required");
  if (!BILLABLE_PLANS.includes(plan)) return jsonError("plan_invalid");
  if (!Number.isFinite(months) || months < 1 || months > 24) return jsonError("months_invalid");

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) return jsonError("clinic_not_found", 404);

  const listPrice = planPrice(plan) ?? 0;
  const rawAmount = body?.amount === undefined || body?.amount === "" ? listPrice * months : Number(body.amount);
  if (!Number.isFinite(rawAmount) || rawAmount < 0 || rawAmount > 100_000_000) {
    return jsonError("amount_invalid");
  }
  const amount = Math.round(rawAmount);

  const method = METHODS.includes(String(body?.method)) ? String(body.method) : "manual";
  const note = String(body?.note || "").trim().slice(0, 300);
  const periodStart = billingStart(clinic);
  const periodEnd = addMonths(periodStart, months);

  const invoice = await prisma.invoice.create({
    data: {
      clinicId,
      number: await invoiceNumber(),
      plan,
      amount,
      months,
      periodStart,
      periodEnd,
      method,
      note,
    },
    include: { clinic: { select: { name: true } } },
  });

  return Response.json({
    invoice: {
      id: invoice.id,
      number: invoice.number,
      clinicId: invoice.clinicId,
      clinicName: invoice.clinic.name,
      plan: invoice.plan,
      amount: invoice.amount,
      months: invoice.months,
      periodStart: invoice.periodStart.toISOString(),
      periodEnd: invoice.periodEnd.toISOString(),
      status: invoice.status,
      method: invoice.method,
      note: invoice.note,
      createdAt: invoice.createdAt.toISOString(),
      paidAt: null,
    },
  });
}