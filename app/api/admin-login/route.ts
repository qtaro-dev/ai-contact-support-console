import { NextRequest, NextResponse } from 'next/server';
import { adminSessionCookieName, createAdminSessionValue, getAdminCookieOptions, verifyAdminPassword } from '@/lib/adminAuth';
import { ApiError, errorResponse, getRequestOrigin, readLimitedBody, verifyRequestOrigin } from '@/lib/apiSecurity';
import { appPaths, getSafeRedirectPath, securityPolicy } from '@/lib/securityPolicy';

export async function POST(request: NextRequest) {
  try {
    verifyRequestOrigin(request);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') {
      throw new ApiError('unsupportedMediaType', 415);
    }
    const body = await readLimitedBody(request, securityPolicy.loginMaxBytes,
      AbortSignal.any([request.signal, AbortSignal.timeout(securityPolicy.bodyTimeoutMs)]));
    const form = new URLSearchParams(body);
    if (form.getAll('password').length !== 1 || form.getAll('redirect').length > 1) {
      throw new ApiError('invalidRequest', 400);
    }
    const redirectPath = getSafeRedirectPath(form.get('redirect'));
    const loginError = (code: string) => {
      const url = new URL(appPaths.login, getRequestOrigin(request));
      url.searchParams.set('error', code);
      url.searchParams.set('redirect', redirectPath);
      return NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'no-store' } });
    };
    if (!verifyAdminPassword(form.get('password') || '')) return loginError('1');
    const session = await createAdminSessionValue();
    if (!session) return loginError('config');
    const response = NextResponse.redirect(new URL(redirectPath, getRequestOrigin(request)), {
      status: 303, headers: { 'Cache-Control': 'no-store' }
    });
    response.cookies.set(adminSessionCookieName, session, getAdminCookieOptions());
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
