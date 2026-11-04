import { randomUUID } from "node:crypto";
import {
  REASON_IDS,
  SLOT_TIMES,
  getPublicClinic,
  isPastSlot,
  loadBookingData,
  requestStatus,
  requestTimeTaken,
  withLock,
} from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, tooMany } from "@/lib/rate-limit";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

function digits(value: string): string {
  return value.replace(/\D+/g, "");
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;
  const ip = clientIp(req);
  const limit = hit(`pubreq:${slug}:${ip}`, 10, 60 * 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("bad_request", 400);

  const name = String((body as Record<string, unknown>).name ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  const phone = String((body as Record<string, unknown>).phone ?? "")
    .trim()
    .slice(0, 32);
  const doctorId = String((body as Record<string, unknown>).doctorId ?? "");
  const date = String((body as Record<string, unknown>).date ?? "");
  const time = String((body as Record<string, unknown>).time ?? "");
  const rawReason = String((body as Record<string, unknown>).reason ?? "");
  const reason = (REASON_IDS as readonly string[]).includes(rawReason) ? rawReason : "";
  const reasonOther = String((body as Record<string, unknown>).reasonOther ?? "")
    .trim()
    .slice(0, 200);
  const lang = ["uz", "ru", "en"].includes(String((body as Record<string, unknown>).lang))
    ? String((body as Record<string, unknown>).lang)
    : "uz";

  if (name.length < 2) return jsonError("enter_name", 400);
  const phoneDigits = digits(phone);
  if (phoneDigits.length < 7 || phoneDigits.length > 15) return jsonError("enter_phone", 400);

  const info = await getPublicClinic(slug);
  if (!info) return jsonError("not_found", 404);
  if (!info.open) return jsonError("booking_closed", 403);

  const doctor = info.doctors.find((d) => d.id === doctorId);
  if (!doctor) return jsonError("doctor_not_found", 404);
  if (!info.days.includes(date)) return jsonError("bad_date", 400);
  if (!SLOT_TIMES.includes(time)) return jsonError("bad_time", 400);
  if (isPastSlot(date, time)) return jsonError("slot_taken", 409);

  const lockKey = `pub:${info.clinic.id}:${doctorId}:${date}:${time}`;
  return withLock(lockKey, async () => {
    const data = await loadBookingData(info.clinic.id);

    const open = data.requests.flatMap((doc) =>
      doc.items.map((item) => ({ ...item, status: requestStatus(data, item.id) }))
    );
    const duplicate = open.some(
      (item) =>
        item.doctorId === doctorId &&
        item.date === date &&
        item.time === time &&
        digits(item.phone || "") === phoneDigits &&
        item.status !== "declined" &&
        item.status !== "confirmed"
    );
    if (duplicate) return jsonError("duplicate", 409);

    const mine = open.filter(
      (item) =>
        digits(item.phone || "") === phoneDigits &&
        item.status !== "declined" &&
        item.status !== "confirmed"
    );
    if (mine.length >= 3) return jsonError("too_many_open", 409);

    if (requestTimeTaken(data, doctorId, date, time)) {
      return jsonError("slot_taken", 409);
    }

    const id = `r${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = Date.now();
    const item = {
      id,
      name,
      phone,
      doctorId,
      doctorName: doctor.name,
      date,
      time,
      duration: 30,
      reason,
      reasonOther,
      source: "public",
      lang,
      createdAt: now,
    };

    await prisma.record.create({
      data: {
        clinicId: info.clinic.id,
        collection: "requests",
        docId: `pub-${randomUUID()}`,
        data: JSON.stringify({ items: [item], channel: "public", createdAt: now }),
      },
    });

    return Response.json(
      {
        ok: true,
        request: {
          id,
          name,
          phone,
          doctorId,
          doctorName: doctor.name,
          date,
          time,
          reason,
          reasonOther,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  });
}
