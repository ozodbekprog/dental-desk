import bcrypt from "bcryptjs";
import { clinicContext } from "@/lib/api";
import { canManageRole } from "@/lib/auth";
import { doctorSeatLimit } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";

const ROLES = ["admin", "doctor", "reception", "callcenter", "viewer"];

export async function GET() {
  const ctx = await clinicContext();
  if ("error" in ctx) return ctx.error;

  const users = await prisma.user.findMany({
    where: { clinicId: ctx.clinic.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ users });
}

export async function POST(req: Request) {
  const ctx = await clinicContext();
  if ("error" in ctx) return ctx.error;
  if (!canManageRole(ctx.session.role)) return jsonError("forbidden", 403);

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = String(body?.role ?? "doctor");
  const spec = String(body?.spec ?? "dentist");

  if (name.length < 2) return jsonError("Ismni kiriting");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonError("Email noto'g'ri");
  if (password.length < 8) return jsonError("Parol kamida 8 belgi bo'lsin");
  if (!ROLES.includes(role)) return jsonError("Rol noto'g'ri");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("Bu email band", 409);

  if (role === "doctor") {
    const limit = doctorSeatLimit(ctx.clinic.plan);
    const doctors = await prisma.user.count({
      where: { clinicId: ctx.clinic.id, role: "doctor" },
    });
    if (doctors >= limit) {
      return jsonError(`Tarif bo'yicha shifokor limiti tugagan (${limit} ta)`, 403);
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { clinicId: ctx.clinic.id, name, email, passwordHash, role },
  });

  if (role === "doctor") {
    await prisma.record.upsert({
      where: {
        clinicId_collection_docId: {
          clinicId: ctx.clinic.id,
          collection: "doctors",
          docId: user.id,
        },
      },
      create: {
        clinicId: ctx.clinic.id,
        collection: "doctors",
        docId: user.id,
        data: JSON.stringify({ name, spec, createdAt: Date.now() }),
      },
      update: { data: JSON.stringify({ name, spec, createdAt: Date.now() }) },
    });
  }

  return Response.json({ ok: true, id: user.id });
}
