import { emptyCounts } from "@/components/doctor/types";
import { doctorCounts, NO_STORE, requireDoctor, toProfileDTO } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Session doctor + profile + queue counters. */
export async function GET() {
  const ctx = await requireDoctor();
  if (!ctx.ok) return ctx.error;

  if (!ctx.profile) {
    return Response.json(
      { ok: true, profile: null, counts: emptyCounts() },
      { headers: NO_STORE }
    );
  }

  const counts = await doctorCounts(ctx.profile.id);
  return Response.json(
    { ok: true, profile: toProfileDTO(ctx.profile), counts },
    { headers: NO_STORE }
  );
}
