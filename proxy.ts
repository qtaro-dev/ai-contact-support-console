import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminSessionCookieName, isValidAdminSession } from '@/lib/adminAuth';

export async function proxy(request: NextRequest) {
  const sessionValue = request.cookies.get(adminSessionCookieName)?.value;
  const isAuthenticated = await isValidAdminSession(sessionValue);

  if (isAuthenticated) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/admin-login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/settings/:path*']
};
