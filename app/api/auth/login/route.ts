import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, createToken } from "@/lib/jwt";
import { clear, clientIp, hit, tooMany } from "@/lib/rate-limit";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) return jsonError("Email va parolni kiriting");

  const key = `login:${clientIp(req)}:${email}`;
  const limit = hit(key, 10, 15 * 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return jsonError("Email yoki parol noto'g'ri", 401);
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return jsonError("Email yoki parol noto'g'ri", 401);
  clear(key);

  const token = await createToken({
    uid: user.id,
    cid: user.clinicId,
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

  return Response.json({
    ok: true,
    role: user.role,
    redirect: user.role === "super" ? "/admin" : "/app",
  });
}
