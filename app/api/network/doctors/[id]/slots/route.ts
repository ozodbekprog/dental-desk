import { getDoctorSlots, isBookableDate } from "@/lib/network";
import { dayList } from "@/lib/booking";
import { jsonError, ymd } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(req.url);
  const date = String(url.searchParams.get("date") || ymd(new Date()));
  const clinicId = url.searchParams.get("clinicId") || undefined;
  const days = dayList(ymd(new Date()));
  if (!isBookableDate(date, days)) return jsonError("bad_date", 400);

  const slots = await getDoctorSlots(id, date, clinicId);
  if (!slots) return jsonError("doctor_not_found", 404);
  return Response.json({ ...slots, date }, { headers: { "Cache-Control": "no-store" } });
}
