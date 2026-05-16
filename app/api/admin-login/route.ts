import { NextRequest, NextResponse } from 'next/server';
import {
  adminSessionCookieName,
  createAdminSessionValue,
  getAdminCookieOptions,
  verifyAdminPassword
} from '@/lib/adminAuth';

const getSafeRedirectPath = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return '/admin';
  }

  if (value.startsWith('//')) {
    return '/admin';
  }

  return value;
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = formData.get('password');
  const redirectPath = getSafeRedirectPath(formData.get('redirect'));

  if (typeof password !== 'string' || !verifyAdminPassword(password)) {
    const url = new URL('/admin-login', request.url);
    url.searchParams.set('error', '1');
    url.searchParams.set('redirect', redirectPath);
    return NextResponse.redirect(url, { status: 303 });
  }

  const sessionValue = await createAdminSessionValue();

  if (!sessionValue) {
    const url = new URL('/admin-login', request.url);
    url.searchParams.set('error', 'config');
    url.searchParams.set('redirect', redirectPath);
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(redirectPath, request.url), { status: 303 });
  response.cookies.set(adminSessionCookieName, sessionValue, getAdminCookieOptions());

  return response;
}
