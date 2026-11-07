import { prisma } from "@/lib/prisma";
import { digits } from "@/lib/network";
import { NO_STORE, requireDoctor, toProfileDTO } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRICE_MAX = 100_000_000;
const BIO_MAX = 1000;
const ADDRESS_MAX = 200;
const MAP_MAX = 500;
const PHONE_MAX = 40;

const MESSAGES = {
  address_required: "Qabul manzilini kiriting — bemor shu manzilga keladi.",
  address_long: `Manzil ${ADDRESS_MAX} belgidan oshmasin.`,
  map_invalid: "Xarita havolasi http:// yoki https:// bilan boshlanishi kerak.",
  map_long: `Havola ${MAP_MAX} belgidan oshmasin.`,
  phone_invalid: "Telefon raqamini to'g'ri kiriting (9–15 raqam).",
  phone_long: `Telefon raqami ${PHONE_MAX} belgidan oshmasin.`,
  price_invalid: "Narx 0 dan 100 000 000 so'mgacha butun son bo'lsin.",
  bio_long: `Tavsif ${BIO_MAX} belgidan oshmasin.`,
  nothing: "O'zgarish yo'q.",
};

function fail(error: string, message: string, status = 400) {
  return Response.json({ error, message }, { status, headers: NO_STORE });
}

/** The doctor edits only the public-facing fields of their own profile. */
export async function PATCH(req: Request) {
  const ctx = await requireDoctor();
  if (!ctx.ok) return ctx.error;
  if (!ctx.profile) {
    return Response.json(
      { error: "profile_missing", message: "Shifokor profili topilmadi." },
      { status: 404, headers: NO_STORE }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return fail("invalid_body", "Ma'lumot yuborilmadi.");
  }

  const data: { address?: string; mapUrl?: string; phone?: string; priceFrom?: number; bio?: string } = {};

  if (body.address !== undefined) {
    const address = String(body.address ?? "").trim();
    if (address.length < 5) return fail("address_required", MESSAGES.address_required);
    if (address.length > ADDRESS_MAX) return fail("address_long", MESSAGES.address_long);
    data.address = address;
  }

  if (body.mapUrl !== undefined) {
    const mapUrl = String(body.mapUrl ?? "").trim();
    if (mapUrl) {
      if (!/^https?:\/\//i.test(mapUrl)) return fail("map_invalid", MESSAGES.map_invalid);
      if (mapUrl.length > MAP_MAX) return fail("map_long", MESSAGES.map_long);
    }
    data.mapUrl = mapUrl;
  }

  if (body.phone !== undefined) {
    const phone = String(body.phone ?? "").trim();
    if (phone.length > PHONE_MAX) return fail("phone_long", MESSAGES.phone_long);
    const count = digits(phone).length;
    if (!phone || count < 9 || count > 15) return fail("phone_invalid", MESSAGES.phone_invalid);
    data.phone = phone;
  }

  if (body.priceFrom !== undefined) {
    const raw = body.priceFrom;
    const price = typeof raw === "string" ? Number(raw.replace(/\s+/g, "")) : Number(raw);
    if (!Number.isInteger(price) || price < 0 || price > PRICE_MAX) {
      return fail("price_invalid", MESSAGES.price_invalid);
    }
    data.priceFrom = price;
  }

  if (body.bio !== undefined) {
    const bio = String(body.bio ?? "").trim();
    if (bio.length > BIO_MAX) return fail("bio_long", MESSAGES.bio_long);
    data.bio = bio;
  }

  if (Object.keys(data).length === 0) return fail("nothing_to_update", MESSAGES.nothing);

  const updated = await prisma.doctorProfile.update({
    where: { id: ctx.profile.id },
    data,
  });

  return Response.json({ ok: true, profile: toProfileDTO(updated) }, { headers: NO_STORE });
}
