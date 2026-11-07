import { cookies } from "next/headers";
import { PATIENT_COOKIE } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  jar.delete(PATIENT_COOKIE);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
