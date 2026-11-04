import bcrypt from "bcryptjs";
import { clinicContext } from "@/lib/api";
import { canManageRole } from "@/lib/auth";
import { doctorSeatLimit } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function targetInClinic(clinicId: string, id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.clinicId !== clinicId) return null;
  return user;
}

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await clinicContext();
  if ("error" in ctx) return ctx.error;
  if (!canManageRole(ctx.session.role)) return jsonError("forbidden", 403);

  const { id } = await params;
  const target = await targetInClinic(ctx.clinic.id, id);
  if (!target) return jsonError("not_found", 404);
  if (target.role === "owner" && ctx.session.role !== "owner") return jsonError("forbidden", 403);

  const body = await req.json().catch(() => null);
  const data: { name?: string; role?: string; passwordHash?: string } = {};

  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) return jsonError("Ismni kiriting");
    data.name = name;
  }
  if (body?.password) {
    const password = String(body.password);
    if (password.length < 8) return jsonError("Parol kamida 8 belgi bo'lsin");
    data.passwordHash = await bcrypt.hash(password, 10);
  }
  if (body?.role !== undefined) {
    const role = String(body.role);
    if (!["admin", "doctor", "reception", "callcenter", "viewer"].includes(role)) return jsonError("Rol noto'g'ri");
    if (target.id === ctx.session.uid && target.role === "owner") return jsonError("Egasi rolini o'zgartirib bo'lmaydi");
    if (role === "doctor" && target.role !== "doctor") {
      const limit = doctorSeatLimit(ctx.clinic.plan);
      const doctors = await prisma.user.count({
        where: { clinicId: ctx.clinic.id, role: "doctor" },
      });
      if (doctors >= limit) {
        return jsonError(`Tarif bo'yicha shifokor limiti tugagan (${limit} ta)`, 403);
      }
    }
    data.role = role;
  }

  if (Object.keys(data).length === 0) return jsonError("O'zgarish yo'q");

  const updated = await prisma.user.update({ where: { id: target.id }, data });

  if (updated.role === "doctor") {
    const existing = await prisma.record.findUnique({
      where: {
        clinicId_collection_docId: {
          clinicId: ctx.clinic.id,
          collection: "doctors",
          docId: updated.id,
        },
      },
    });
    const current = existing ? JSON.parse(existing.data) : {};
    const payload = {
      ...current,
      name: updated.name,
      spec: current.spec || "dentist",
      createdAt: current.createdAt || Date.now(),
    };
    await prisma.record.upsert({
      where: {
        clinicId_collection_docId: {
          clinicId: ctx.clinic.id,
          collection: "doctors",
          docId: updated.id,
        },
      },
      create: {
        clinicId: ctx.clinic.id,
        collection: "doctors",
        docId: updated.id,
        data: JSON.stringify(payload),
      },
      update: { data: JSON.stringify(payload) },
    });
  } else {
    await prisma.record.deleteMany({
      where: { clinicId: ctx.clinic.id, collection: "doctors", docId: updated.id },
    });
  }

  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await clinicContext();
  if ("error" in ctx) return ctx.error;
  if (!canManageRole(ctx.session.role)) return jsonError("forbidden", 403);

  const { id } = await params;
  if (id === ctx.session.uid) return jsonError("O'zingizni o'chira olmaysiz");
  const target = await targetInClinic(ctx.clinic.id, id);
  if (!target) return jsonError("not_found", 404);
  if (target.role === "owner") return jsonError("Klinika egasini o'chirib bo'lmaydi");

  await prisma.user.delete({ where: { id: target.id } });
  await prisma.record.deleteMany({
    where: { clinicId: ctx.clinic.id, collection: "doctors", docId: target.id },
  });
  return Response.json({ ok: true });
}
