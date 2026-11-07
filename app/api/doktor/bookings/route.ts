import { doctorCounts, listDoctorBookings, NO_STORE, requireDoctor } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only the signed-in doctor's own network bookings. */
export async function GET() {
  const ctx = await requireDoctor();
  if (!ctx.ok) return ctx.error;

  if (!ctx.profile) {
    return Response.json({ ok: true, bookings: [], counts: null }, { headers: NO_STORE });
  }

  const [bookings, counts] = await Promise.all([
    listDoctorBookings(ctx.profile.id),
    doctorCounts(ctx.profile.id),
  ]);
  return Response.json({ ok: true, bookings, counts }, { headers: NO_STORE });
}
