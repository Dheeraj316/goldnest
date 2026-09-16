import { createHmac, randomBytes } from 'crypto';

// RFC 6238 TOTP (30s step, 6 digits, HMAC-SHA1) implemented directly on
// Node's crypto module so staff/admin MFA (spec #53, #58) needs no extra
// dependency. Compatible with any standard authenticator app (Google
// Authenticator, Authy, 1Password, etc.).

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

export function generateBase32Secret(byteLength = 20): string {
  const bytes = randomBytes(byteLength);
  let bits = '';
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let output = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return output;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);

  return (binCode % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

export function generateTotp(base32Secret: string, forTimeMs: number = Date.now()): string {
  const counter = Math.floor(forTimeMs / 1000 / STEP_SECONDS);
  return hotp(base32Decode(base32Secret), counter);
}

/** Verifies `token` allowing +/- `window` steps of clock drift (default: 30s either side). */
export function verifyTotp(base32Secret: string, token: string, window = 1): boolean {
  const secretBuffer = base32Decode(base32Secret);
  const currentCounter = Math.floor(Date.now() / 1000 / STEP_SECONDS);

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    if (hotp(secretBuffer, currentCounter + errorWindow) === token) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUrl(params: { secret: string; accountName: string; issuer: string }): string {
  const label = encodeURIComponent(`${params.issuer}:${params.accountName}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
