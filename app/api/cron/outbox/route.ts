import { clinicContext } from "@/lib/api";
import { canWriteRole } from "@/lib/auth";
import { deliver } from "@/lib/channels";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH = 25;

type OutboxDoc = {
  channel?: string;
  to?: string;
  text?: string;
  status?: string;
  campaignId?: string;
  patientId?: string;
};

/**
 * Drains this clinic's outbox. A logged-in writer can trigger it (the campaign UI does
 * this right after queueing); a scheduler can call it with the CRON_SECRET for every clinic.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const systemRun = !!secret && provided === secret;

  let clinics: string[];
  if (systemRun) {
    const rows = await prisma.record.findMany({ where: { collection: "outbox", data: { contains: '"queued"' } }, select: { clinicId: true }, distinct: ["clinicId"] });
    clinics = rows.map((r) => r.clinicId);
  } else {
    const ctx = await clinicContext();
    if ("error" in ctx) return ctx.error;
    if (!canWriteRole(ctx.session.role)) return jsonError("read_only", 403);
    clinics = [ctx.clinic.id];
  }

  let sent = 0, demo = 0, failed = 0;
  for (const clinicId of clinics) {
    const queued = await prisma.record.findMany({
      where: { clinicId, collection: "outbox" },
      orderBy: { updatedAt: "asc" },
      take: BATCH * 4,
    });
    const batch = queued.filter((r) => {
      try {
        return (JSON.parse(r.data) as OutboxDoc).status === "queued";
      } catch {
        return false;
      }
    }).slice(0, BATCH);

    for (const row of batch) {
      const doc = JSON.parse(row.data) as OutboxDoc;
      const result = await deliver({ channel: doc.channel || "", to: doc.to || "", text: doc.text || "" });
      if (result.status === "sent") sent++;
      else if (result.status === "demo") demo++;
      else failed++;
      await prisma.record.update({
        where: { id: row.id },
        data: { data: JSON.stringify({ ...doc, status: result.status, sentAt: Date.now(), ...(result.error ? { error: result.error } : {}) }) },
      });
    }
  }

  return Response.json({ ok: true, sent, demo, failed, ts: new Date().toISOString() });
}
