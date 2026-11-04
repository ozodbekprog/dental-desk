import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { demoRecords } from "@/lib/demo";
import { COOKIE_NAME, createToken } from "@/lib/jwt";
import { clientIp, hit, tooMany } from "@/lib/rate-limit";
import { jsonError, slugify } from "@/lib/util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limit = hit(`signup:${clientIp(req)}`, 5, 60 * 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const body = await req.json().catch(() => null);
  const clinicName = String(body?.clinicName ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const withDemo = body?.demo !== false;

  if (clinicName.length < 2) return jsonError("Klinika nomini kiriting");
  if (name.length < 2) return jsonError("Ismingizni kiriting");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonError("Email noto'g'ri");
  if (password.length < 8) return jsonError("Parol kamida 8 belgidan iborat bo'lsin");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("Bu email allaqachon ro'yxatdan o'tgan", 409);

  let slug = slugify(clinicName);
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.clinic.findUnique({ where: { slug } });
    if (!clash) break;
    slug = `${slugify(clinicName)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const clinic = await prisma.clinic.create({
    data: {
      name: clinicName,
      slug,
      plan: "trial",
      status: "active",
      trialEndsAt: new Date(Date.now() + 14 * 86400000),
    },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { clinicId: clinic.id, email, passwordHash, name, role: "owner" },
  });

  if (withDemo) {
    const records = demoRecords();
    await prisma.record.createMany({
      data: records.map((r) => ({
        clinicId: clinic.id,
        collection: r.collection,
        docId: r.docId,
        data: JSON.stringify(r.data),
      })),
    });
  }

  const token = await createToken({
    uid: user.id,
    cid: clinic.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 86400,
  });

  return Response.json({ ok: true });
}
