import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Short-lived, self-contained download links. The mobile apps call an
 * authenticated endpoint to be handed one of these, then simply open the URL
 * (a browser tab or PDF viewer can't attach an Authorization header).
 *
 * The token is `base64url(payload).base64url(hmac)`, signed with a key derived
 * from the access-token secret but bound to this purpose, so it can never be
 * mistaken for — or used as — a login token. It names exactly one document,
 * the person it was issued to, and an expiry; nothing else is reachable with it.
 */
export const DOCUMENT_KINDS = ['receipt', 'statement', 'auction_notice'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export interface DownloadClaims {
  k: DocumentKind;
  id: string; // receipt id, loan id (statement) or auction id (auction notice)
  sub: string; // who it was issued to (customerId or employeeId) — kept for the audit trail
  exp: number; // unix seconds
}

const b64 = (buf: Buffer) => buf.toString('base64url');

function sign(payloadB64: string, secret: string): string {
  return b64(createHmac('sha256', `document-link:${secret}`).update(payloadB64).digest());
}

export function signDownloadToken(claims: Omit<DownloadClaims, 'exp'>, secret: string, ttlSeconds = 120, nowMs = Date.now()): { token: string; expiresAt: Date } {
  const exp = Math.floor(nowMs / 1000) + ttlSeconds;
  const payload = b64(Buffer.from(JSON.stringify({ ...claims, exp })));
  return { token: `${payload}.${sign(payload, secret)}`, expiresAt: new Date(exp * 1000) };
}

/** Returns the claims, or null for anything malformed, forged or expired. */
export function verifyDownloadToken(token: string, secret: string, nowMs = Date.now()): DownloadClaims | null {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, mac] = parts;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const c = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as DownloadClaims;
    if (!DOCUMENT_KINDS.includes(c.k) || typeof c.id !== 'string' || typeof c.sub !== 'string' || typeof c.exp !== 'number') return null;
    return Math.floor(nowMs / 1000) <= c.exp ? c : null;
  } catch {
    return null;
  }
}
