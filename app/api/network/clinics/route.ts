import { listClinics } from "@/lib/network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const clinics = await listClinics();
  return Response.json(
    { clinics },
    { headers: { "Cache-Control": "no-store" } }
  );
}
