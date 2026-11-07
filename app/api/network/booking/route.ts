import { randomUUID } from "node:crypto";
import { SLOT_TIMES, dayList, isPastSlot, withLock } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, tooMany } from "@/lib/rate-limit";
import { jsonError, ymd } from "@/lib/util";
import { digits, getDoctorSlots, newBookingCode, phoneKey } from "@/lib/network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIO_MAX = 2_000_000;
const REASON_MAX = 500;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function parseJson(data: string): Record<string, unknown> {
  try {
    return asObject(JSON.parse(data));
  } catch {
    return {};
  }
}

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function newRequestId(): string {
  return `r${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/**
 * Public booking for the doctor network.
 * - doctors linked to a clinic go into that clinic's `requests` queue (the clinic
 *   app already shows them);
 * - independent doctors get a NetworkBooking with a short status code.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("bad_request", 400);
  const input = body as Record<string, unknown>;

  const doctorId = String(input.doctorId ?? "").trim().slice(0, 64);
  const clinicIdParam = String(input.clinicId ?? "").trim().slice(0, 64);
  const name = String(input.name ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  const phoneRaw = String(input.phone ?? "")
    .trim()
    .slice(0, 32);
  const date = String(input.date ?? "").trim().slice(0, 10);
  const time = String(input.time ?? "").trim().slice(0, 5);
  const rawKind = String(input.reasonKind ?? "");
  const reasonKind = rawKind === "text" || rawKind === "audio" ? rawKind : "";
  const reasonText = String(input.reasonText ?? "")
    .trim()
    .slice(0, REASON_MAX);
  const rawAudio = String(input.audioData ?? "");
  const lang = ["uz", "ru", "en"].includes(String(input.lang)) ? String(input.lang) : "uz";

  if (!doctorId) return jsonError("doctor_not_found", 404);

  const limit = hit(`netbooking:${ip}:${doctorId}`, 10, 60 * 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  if (name.length < 2) return jsonError("enter_name", 400);
  const phoneDigits = digits(phoneRaw);
  if (phoneDigits.length < 7 || phoneDigits.length > 15) return jsonError("enter_phone", 400);

  const days = dayList(ymd(new Date()));
  if (!days.includes(date)) return jsonError("bad_date", 400);
  if (!SLOT_TIMES.includes(time)) return jsonError("bad_time", 400);
  if (isPastSlot(date, time)) return jsonError("slot_taken", 409);

  if (rawAudio && !rawAudio.startsWith("data:audio/")) return jsonError("bad_audio", 400);
  if (rawAudio.length > AUDIO_MAX) return jsonError("audio_too_large", 400);
  const audioData = reasonKind === "audio" ? rawAudio : "";
  if (reasonKind === "audio" && !audioData) return jsonError("audio_required", 400);

  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: {
      clinics: {
        where: { isPublic: true, clinic: { status: "active" } },
        include: { clinic: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!doctor || doctor.status !== "active" || !doctor.isPublic) {
    return jsonError("doctor_not_found", 404);
  }

  const link =
    (clinicIdParam && doctor.clinics.find((item) => item.clinicId === clinicIdParam)) ||
    doctor.clinics[0] ||
    null;

  const lockKey = `net:${doctorId}:${date}:${time}`;
  return withLock(lockKey, async () => {
    const slots = await getDoctorSlots(doctorId, date, link ? link.clinicId : undefined);
    if (!slots || !slots.slots.includes(time)) return jsonError("slot_taken", 409);

    if (link) {
      // Keep clinic doctors in the existing per-clinic queue so reception sees them.
      const rows = await prisma.record.findMany({
        where: { clinicId: link.clinicId, collection: { in: ["requests", "reqstate"] } },
        select: { collection: true, docId: true, data: true },
      });
      const states = new Map<string, string>();
      for (const row of rows) {
        if (row.collection !== "reqstate") continue;
        states.set(row.docId, String(parseJson(row.data).status || "requested"));
      }
      for (const row of rows) {
        if (row.collection !== "requests") continue;
        const items = parseJson(row.data).items;
        if (!Array.isArray(items)) continue;
        const duplicate = items
          .map((item) => asObject(item))
          .some((item) => {
            if (digits(String(item.phone || "")) !== phoneDigits) return false;
            if (String(item.doctorId || "") !== link.recordId) return false;
            if (String(item.date || "") !== date) return false;
            if (String(item.time || "") !== time) return false;
            const status = states.get(String(item.id || "")) || "requested";
            return status !== "declined" && status !== "confirmed";
          });
        if (duplicate) return jsonError("duplicate", 409);
      }

      const id = newRequestId();
      const now = Date.now();
      const item = {
        id,
        name,
        phone: phoneRaw,
        doctorId: link.recordId,
        doctorName: doctor.name,
        date,
        time,
        duration: 30,
        reason: "",
        reasonOther: reasonKind === "text" ? reasonText : "",
        reasonText,
        reasonKind,
        audioData: reasonKind === "audio" ? audioData : "",
        source: "network",
        lang,
        createdAt: now,
      };

      await prisma.record.create({
        data: {
          clinicId: link.clinicId,
          collection: "requests",
          docId: `net-${randomUUID()}`,
          data: JSON.stringify({ items: [item], channel: "network", createdAt: now }),
        },
      });

      return Response.json(
        {
          ok: true,
          kind: "clinic",
          status: "requested",
          requestId: id,
          clinicSlug: link.clinic.slug,
          clinicName: link.clinic.name,
          statusUrl: `/bron/holat?c=${encodeURIComponent(link.clinic.slug)}&r=${encodeURIComponent(id)}`,
          doctorName: doctor.name,
          date,
          time,
        },
        { status: 201, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Independent doctor: one booking per phone + slot.
    const phoneStored = phoneKey(phoneRaw);
    if (!phoneStored) return jsonError("enter_phone", 400);

    const duplicate = await prisma.networkBooking.count({
      where: {
        phone: phoneStored,
        doctorId,
        date,
        time,
        status: { in: ["requested", "confirmed"] },
      },
    });
    if (duplicate > 0) return jsonError("duplicate", 409);

    let patient = await prisma.patientAccount.findUnique({ where: { phone: phoneStored } });
    if (!patient) {
      try {
        patient = await prisma.patientAccount.create({
          data: { phone: phoneStored, name },
        });
      } catch (error) {
        if (!isUniqueError(error)) throw error;
        patient = await prisma.patientAccount.findUnique({ where: { phone: phoneStored } });
      }
    } else if (!patient.name && name) {
      patient = await prisma.patientAccount.update({
        where: { id: patient.id },
        data: { name },
      });
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newBookingCode();
      try {
        const booking = await prisma.networkBooking.create({
          data: {
            code,
            doctorId,
            clinicId: null,
            patientId: patient ? patient.id : null,
            name,
            phone: phoneStored,
            date,
            time,
            duration: 30,
            reason: reasonKind === "text" ? reasonText : "",
            reasonKind,
            audioData,
            status: "requested",
            address: doctor.address,
            mapUrl: doctor.mapUrl,
          },
        });
        return Response.json(
          {
            ok: true,
            kind: "doctor",
            status: "requested",
            code: booking.code,
            statusUrl: `/bron/holat?code=${encodeURIComponent(booking.code)}`,
            doctorName: doctor.name,
            date,
            time,
          },
          { status: 201, headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        if (isUniqueError(error) && attempt < 4) continue;
        throw error;
      }
    }

    return jsonError("booking_failed", 409);
  });
}
