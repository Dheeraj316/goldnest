import 'server-only';
import { cookies } from 'next/headers';

// Tokens live only in httpOnly cookies — never in localStorage or a client
// store — so a client-side XSS bug can't exfiltrate them. Every backend call
// is made from Next.js server code (Server Components / Actions / Route
// Handlers), which is also why this app never needs CORS configuration on
// the backend for its own traffic.
export const ACCESS_COOKIE = 'gn_at';
export const REFRESH_COOKIE = 'gn_rt';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value;
}

export async function setSessionCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30 });
  store.set(REFRESH_COOKIE, refreshToken, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
