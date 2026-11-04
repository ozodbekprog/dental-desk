import type { Invoice } from "@prisma/client";
import { prisma } from "./prisma";

/** Monthly prices in so'm. Keep in sync with docs/02-narx-va-shartlar.md. */
export const PLAN_PRICES: Record<string, number> = {
  start: 299_000,
  clinic: 599_000,
  network: 999_000,
};

export const BILLABLE_PLANS = Object.keys(PLAN_PRICES);

export function planPrice(plan: string): number | null {
  return PLAN_PRICES[plan] ?? null;
}

export function addMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** New billing period always starts where the current paid period ends. */
export function billingStart(clinic: { paidUntil: Date | null }, now = new Date()): Date {
  if (clinic.paidUntil && clinic.paidUntil.getTime() > now.getTime()) return clinic.paidUntil;
  return now;
}

export async function invoiceNumber(now = new Date()): Promise<string> {
  const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  for (let i = 0; i < 8; i++) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const number = `DD-${ym}-${suffix}`;
    const exists = await prisma.invoice.findUnique({ where: { number }, select: { id: true } });
    if (!exists) return number;
  }
  return `DD-${ym}-${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

/**
 * Mark one invoice paid and extend the clinic subscription. The period is the
 * one stored on the invoice; the clinic keeps whichever end date is later, so
 * out-of-order payments never shorten access.
 */
export type MarkPaidResult =
  | { error: "not_found" | "already_paid" }
  | { invoice: Invoice; paidUntil: Date };

export async function markInvoicePaid(id: string, method: string): Promise<MarkPaidResult> {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id }, include: { clinic: true } });
    if (!invoice) return { error: "not_found" as const };
    if (invoice.status === "paid") return { error: "already_paid" as const };

    const paidUntil =
      invoice.clinic.paidUntil && invoice.clinic.paidUntil.getTime() > invoice.periodEnd.getTime()
        ? invoice.clinic.paidUntil
        : invoice.periodEnd;

    const updated = await tx.invoice.update({
      where: { id },
      data: { status: "paid", paidAt: new Date(), method },
    });
    await tx.clinic.update({
      where: { id: invoice.clinicId },
      data: { plan: invoice.plan, status: "active", paidUntil },
    });
    return { invoice: updated, paidUntil };
  });
}

/**
 * Daily sweep:
 *  - trial clinics become `expired` once trialEndsAt passes;
 *  - paid clinics become `expired` once paidUntil passes;
 *  - suspended clinics are left alone.
 * Returns counters for the cron log / admin dashboard.
 */
export async function expireOverdue(now = new Date()) {
  const [trials, paid] = await Promise.all([
    prisma.clinic.updateMany({
      where: { plan: "trial", status: "active", trialEndsAt: { lt: now } },
      data: { status: "expired" },
    }),
    prisma.clinic.updateMany({
      where: {
        plan: { in: BILLABLE_PLANS },
        status: "active",
        paidUntil: { lt: now },
      },
      data: { status: "expired" },
    }),
  ]);
  return { expiredTrials: trials.count, expiredPaid: paid.count };
}