import {
  freeSlots,
  getPublicClinic,
  isClosed,
  isValidDate,
  loadBookingData,
} from "@/lib/booking";
import { clientIp, hit, tooMany } from "@/lib/rate-limit";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const limit = hit(`pubslots:${clientIp(req)}`, 240, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const { slug } = await params;
  const url = new URL(req.url);
  const doctorId = url.searchParams.get("doctorId") || "";
  const date = url.searchParams.get("date") || "";

  const info = await getPublicClinic(slug);
  if (!info) return jsonError("not_found", 404);
  if (!info.open) {
    return Response.json(
      { open: false, closed: false, slots: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  if (!info.doctors.some((d) => d.id === doctorId)) return jsonError("doctor_not_found", 404);
  if (!isValidDate(date) || !info.days.includes(date)) return jsonError("bad_date", 400);

  const data = await loadBookingData(info.clinic.id);
  return Response.json(
    {
      open: true,
      closed: isClosed(date),
      slots: isClosed(date) ? [] : freeSlots(data, doctorId, date),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
