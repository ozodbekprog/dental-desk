import { clinicContext } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { CALL_CENTER_HIDDEN, complaintVisibleTo } from "@/lib/util";

export const runtime = "nodejs";

/**
 * Incremental change feed for the v2 adapter: returns only records whose
 * updatedAt is strictly newer than `since` (epoch ms), plus deleted doc ids.
 * Rows with the same millisecond timestamp are resolved by returning them
 * again — the client replaces the whole doc, so replaying is harmless.
 */
export async function GET(req: Request) {
  const ctx = await clinicContext();
  if ("error" in ctx) return ctx.error;

  const url = new URL(req.url);
  const since = Math.max(0, Number(url.searchParams.get("since") || 0) || 0);

  const rows = await prisma.record.findMany({
    where: {
      clinicId: ctx.clinic.id,
      updatedAt: since > 0 ? { gt: new Date(since) } : undefined,
    },
    select: { collection: true, docId: true, data: true, rev: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
    take: 5000,
  });

  const hidden = ctx.session.role === "callcenter" ? CALL_CENTER_HIDDEN : [];
  const collections: Record<string, Record<string, unknown>> = {};
  const revs: Record<string, number> = {};
  let cursor = since;

  for (const row of rows) {
    if (hidden.includes(row.collection)) continue;
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(row.data);
    } catch {
      parsed = {};
    }
    if (row.collection === "complaints" && !complaintVisibleTo(parsed, ctx.session.uid)) {
      // A note that is no longer visible must disappear from the client cache.
      revs[`complaints/${row.docId}`] = 0;
      cursor = Math.max(cursor, row.updatedAt.getTime());
      continue;
    }
    (collections[row.collection] ||= {})[row.docId] = parsed;
    revs[`${row.collection}/${row.docId}`] = row.rev;
    cursor = Math.max(cursor, row.updatedAt.getTime());
  }

  // Deletions cannot be seen through updatedAt; the client also watches `version`
  // (count + max updatedAt) and falls back to a full snapshot when the count drops.
  const stats = await prisma.record.aggregate({
    where: { clinicId: ctx.clinic.id },
    _count: true,
    _max: { updatedAt: true },
  });

  return Response.json(
    {
      since,
      cursor,
      count: stats._count,
      maxUpdatedAt: stats._max.updatedAt?.getTime() ?? 0,
      collections,
      revs,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
