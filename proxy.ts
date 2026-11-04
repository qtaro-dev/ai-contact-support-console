import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminSessionCookieName, isValidAdminSession } from '@/lib/adminAuth';
import { errorResponse, getRequestOrigin } from '@/lib/apiSecurity';
import { appPaths } from '@/lib/securityPolicy';

export async function proxy(request: NextRequest) {
  try {
    const sessionValue = request.cookies.get(adminSessionCookieName)?.value;
    const isAuthenticated = await isValidAdminSession(sessionValue);

    if (isAuthenticated) {
      return NextResponse.next();
    }

    const loginUrl = new URL(appPaths.login, getRequestOrigin(request));
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    return errorResponse(error);
  }
}

export const config = {
  matcher: ['/admin/:path*', '/settings/:path*']
};
