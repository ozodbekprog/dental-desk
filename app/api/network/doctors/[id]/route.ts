import { getDoctor } from "@/lib/network";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const doctor = await getDoctor(id);
  if (!doctor) return jsonError("doctor_not_found", 404);
  return Response.json({ doctor }, { headers: { "Cache-Control": "no-store" } });
}
