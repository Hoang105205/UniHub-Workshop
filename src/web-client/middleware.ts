import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload, isTokenExpired } from "@/lib/jwt";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("accessToken")?.value;
  const workshopPath = pathname.startsWith("/workshops");
  const adminPath = pathname.startsWith("/admin");
  const authPath =
    pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register");
  const rootPath = pathname === "/";

  if (!token) {
    if (workshopPath || adminPath || rootPath) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    return NextResponse.next();
  }

  const payload = decodeJwtPayload(token);
  if (!payload || isTokenExpired(payload)) {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    response.cookies.delete("accessToken");
    return response;
  }

  // Check admin access
  if (adminPath && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  if (workshopPath && payload.role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (authPath || rootPath) {
    return NextResponse.redirect(new URL("/workshops", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/workshops/:path*",
    "/auth/:path*",
    "/admin/:path*",
    "/forbidden",
  ],
};
