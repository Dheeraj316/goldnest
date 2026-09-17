'use server';

import { redirect } from 'next/navigation';
import { API_URL } from '../config';
import { setSessionCookies, clearSessionCookies, getAccessToken } from '../session';

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get('identifier') || '').trim();
  const password = String(formData.get('password') || '');
  const mfaCode = String(formData.get('mfaCode') || '').trim();
  const next = String(formData.get('next') || '/dashboard');

  if (!identifier || !password) {
    return { error: 'Enter your mobile/email and password.' };
  }

  const res = await fetch(`${API_URL}/auth/employee/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier,
      password,
      mfaCode: mfaCode || undefined,
      device: { deviceId: 'admin-web', deviceName: 'Admin Console', platform: 'WEB' },
    }),
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { error: body.message || 'Sign in failed. Check your credentials and try again.' };
  }

  await setSessionCookies(body.accessToken, body.refreshToken);
  redirect(next.startsWith('/') ? next : '/dashboard');
}

export async function logoutAction() {
  // /auth/logout is guarded by JwtAuthGuard, which validates the signed
  // access token (refresh tokens are opaque strings, not JWTs, and can't be
  // used here) and revokes this device's session server-side from the
  // userId/deviceId embedded in it.
  const accessToken = await getAccessToken();
  if (accessToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }).catch(() => undefined);
  }
  await clearSessionCookies();
  redirect('/login');
}
