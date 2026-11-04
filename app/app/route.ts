import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response(null, { status: 307, headers: { Location: "/login" } });
  }
  if (!session.cid) {
    return new Response(null, { status: 307, headers: { Location: "/admin" } });
  }

  const html = await readFile(path.join(process.cwd(), "content", "app.html"), "utf8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
