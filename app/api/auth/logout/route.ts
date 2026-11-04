import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/jwt";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  return Response.json({ ok: true });
}
