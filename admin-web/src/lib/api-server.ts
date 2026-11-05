import 'server-only';
import { API_URL } from './config';
import { getAccessToken } from './session';
import { ApiError } from './api-error';

export { ApiError };

// Every call to the backend goes through here, server-side only. `proxy.ts`
// is responsible for keeping the access-token cookie fresh before a request
// reaches a page or Server Action, so this stays a plain authenticated
// fetch rather than needing its own refresh/retry dance.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    throw new ApiError(
      res.status,
      (body.errorCode as string) || 'UNKNOWN',
      (Array.isArray(body.message) ? body.message.join(', ') : (body.message as string)) || res.statusText,
      body.correlationId as string | undefined,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
