import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from './lib/config';
import { ACCESS_COOKIE, REFRESH_COOKIE, COOKIE_OPTIONS } from './lib/session';
import { isJwtExpired } from './lib/jwt';

// Runs before every /dashboard/** request (Next.js 16 renamed
// `middleware` to `proxy`). Two jobs:
//  1. Gate access: no valid session -> redirect to /login.
//  2. Keep the access token fresh: if it's expired (or about to be) and a
//     refresh token is present, rotate it here — this is the one place in
//     the app allowed to rewrite the session cookies mid-request, since
//     Server Components can only read cookies, not write them.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return redirectToLogin(request);
  }

  if (accessToken && !isJwtExpired(accessToken)) {
    return NextResponse.next();
  }

  // Access token missing or expired — attempt a silent refresh.
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return redirectToLogin(request, true);
    }

    const data: { accessToken: string; refreshToken: string } = await res.json();
    const response = NextResponse.next();
    response.cookies.set(ACCESS_COOKIE, data.accessToken, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30 });
    response.cookies.set(REFRESH_COOKIE, data.refreshToken, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return redirectToLogin(request, true);
  }
}

function redirectToLogin(request: NextRequest, clearCookies = false) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', request.nextUrl.pathname);
  const response = NextResponse.redirect(url);
  if (clearCookies) {
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
  }
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
