import { generateBase32Secret, generateTotp, verifyTotp } from './totp';

describe('TOTP (RFC 6238)', () => {
  it('generates a valid base32 secret', () => {
    const secret = generateBase32Secret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it('verifies a code generated for the current time step', () => {
    const secret = generateBase32Secret();
    const code = generateTotp(secret);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it('rejects an incorrect code', () => {
    const secret = generateBase32Secret();
    expect(verifyTotp(secret, '000000')).toBe(false);
  });

  it('rejects a code generated from a different secret', () => {
    const secretA = generateBase32Secret();
    const secretB = generateBase32Secret();
    const code = generateTotp(secretA);
    expect(verifyTotp(secretB, code)).toBe(false);
  });

  it('accepts a code from one step in the past within the drift window', () => {
    const secret = generateBase32Secret();
    const thirtySecondsAgo = Date.now() - 30_000;
    const code = generateTotp(secret, thirtySecondsAgo);
    expect(verifyTotp(secret, code, 1)).toBe(true);
  });
});
