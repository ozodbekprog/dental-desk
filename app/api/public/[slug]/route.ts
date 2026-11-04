import { getPublicClinic } from "@/lib/booking";
import { clientIp, hit, tooMany } from "@/lib/rate-limit";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const limit = hit(`pubinfo:${clientIp(req)}`, 120, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const { slug } = await params;
  const info = await getPublicClinic(slug);
  if (!info) return jsonError("not_found", 404);

  return Response.json(info, { headers: { "Cache-Control": "no-store" } });
}
