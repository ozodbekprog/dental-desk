import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (session.role !== "super") return NextResponse.redirect(new URL("/app", req.url));
    return NextResponse.next();
  }

  if (!session.cid) {
    return NextResponse.redirect(new URL(session.role === "super" ? "/admin" : "/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app", "/settings", "/settings/:path*", "/admin", "/admin/:path*"],
};
