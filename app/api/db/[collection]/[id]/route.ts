import { clinicContext } from "@/lib/api";
import { canWriteRole, clinicWritable } from "@/lib/auth";
import type { SessionUser } from "@/lib/jwt";
import { collectionAllowed, patientCap } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { CALL_CENTER_HIDDEN, complaintVisibleTo, isCollection, jsonError } from "@/lib/util";
import type { Clinic } from "@prisma/client";

export const runtime = "nodejs";

type Params = { params: Promise<{ collection: string; id: string }> };

function readBody(body: unknown, wrapped: boolean): { data: Record<string, unknown> } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = wrapped ? (body as { data?: unknown }).data : body;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (JSON.stringify(raw).length > 512 * 1024) return null;
  return { data: raw as Record<string, unknown> };
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
  const data = JSON.parse(row.data);
  if (collection === "complaints" && !complaintVisibleTo(data, ctx.session.uid)) {
    return jsonError("not_found", 404);
  }
  return Response.json({ exists: true, data });
}

export async function PUT(req: Request, { params }: Params) {
  const { collection, id } = await params;
  const ctx = await guard(collection);
  if ("error" in ctx) return ctx.error;
  const denied = writeDenied(ctx.session, ctx.clinic);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const payload = readBody(body, !!(body && typeof body === "object" && "data" in (body as object)));
  if (!payload) return jsonError("invalid_data");

  const docId = decodeURIComponent(id).slice(0, 200);
  if (collection === "complaints") {
    const note = payload.data;
    if (typeof note.text === "string") note.text = note.text.slice(0, 2000);
    if (typeof note.audioData === "string" && note.audioData.length > 1_600_000) {
      return jsonError("invalid_data");
    }
    note.visibility = note.visibility === "clinic" ? "clinic" : "doctor";
    note.visibleToPatient = note.visibleToPatient === true;
    note.authorId = ctx.session.uid;
    note.authorName = ctx.session.name;
    note.authorRole = ctx.session.role;
    if (typeof note.at !== "number") note.at = Date.now();
  }
  if (collection === "patients") {
    const exists = await prisma.record.findUnique({
      where: { clinicId_collection_docId: { clinicId: ctx.clinic.id, collection, docId } },
      select: { id: true },
    });
    if (!exists) {
      const count = await prisma.record.count({ where: { clinicId: ctx.clinic.id, collection } });
      if (count >= patientCap(ctx.clinic.plan)) return jsonError("patient_limit", 403);
    }
  }
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

  const patchBody = await req.json().catch(() => null);
  const payload = readBody(patchBody, !!(patchBody && typeof patchBody === "object" && "data" in (patchBody as object)));
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
  if (collection === "complaints") {
    if (current.authorId !== ctx.session.uid) return jsonError("forbidden", 403);
    if (payload.data.visibility !== undefined) {
      payload.data.visibility = payload.data.visibility === "clinic" ? "clinic" : "doctor";
    }
    if (payload.data.visibleToPatient !== undefined) {
      payload.data.visibleToPatient = payload.data.visibleToPatient === true;
    }
    delete payload.data.authorId;
    delete payload.data.authorName;
    delete payload.data.authorRole;
    delete payload.data.at;
  }
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
  if (collection === "complaints") {
    const row = await prisma.record.findUnique({
      where: {
        clinicId_collection_docId: { clinicId: ctx.clinic.id, collection, docId },
      },
      select: { data: true },
    });
    if (row) {
      const note = JSON.parse(row.data) as Record<string, unknown>;
      if (note.authorId !== ctx.session.uid) return jsonError("forbidden", 403);
    }
  }
  await prisma.record.deleteMany({
    where: { clinicId: ctx.clinic.id, collection, docId },
  });
  return Response.json({ ok: true });
}
