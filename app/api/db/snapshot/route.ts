import { clinicContext } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { CALL_CENTER_HIDDEN } from "@/lib/util";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await clinicContext();
  if ("error" in ctx) return ctx.error;

  const rows = await prisma.record.findMany({
    where: { clinicId: ctx.clinic.id },
    select: { collection: true, docId: true, data: true },
  });

  const collections: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(row.data);
    } catch {
      parsed = {};
    }
    (collections[row.collection] ||= {})[row.docId] = parsed;
  }

  // The call centre books appointments; it must not read clinical, financial or HR records.
  if (ctx.session.role === "callcenter") {
    for (const name of CALL_CENTER_HIDDEN) delete collections[name];
    const patients = collections.patients;
    if (patients) {
      for (const id of Object.keys(patients)) {
        const p = patients[id];
        if (p && typeof p === "object" && !Array.isArray(p)) {
          const copy = { ...(p as Record<string, unknown>) };
          delete copy.alerts;
          delete copy.alertIds;
          patients[id] = copy;
        }
      }
    }
  }

  const stats = await prisma.record.aggregate({
    where: { clinicId: ctx.clinic.id },
    _count: true,
    _max: { updatedAt: true },
  });

  const version = `${stats._count}:${stats._max.updatedAt?.getTime() ?? 0}`;

  return Response.json(
    {
      version,
      writable: ctx.session.role !== "viewer",
      plan: ctx.clinic.plan,
      collections,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
