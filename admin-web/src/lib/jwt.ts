// Decodes a JWT payload WITHOUT verifying the signature. That's fine here —
// this app never trusts the decoded claims for authorization, only for
// reading `exp` (to decide whether to refresh) and non-sensitive display
// fields (role, name). Every actual authorization decision is re-checked by
// the backend on each request against the signed token it receives.
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp - skewSeconds;
}
