import { getBookingByCode, getClinicRequestStatus } from "@/lib/network";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["requested", "contacted", "confirmed", "declined", "cancelled"] as const;

function normalizeStatus(value: string): string {
  const status = String(value || "").toLowerCase();
  if ((STATUSES as readonly string[]).includes(status)) return status;
  if (status === "completed" || status === "done") return "confirmed";
  if (status === "no-show" || status === "missing") return "declined";
  return "requested";
}

/**
 * Public status endpoint for a booking request.
 * PRIVACY: the exact address / map link is only exposed after confirmation.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = String(url.searchParams.get("code") || "").trim();
  const slug = String(url.searchParams.get("clinic") || "").trim();
  const requestId = String(url.searchParams.get("request") || "").trim();
  const headers = { "Cache-Control": "no-store" } as const;

  if (code) {
    const row = await getBookingByCode(code);
    if (!row) return jsonError("not_found", 404);
    const status = normalizeStatus(row.status);
    const confirmed = status === "confirmed";
    return Response.json(
      {
        booking: {
          kind: "doctor",
          code: row.code,
          status,
          name: row.name,
          phone: row.phone,
          doctorName: row.doctor ? row.doctor.name : "",
          doctorSpecialty: row.doctor ? row.doctor.specialty : "",
          date: row.date,
          time: row.time,
          duration: row.duration,
          reason: row.reason,
          reasonKind: row.reasonKind,
          clinicName: row.clinic ? row.clinic.name : "",
          // getBookingByCode does not select the clinic phone, so fall back to the doctor.
          clinicPhone: row.doctor ? row.doctor.phone : "",
          address: confirmed ? row.address || (row.clinic ? row.clinic.address : "") : "",
          mapUrl: confirmed ? row.mapUrl || (row.clinic ? row.clinic.mapUrl : "") : "",
          confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
        },
      },
      { headers }
    );
  }

  if (slug && requestId) {
    const row = await getClinicRequestStatus(slug, requestId);
    if (!row) return jsonError("not_found", 404);
    const status = normalizeStatus(row.status);
    const confirmed = status === "confirmed";
    return Response.json(
      {
        booking: {
          kind: "clinic",
          requestId: row.id,
          status,
          name: row.name,
          phone: row.phone,
          doctorName: row.doctorName,
          doctorSpecialty: "",
          date: row.date,
          time: row.time,
          duration: row.duration,
          reason: row.reason,
          reasonKind: row.reasonKind,
          clinicName: row.clinic.name,
          clinicSlug: row.clinic.slug,
          clinicPhone: row.clinic.phone,
          address: confirmed ? row.address || row.clinic.address : "",
          mapUrl: confirmed ? row.mapUrl || row.clinic.mapUrl : "",
          confirmedAt: null,
        },
      },
      { headers }
    );
  }

  return jsonError("bad_request", 400);
}
