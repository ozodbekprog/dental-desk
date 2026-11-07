import { createToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, tooMany } from "@/lib/rate-limit";
import { jsonError } from "@/lib/util";
import {
  asString,
  hashEquals,
  isValidPhone,
  normalizePhone,
  otpHash,
  parseJson,
  setPatientCookie,
} from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const limit = hit(`pverify:${clientIp(req)}`, 20, 15 * 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("bad_request", 400);

  const phone = normalizePhone((body as Record<string, unknown>).phone);
  const code = String((body as Record<string, unknown>).code ?? "").replace(/\D+/g, "");
  if (!isValidPhone(phone)) return jsonError("enter_phone", 400);
  if (!/^\d{6}$/.test(code)) return jsonError("enter_code", 400);

  const account = await prisma.patientAccount.findUnique({ where: { phone } });
  if (!account || !account.otpHash || !account.otpExpiresAt) {
    return jsonError("code_expired", 400);
  }
  if (account.otpAttempts >= MAX_ATTEMPTS) {
    return jsonError("too_many_attempts", 429);
  }
  if (account.otpExpiresAt.getTime() < Date.now()) {
    return jsonError("code_expired", 400);
  }

  if (!hashEquals(account.otpHash, otpHash(phone, code))) {
    await prisma.patientAccount.update({
      where: { id: account.id },
      data: { otpAttempts: { increment: 1 } },
    });
    return jsonError("code_invalid", 400);
  }

  // Link every clinic record that already carries this phone number.
  const patientRecords = await prisma.record.findMany({
    where: { collection: "patients" },
    select: { clinicId: true, docId: true, data: true },
  });
  const matches: { clinicId: string; recordId: string; name: string }[] = [];
  for (const row of patientRecords) {
    const data = parseJson(row.data);
    if (normalizePhone(data.phone) !== phone) continue;
    matches.push({ clinicId: row.clinicId, recordId: row.docId, name: asString(data.name) });
  }

  const name = account.name || matches.find((m) => m.name)?.name || "";

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      otpHash: "",
      otpExpiresAt: null,
      otpAttempts: 0,
      lastLoginAt: new Date(),
      ...(account.name || !name ? {} : { name }),
    },
  });

  for (const match of matches) {
    await prisma.patientClinicLink.upsert({
      where: {
        clinicId_recordId: { clinicId: match.clinicId, recordId: match.recordId },
      },
      create: {
        patientId: account.id,
        clinicId: match.clinicId,
        recordId: match.recordId,
      },
      update: { patientId: account.id },
    });
  }

  const token = await createToken({
    uid: account.id,
    cid: null,
    role: "patient",
    name,
    email: "",
  });
  await setPatientCookie(token);

  return Response.json(
    {
      ok: true,
      patient: { name, phone },
      links: matches.length,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
