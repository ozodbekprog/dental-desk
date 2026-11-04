import { expireOverdue } from "@/lib/billing";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily billing sweep. Call from cron:
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" https://host/api/cron/billing
 * Disabled (503) when CRON_SECRET is not configured, so it cannot be triggered
 * anonymously by accident.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return jsonError("cron_disabled", 503);

  const url = new URL(req.url);
  const header = req.headers.get("authorization") || "";
  const provided = header.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret") || "";
  if (provided !== secret) return jsonError("forbidden", 403);

  const result = await expireOverdue();
  return Response.json({ ok: true, ...result, ts: new Date().toISOString() });
}