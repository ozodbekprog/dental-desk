import { prisma } from "@/lib/prisma";
import { NO_STORE, requireDoctor, slotsOverlap, toBookingDTO } from "../../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const CHANGABLE = ["requested", "contacted"];
const NOTE_MAX = 500;

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

/**
 * Confirm or decline one of the doctor's own requests.
 * confirm -> snapshot the profile address and guard against double booking.
 * decline -> keep the optional reason in doctorNote.
 */
export async function PATCH(req: Request, { params }: Params) {
  const ctx = await requireDoctor();
  if (!ctx.ok) return ctx.error;
  if (!ctx.profile) return noStoreJson({ error: "profile_missing", message: "Shifokor profili topilmadi." }, 404);

  const { id } = await params;
  const bookingId = String(id || "").trim().slice(0, 64);
  if (!bookingId) return noStoreJson({ error: "not_found", message: "So'rov topilmadi." }, 404);

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "").trim();
  if (action !== "confirm" && action !== "decline") {
    return noStoreJson({ error: "invalid_action", message: "Amal noto'g'ri." }, 400);
  }

  const noteRaw = body?.note;
  if (noteRaw !== undefined && noteRaw !== null && typeof noteRaw !== "string") {
    return noStoreJson({ error: "invalid_note", message: "Izoh matn bo'lishi kerak." }, 400);
  }
  const note = typeof noteRaw === "string" ? noteRaw.trim() : "";
  if (note.length > NOTE_MAX) {
    return noStoreJson({ error: "note_too_long", message: `Izoh ${NOTE_MAX} belgidan oshmasin.` }, 400);
  }

  const booking = await prisma.networkBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      doctorId: true,
      date: true,
      time: true,
      duration: true,
      status: true,
    },
  });
  // Same answer for "does not exist" and "belongs to another doctor".
  if (!booking || booking.doctorId !== ctx.profile.id) {
    return noStoreJson({ error: "not_found", message: "So'rov topilmadi." }, 404);
  }
  if (!CHANGABLE.includes(booking.status)) {
    return noStoreJson(
      { error: "status_locked", message: "Bu so'rov allaqachon ko'rib chiqilgan." },
      409
    );
  }

  if (action === "confirm") {
    const address = String(ctx.profile.address || "").trim();
    if (!address) {
      return noStoreJson(
        {
          error: "address_required",
          message: "Avval Profil bo'limida qabul manzilini kiriting.",
        },
        400
      );
    }

    const sameDay = await prisma.networkBooking.findMany({
      where: {
        doctorId: ctx.profile.id,
        date: booking.date,
        status: "confirmed",
        id: { not: booking.id },
      },
      select: { time: true, duration: true },
    });
    const clash = sameDay.some((item) =>
      slotsOverlap(item.time, item.duration, booking.time, booking.duration)
    );
    if (clash) {
      return noStoreJson(
        {
          error: "slot_taken",
          message: "Bu vaqtda boshqa tasdiqlangan qabul bor. Bemorga boshqa vaqt taklif qiling.",
        },
        409
      );
    }

    const updated = await prisma.networkBooking.update({
      where: { id: booking.id },
      data: {
        status: "confirmed",
        confirmedAt: new Date(),
        address,
        mapUrl: ctx.profile.mapUrl || "",
        ...(note ? { doctorNote: note } : {}),
      },
      include: { clinic: { select: { name: true } } },
    });
    return noStoreJson({ ok: true, booking: toBookingDTO(updated) });
  }

  const updated = await prisma.networkBooking.update({
    where: { id: booking.id },
    data: { status: "declined", doctorNote: note },
    include: { clinic: { select: { name: true } } },
  });
  return noStoreJson({ ok: true, booking: toBookingDTO(updated) });
}

export async function GET(_req: Request, { params }: Params) {
  const ctx = await requireDoctor();
  if (!ctx.ok) return ctx.error;
  if (!ctx.profile) return noStoreJson({ error: "profile_missing" }, 404);

  const { id } = await params;
  const booking = await prisma.networkBooking.findUnique({
    where: { id: String(id || "").slice(0, 64) },
    include: { clinic: { select: { name: true } } },
  });
  if (!booking || booking.doctorId !== ctx.profile.id) {
    return noStoreJson({ error: "not_found" }, 404);
  }
  return noStoreJson({ ok: true, booking: toBookingDTO(booking) });
}
