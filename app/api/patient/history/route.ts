import { prisma } from "@/lib/prisma";
import {
  asArray,
  asNumber,
  asObject,
  asString,
  normalizePhone,
  parseJson,
  patientSession,
  stringArray,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ToothEntry = {
  date: string;
  proc: string;
  surfaces: string[];
  note: string;
  canal: string;
};

type RequestItem = {
  clinicId: string;
  id: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: string;
};

const OPEN_REQUEST_STATUSES = new Set(["requested", "contacted", "confirmed"]);

function requestStatus(raw: string): string {
  const status = raw.trim().toLowerCase();
  if (!status || status === "new") return "requested";
  return status;
}

function isoDate(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  return asString(value);
}

function softArray(value: unknown): string[] {
  return stringArray(value);
}

export async function GET() {
  const session = await patientSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const account = await prisma.patientAccount.findUnique({ where: { id: session.uid } });
  if (!account) return Response.json({ error: "unauthorized" }, { status: 401 });

  const [links, clinics, bookingRows, networkRows, reviewRows] = await Promise.all([
    prisma.patientClinicLink.findMany({
      where: { patientId: account.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.clinic.findMany({
      select: { id: true, name: true, slug: true, address: true, phone: true, mapUrl: true },
    }),
    prisma.record.findMany({
      where: { collection: { in: ["requests", "reqstate", "doctors"] } },
      select: { clinicId: true, collection: true, docId: true, data: true },
    }),
    prisma.networkBooking.findMany({
      select: {
        id: true,
        code: true,
        phone: true,
        doctorId: true,
        date: true,
        time: true,
        status: true,
        address: true,
        mapUrl: true,
        doctor: { select: { name: true, address: true, mapUrl: true } },
        clinic: { select: { id: true, name: true } },
      },
    }),
    prisma.doctorReview.findMany({
      where: { patientId: account.id, bookingId: { not: null } },
      select: { bookingId: true, rating: true },
    }),
  ]);

  const reviewMap = new Map(
    reviewRows.map((row) => [String(row.bookingId), row.rating] as const)
  );

  const clinicMap = new Map(clinics.map((clinic) => [clinic.id, clinic]));

  // ---- public clinic requests and their statuses (matched by phone) ----
  const doctorNames = new Map<string, string>();
  const requestStates = new Map<string, string>();
  const requestItems: RequestItem[] = [];

  // Doctor names and request states first, so request statuses are known.
  for (const row of bookingRows) {
    const data = parseJson(row.data);
    if (row.collection === "doctors") {
      doctorNames.set(`${row.clinicId}|${row.docId}`, asString(data.name));
    } else if (row.collection === "reqstate") {
      requestStates.set(`${row.clinicId}|${row.docId}`, asString(data.status));
    }
  }

  for (const row of bookingRows) {
    if (row.collection !== "requests") continue;
    const data = parseJson(row.data);

    for (const raw of asArray(data.items)) {
      const item = asObject(raw);
      const id = asString(item.id);
      if (!id) continue;
      if (normalizePhone(item.phone) !== account.phone) continue;

      const rawStatus = requestStates.get(`${row.clinicId}|${id}`) || asString(item.status);
      const status = requestStatus(rawStatus);
      if (!OPEN_REQUEST_STATUSES.has(status)) continue;

      const doctorId = asString(item.doctorId);
      requestItems.push({
        clinicId: row.clinicId,
        id,
        doctorId,
        doctorName:
          asString(item.doctorName) || doctorNames.get(`${row.clinicId}|${doctorId}`) || "",
        date: asString(item.date),
        time: asString(item.time),
        status,
      });
    }
  }

  // ---- per-clinic patient card ----
  const clinicBlocks: unknown[] = [];
  let resolvedName = account.name;

  for (const link of links) {
    const clinic = clinicMap.get(link.clinicId);
    if (!clinic) continue;

    const rows = await prisma.record.findMany({
      where: {
        clinicId: link.clinicId,
        OR: [
          { collection: { in: ["patients", "toothHistory"] }, docId: link.recordId },
          {
            collection: { in: ["visits", "appointments", "complaints"] },
            data: { contains: link.recordId },
          },
        ],
      },
      select: { collection: true, docId: true, data: true },
    });

    const meRow = rows.find(
      (row) => row.collection === "patients" && row.docId === link.recordId
    );
    if (!meRow) continue;
    const meData = parseJson(meRow.data);
    if (normalizePhone(meData.phone) !== account.phone) continue;

    if (!resolvedName) resolvedName = asString(meData.name);

    const teeth: Record<string, ToothEntry[]> = {};
    const seen = new Set<string>();
    const addTooth = (fdi: string, entry: ToothEntry) => {
      if (!/^\d{2}$/.test(fdi)) return;
      const key = `${fdi}|${entry.date}|${entry.proc}|${entry.note}|${entry.canal}`;
      if (seen.has(key)) return;
      seen.add(key);
      (teeth[fdi] = teeth[fdi] || []).push(entry);
    };

    for (const row of rows) {
      if (row.collection !== "toothHistory" || row.docId !== link.recordId) continue;
      const history = asObject(parseJson(row.data).teeth);
      for (const [fdi, list] of Object.entries(history)) {
        for (const raw of asArray(list)) {
          const entry = asObject(raw);
          addTooth(fdi, {
            date: asString(entry.date),
            proc: asString(entry.proc),
            surfaces: softArray(entry.surfaces),
            note: asString(entry.note),
            canal: asString(entry.canal),
          });
        }
      }
    }

    const visits = rows
      .filter((row) => row.collection === "visits")
      .map((row) => ({ id: row.docId, data: parseJson(row.data) }))
      .filter(({ data }) => asString(data.patientId) === link.recordId)
      .map(({ id, data }) => {
        const procedures = asArray(data.procedures).map((raw) => {
          const proc = asObject(raw);
          const tooth = asNumber(proc.tooth);
          return {
            type: asString(proc.type),
            tooth,
            surfaces: softArray(proc.surfaces),
            price: asNumber(proc.price) ?? 0,
            note: asString(proc.note),
          };
        });
        for (const proc of procedures) {
          if (proc.tooth === null) continue;
          addTooth(String(proc.tooth), {
            date: asString(data.date),
            proc: proc.type,
            surfaces: proc.surfaces,
            note: proc.note,
            canal: "",
          });
        }
        return {
          id,
          date: asString(data.date),
          time: asString(data.time),
          doctorName: asString(data.doctorName),
          reason: asString(data.reason),
          reasonOther: asString(data.reasonOther),
          procedures,
          notes: asString(data.notes),
          total: asNumber(data.total) ?? 0,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    for (const fdi of Object.keys(teeth)) {
      teeth[fdi].sort((a, b) => b.date.localeCompare(a.date));
    }

    const appointments = rows
      .filter((row) => row.collection === "appointments")
      .map((row) => ({ id: row.docId, data: parseJson(row.data) }))
      .filter(({ data }) => asString(data.patientId) === link.recordId)
      .map(({ id, data }) => ({
        id,
        date: asString(data.date),
        time: asString(data.time),
        doctorName: asString(data.doctorName),
        reason: asString(data.reason),
        reasonOther: asString(data.reasonOther),
        status: asString(data.status) || "scheduled",
      }))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

    const complaints = rows
      .filter((row) => row.collection === "complaints")
      .map((row) => ({ id: row.docId, data: parseJson(row.data) }))
      .filter(
        ({ data }) =>
          asString(data.patientId) === link.recordId && data.visibleToPatient !== false
      )
      .map(({ id, data }) => {
        const audio = asString(data.audioData);
        const tooth = asNumber(data.tooth);
        return {
          id,
          tooth,
          visitId: asString(data.visitId),
          text: asString(data.text),
          authorName: asString(data.authorName),
          at: isoDate(data.at),
          hasAudio: !!audio,
          audioData: audio && audio.length <= 300_000 ? audio : "",
        };
      })
      .sort((a, b) => b.at.localeCompare(a.at));

    const requests = requestItems
      .filter((item) => item.clinicId === link.clinicId)
      .map((item) => ({
        id: item.id,
        doctorName: item.doctorName,
        date: item.date,
        time: item.time,
        status: item.status,
        clinicName: clinic.name,
        ...(item.status === "confirmed"
          ? { address: clinic.address, mapUrl: clinic.mapUrl }
          : {}),
      }))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

    clinicBlocks.push({
      clinic: {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        address: clinic.address,
        phone: clinic.phone,
        mapUrl: clinic.mapUrl,
      },
      me: {
        recordId: link.recordId,
        name: asString(meData.name),
        phone: asString(meData.phone),
        dob: asString(meData.dob),
        alerts: asString(meData.alerts),
        alertIds: softArray(meData.alertIds),
      },
      teeth,
      visits,
      appointments,
      complaints,
      requests,
    });
  }

  // ---- unified bookings: network doctor bookings + clinic requests ----
  const doctorBookings = networkRows
    .filter((row) => normalizePhone(row.phone) === account.phone)
    .map((row) => {
      const confirmed = row.status === "confirmed";
      const reviewRating = reviewMap.get(row.id) || 0;
      return {
        id: row.id,
        kind: "doctor" as const,
        code: row.code,
        status: row.status,
        doctorId: row.doctorId,
        doctorName: row.doctor?.name || "",
        date: row.date,
        time: row.time,
        clinicName: row.clinic?.name || "",
        reviewed: reviewRating > 0,
        reviewRating,
        ...(confirmed
          ? {
              address: row.address || row.doctor?.address || "",
              mapUrl: row.mapUrl || row.doctor?.mapUrl || "",
            }
          : {}),
      };
    });

  const clinicBookings = requestItems.map((item) => {
    const clinic = clinicMap.get(item.clinicId);
    return {
      id: item.id,
      kind: "clinic" as const,
      code: "",
      status: item.status,
      doctorName: item.doctorName,
      date: item.date,
      time: item.time,
      clinicName: clinic?.name || "",
      ...(item.status === "confirmed"
        ? { address: clinic?.address || "", mapUrl: clinic?.mapUrl || "" }
        : {}),
    };
  });

  const bookings = [...doctorBookings, ...clinicBookings].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );

  return Response.json(
    {
      patient: { name: resolvedName || "", phone: account.phone },
      clinics: clinicBlocks,
      bookings,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
