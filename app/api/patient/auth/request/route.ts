import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, tooMany } from "@/lib/rate-limit";
import { jsonError } from "@/lib/util";
import { isValidPhone, normalizePhone, otpHash } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OTP_TTL_MS = 5 * 60_000;
const WINDOW_MS = 15 * 60_000;

export async function POST(req: Request) {
  const ip = clientIp(req);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("bad_request", 400);

  const phone = normalizePhone((body as Record<string, unknown>).phone);
  if (!isValidPhone(phone)) return jsonError("enter_phone", 400);

  // Five codes per phone per address in a 15 minute window.
  const phoneLimit = hit(`potp:${ip}:${phone}`, 5, WINDOW_MS);
  if (!phoneLimit.ok) return tooMany(phoneLimit.retryAfter);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const existing = await prisma.patientAccount.findUnique({ where: { phone } });
  if (existing) {
    await prisma.patientAccount.update({
      where: { id: existing.id },
      data: { otpHash: otpHash(phone, code), otpExpiresAt: expiresAt, otpAttempts: 0 },
    });
  } else {
    await prisma.patientAccount.create({
      data: {
        phone,
        otpHash: otpHash(phone, code),
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
      },
    });
  }

  // Until a real SMS provider is connected the code is shown on screen.
  const demo = !process.env.SMS_API_KEY;

  return Response.json(
    {
      ok: true,
      phone,
      expiresIn: Math.round(OTP_TTL_MS / 1000),
      ...(demo ? { demo: true, devCode: code } : {}),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
