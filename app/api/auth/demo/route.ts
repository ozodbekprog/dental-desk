import { cookies } from "next/headers";
import { COOKIE_NAME, createToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, tooMany } from "@/lib/rate-limit";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";

async function demoLogin() {
  const clinic = await prisma.clinic.findUnique({ where: { slug: "demo" } });
  if (!clinic) return jsonError("demo_not_found", 404);

  const owner = await prisma.user.findFirst({
    where: { clinicId: clinic.id, role: "owner" },
    orderBy: { createdAt: "asc" },
  });
  if (!owner) return jsonError("demo_not_found", 404);

  const token = await createToken({
    uid: owner.id,
    cid: clinic.id,
    role: owner.role,
    name: owner.name,
    email: owner.email,
  });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 2 * 3600,
  });

  return Response.json({ ok: true, redirect: "/app" });
}

export async function POST(req: Request) {
  if (process.env.DEMO_ENABLED === "false") return jsonError("demo_disabled", 403);
  // local checks log in repeatedly from one address; the budget only guards the public instance
  if (process.env.NODE_ENV !== "production") return demoLogin();

  const limit = hit(`demo:${clientIp(req)}`, 20, 60 * 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);
  return demoLogin();
}
