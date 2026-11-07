import { listDoctors } from "@/lib/network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const doctors = await listDoctors({
    q: url.searchParams.get("q") || "",
    specialty: url.searchParams.get("specialty") || "",
    clinicSlug: url.searchParams.get("clinic") || "",
  });
  return Response.json({ doctors }, { headers: { "Cache-Control": "no-store" } });
}
