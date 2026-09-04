import { NextRequest, NextResponse } from "next/server";

const TERMS_PROTECTED = ["/game", "/api/spin"];
const ADMIN_PROTECTED = ["/api/admin"];
const ADMIN_LOGIN_PATH = "/api/admin/login";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ADMIN_PROTECTED.some((p) => pathname.startsWith(p)) && pathname !== ADMIN_LOGIN_PATH) {
    const isAdmin = req.cookies.get("sim_admin")?.value === "1";
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (TERMS_PROTECTED.some((p) => pathname.startsWith(p))) {
    const accepted = req.cookies.get("sim_terms_accepted")?.value === "1";
    if (!accepted) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Terms not accepted" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/game/:path*", "/api/spin/:path*", "/api/admin/:path*"],
};
