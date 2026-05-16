import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminSessionCookieName } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/admin-login', request.url), {
    status: 303
  });
  response.cookies.set(adminSessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });

  return response;
}
