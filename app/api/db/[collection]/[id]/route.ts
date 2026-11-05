import { clinicContext } from "@/lib/api";
import { canWriteRole, clinicWritable } from "@/lib/auth";
import type { SessionUser } from "@/lib/jwt";
import { collectionAllowed } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { CALL_CENTER_HIDDEN, isCollection, jsonError } from "@/lib/util";
import type { Clinic } from "@prisma/client";

export const runtime = "nodejs";

type Params = { params: Promise<{ collection: string; id: string }> };

function readBody(body: unknown): { data: Record<string, unknown> } | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (JSON.stringify(data).length > 512 * 1024) return null;
  return { data: data as Record<string, unknown> };
}

async function guard(collection: string) {
  if (!isCollection(collection)) return { error: jsonError("unknown_collection", 404) };
  const ctx = await clinicContext();
  if ("error" in ctx) return ctx;
  // Clinical, financial and HR records stay out of reach for the call centre role.
  if (ctx.session.role === "callcenter" && CALL_CENTER_HIDDEN.includes(collection)) {
    return { error: jsonError("forbidden", 403) };
  }
  if (!collectionAllowed(ctx.clinic.plan, collection)) {
    return { error: jsonError("plan_restricted", 403) };
  }
  return ctx;
}

function writeDenied(session: SessionUser, clinic: Clinic): Response | null {
  if (!canWriteRole(session.role)) return jsonError("read_only", 403);
  if (!clinicWritable(clinic)) return jsonError("trial_expired", 403);
  return null;
}

export async function GET(_req: Request, { params }: Params) {
  const { collection, id } = await params;
  const ctx = await guard(collection);
  if ("error" in ctx) return ctx.error;

  const row = await prisma.record.findUnique({
    where: {
      clinicId_collection_docId: {
        clinicId: ctx.clinic.id,
        collection,
        docId: decodeURIComponent(id),
      },
    },
  });
  if (!row) return Response.json({ exists: false, data: null });
  return Response.json({ exists: true, data: JSON.parse(row.data) });
}

export async function PUT(req: Request, { params }: Params) {
  const { collection, id } = await params;
  const ctx = await guard(collection);
  if ("error" in ctx) return ctx.error;
  const denied = writeDenied(ctx.session, ctx.clinic);
  if (denied) return denied;

  const payload = readBody(await req.json().catch(() => null));
  if (!payload) return jsonError("invalid_data");

  const docId = decodeURIComponent(id).slice(0, 200);
  await prisma.record.upsert({
    where: {
      clinicId_collection_docId: {
        clinicId: ctx.clinic.id,
        collection,
        docId,
      },
    },
    create: {
      clinicId: ctx.clinic.id,
      collection,
      docId,
      data: JSON.stringify(payload.data),
      rev: 1,
    },
    update: {
      data: JSON.stringify(payload.data),
      rev: { increment: 1 },
    },
  });
  return Response.json({ ok: true });
}

export async function PATCH(req: Request, { params }: Params) {
  const { collection, id } = await params;
  const ctx = await guard(collection);
  if ("error" in ctx) return ctx.error;
  const denied = writeDenied(ctx.session, ctx.clinic);
  if (denied) return denied;

  const payload = readBody(await req.json().catch(() => null));
  if (!payload) return jsonError("invalid_data");
  const docId = decodeURIComponent(id).slice(0, 200);

  const row = await prisma.record.findUnique({
    where: {
      clinicId_collection_docId: {
        clinicId: ctx.clinic.id,
        collection,
        docId,
      },
    },
  });
  if (!row) return jsonError("not_found", 404);

  const current = JSON.parse(row.data) as Record<string, unknown>;
  const merged = { ...current, ...payload.data };
  await prisma.record.update({
    where: { id: row.id },
    data: { data: JSON.stringify(merged), rev: { increment: 1 } },
  });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { collection, id } = await params;
  const ctx = await guard(collection);
  if ("error" in ctx) return ctx.error;
  const denied = writeDenied(ctx.session, ctx.clinic);
  if (denied) return denied;

  const docId = decodeURIComponent(id).slice(0, 200);
  await prisma.record.deleteMany({
    where: { clinicId: ctx.clinic.id, collection, docId },
  });
  return Response.json({ ok: true });
}
