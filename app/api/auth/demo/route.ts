import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { COOKIE_NAME, createToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, tooMany } from "@/lib/rate-limit";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";

const DEMO_ROLES = [
  "owner",
  "admin",
  "doctor",
  "independent",
  "reception",
  "callcenter",
  "viewer",
  "super",
] as const;

type DemoRole = (typeof DEMO_ROLES)[number];

const CLINIC_PROFILES: Record<
  Exclude<DemoRole, "owner" | "independent" | "super">,
  { role: string; name: string; email: string }
> = {
  admin: { role: "admin", name: "Dilnoza Yusupova", email: "admin@demo.dentaldesk.uz" },
  doctor: { role: "doctor", name: "Dr. Aziza Karimova", email: "aziza@demo.dentaldesk.uz" },
  reception: { role: "reception", name: "Nodira Qodirova", email: "reception@demo.dentaldesk.uz" },
  callcenter: { role: "callcenter", name: "Jasur Toshmatov", email: "callcenter@demo.dentaldesk.uz" },
  viewer: { role: "viewer", name: "Kuzatuvchi", email: "viewer@demo.dentaldesk.uz" },
};

async function ensureUser(data: {
  email: string;
  role: string;
  name: string;
  clinicId: string | null;
  id?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    if (existing.role !== data.role || existing.clinicId !== data.clinicId) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { role: data.role, clinicId: data.clinicId, name: data.name },
      });
    }
    return existing;
  }
  return prisma.user.create({
    data: { ...data, passwordHash: await bcrypt.hash(randomUUID(), 10) },
  });
}

async function resolveDemoUser(role: DemoRole, clinicId: string, clinicName: string) {
  if (role === "super") {
    const existing = await prisma.user.findFirst({
      where: { role: "super", clinicId: null },
      orderBy: { createdAt: "asc" },
    });
    if (existing) return existing;
    return ensureUser({
      email: (process.env.ADMIN_EMAIL || "admin@dentaldesk.uz").toLowerCase().trim(),
      role: "super",
      name: "Super Admin",
      clinicId: null,
    });
  }

  if (role === "owner") {
    const existing = await prisma.user.findFirst({
      where: { clinicId, role: "owner" },
      orderBy: { createdAt: "asc" },
    });
    if (existing) return existing;
    return ensureUser({
      email: "owner@demo.dentaldesk.uz",
      role: "owner",
      name: clinicName,
      clinicId,
    });
  }

  if (role === "independent") {
    const existing = await prisma.user.findUnique({ where: { email: "doktor@demo.uz" } });
    if (existing) return existing;
    return ensureUser({
      email: "doktor@demo.uz",
      role: "doctor",
      name: "Dr. Sardor Aliyev",
      clinicId: null,
    });
  }

  const profile = CLINIC_PROFILES[role];
  // Reuse the demo clinic's doctor record id so "mening qabullarim" filters correctly.
  return ensureUser({
    ...profile,
    clinicId,
    id: role === "doctor" ? "dd-demo-d1" : undefined,
  });
}

async function demoLogin(role: DemoRole) {
  const clinic = await prisma.clinic.findUnique({ where: { slug: "demo" } });
  if (!clinic) return jsonError("demo_not_found", 404);

  const user = await resolveDemoUser(role, clinic.id, clinic.name);

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
    maxAge: 2 * 3600,
  });

  return Response.json({
    ok: true,
    role: user.role,
    redirect:
      user.role === "super"
        ? "/admin"
        : user.role === "doctor" && !user.clinicId
          ? "/doktor"
          : "/app",
  });
}

export async function POST(req: Request) {
  if (process.env.DEMO_ENABLED === "false") return jsonError("demo_disabled", 403);

  const body = await req.json().catch(() => null);
  const role = String(body?.role ?? "owner") as DemoRole;
  if (!DEMO_ROLES.includes(role)) return jsonError("role_not_found", 400);

  // local checks log in repeatedly from one address; the budget only guards the public instance
  if (process.env.NODE_ENV !== "production") return demoLogin(role);

  const limit = hit(`demo:${clientIp(req)}`, 400, 60 * 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);
  return demoLogin(role);
}
