import { prisma } from "@/lib/prisma";
import { PROCEDURE_MAP, ARCH_UPPER, ARCH_LOWER } from "@/components/doctor/treatments";
import { NO_STORE, requireDoctor, toBookingDTO, toTreatmentDTO } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOTE_MAX = 500;
const MAX_ITEMS = 32;
const VALID_TEETH = new Set([...ARCH_UPPER, ...ARCH_LOWER]);
const VALID_SURFACES = new Set(["O", "M", "D", "B", "L"]);

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

function localDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** All treatments of the signed-in doctor, newest first. */
export async function GET() {
  const ctx = await requireDoctor();
  if (!ctx.ok) return ctx.error;
  if (!ctx.profile) {
    return noStoreJson({ ok: true, treatments: [] });
  }

  const rows = await prisma.treatmentRecord.findMany({
    where: { doctorId: ctx.profile.id },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
  return noStoreJson({ ok: true, treatments: rows.map(toTreatmentDTO) });
}

type DraftItem = { tooth: number; procedure: string; surfaces: string };

/**
 * Save the procedures of one visit. Everything is chosen in the UI; the
 * server only validates the selected catalog keys. Optionally completes
 * the linked confirmed booking in the same transaction.
 */
export async function POST(req: Request) {
  const ctx = await requireDoctor();
  if (!ctx.ok) return ctx.error;
  if (!ctx.profile) {
    return noStoreJson({ error: "profile_missing", message: "Shifokor profili topilmadi." }, 404);
  }

  const body = await req.json().catch(() => null);
  const bookingId = String(body?.bookingId ?? "").trim().slice(0, 64);
  if (!bookingId) {
    return noStoreJson({ error: "booking_required", message: "Bemorni tanlang." }, 400);
  }

  const booking = await prisma.networkBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      doctorId: true,
      name: true,
      phone: true,
      date: true,
      status: true,
    },
  });
  if (!booking || booking.doctorId !== ctx.profile.id) {
    return noStoreJson({ error: "not_found", message: "Bemor topilmadi." }, 404);
  }
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return noStoreJson(
      { error: "status_locked", message: "Bu qabul uchun davolash saqlab bo'lmaydi." },
      409
    );
  }

  const itemsRaw = Array.isArray(body?.items) ? body.items : [];
  if (!itemsRaw.length) {
    return noStoreJson({ error: "items_required", message: "Kamida bitta muolaja tanlang." }, 400);
  }
  if (itemsRaw.length > MAX_ITEMS) {
    return noStoreJson({ error: "too_many_items", message: `Bir tashrifda ${MAX_ITEMS} tadan ko'p emas.` }, 400);
  }

  const noteRaw = body?.note;
  if (noteRaw !== undefined && noteRaw !== null && typeof noteRaw !== "string") {
    return noStoreJson({ error: "invalid_note", message: "Izoh matn bo'lishi kerak." }, 400);
  }
  const note = typeof noteRaw === "string" ? noteRaw.trim().slice(0, NOTE_MAX) : "";
  const complete = body?.complete === true;

  const seen = new Set<string>();
  const items: DraftItem[] = [];
  for (const raw of itemsRaw) {
    const procedure = String(raw?.procedure ?? "").trim();
    const def = PROCEDURE_MAP[procedure];
    if (!def) {
      return noStoreJson({ error: "invalid_procedure", message: "Muolaja turi noto'g'ri." }, 400);
    }
    let tooth = Number(raw?.tooth);
    if (def.needsTooth) {
      if (!VALID_TEETH.has(tooth)) {
        return noStoreJson(
          { error: "invalid_tooth", message: "Tish raqamini 3D sxemadan tanlang." },
          400
        );
      }
    } else {
      tooth = 0;
    }
    let surfaces = "";
    if (def.surfaces && typeof raw?.surfaces === "string") {
      const chars: string[] = String(raw.surfaces).toUpperCase().split("");
      surfaces = Array.from(new Set(chars))
        .filter((ch: string) => VALID_SURFACES.has(ch))
        .join("");
    }
    const key = `${tooth}:${procedure}:${surfaces}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ tooth, procedure, surfaces });
  }
  if (!items.length) {
    return noStoreJson({ error: "items_required", message: "Kamida bitta muolaja tanlang." }, 400);
  }

  const visitId = crypto.randomUUID();
  const date = booking.date || localDate();

  const created = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (const item of items) {
      rows.push(
        await tx.treatmentRecord.create({
          data: {
            visitId,
            doctorId: ctx.profile!.id,
            bookingId: booking.id,
            patientName: booking.name,
            patientPhone: booking.phone,
            date,
            tooth: item.tooth,
            procedure: item.procedure,
            surfaces: item.surfaces,
            note,
          },
        })
      );
    }
    if (complete && booking.status === "confirmed") {
      await tx.networkBooking.update({
        where: { id: booking.id },
        data: { status: "completed" },
      });
    }
    return rows;
  });

  let bookingDTO = null;
  if (complete) {
    const fresh = await prisma.networkBooking.findUnique({
      where: { id: booking.id },
      include: { clinic: { select: { name: true } } },
    });
    if (fresh) bookingDTO = toBookingDTO(fresh);
  }

  return noStoreJson({
    ok: true,
    visitId,
    created: created.length,
    complete: complete && booking.status === "confirmed",
    booking: bookingDTO,
    treatments: created.map(toTreatmentDTO),
  });
}
