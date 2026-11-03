import { NextResponse, type NextRequest } from 'next/server';
import { adminSessionCookieName, getAdminCookieOptions, revokeAdminSession } from '@/lib/adminAuth';
import { errorResponse, getRequestOrigin, verifyRequestOrigin } from '@/lib/apiSecurity';
import { appPaths } from '@/lib/securityPolicy';

export async function POST(request: NextRequest) {
  try {
    verifyRequestOrigin(request);
    await revokeAdminSession(request.cookies.get(adminSessionCookieName)?.value);
    const response = NextResponse.redirect(new URL(appPaths.login, getRequestOrigin(request)), {
      status: 303, headers: { 'Cache-Control': 'no-store' }
    });
    response.cookies.set(adminSessionCookieName, '', { ...getAdminCookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    // Never report successful logout when shared-session revocation failed.
    return errorResponse(error);
  }
}
