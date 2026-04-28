import { NextRequest, NextResponse } from 'next/server';
import { decodeJwtPayload, isTokenExpired } from '@/lib/jwt';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;
  const workshopPath = pathname.startsWith('/workshops');
  const authPath =
    pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register');
  const rootPath = pathname === '/';

  if (!token) {
    if (workshopPath || rootPath) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    return NextResponse.next();
  }

  const payload = decodeJwtPayload(token);
  if (!payload || isTokenExpired(payload)) {
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('accessToken');
    return response;
  }

  if (authPath || rootPath) {
    return NextResponse.redirect(new URL('/workshops', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/workshops/:path*', '/auth/:path*'],
};
