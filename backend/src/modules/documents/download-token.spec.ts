import { signDownloadToken, verifyDownloadToken } from './download-token';

const SECRET = 'a-test-secret-that-is-at-least-32-chars-long';
const claims = { k: 'receipt' as const, id: '11111111-1111-4111-8111-111111111111', sub: 'cust-1' };

describe('download tokens', () => {
  it('round-trips valid claims and reports the expiry', () => {
    const now = Date.UTC(2026, 8, 21, 6, 0, 0);
    const { token, expiresAt } = signDownloadToken(claims, SECRET, 120, now);
    expect(expiresAt.getTime()).toBe(now + 120_000);
    expect(verifyDownloadToken(token, SECRET, now + 60_000)).toMatchObject(claims);
  });

  it('is valid through the expiry second and refused after it', () => {
    const now = Date.UTC(2026, 8, 21, 6, 0, 0);
    const { token } = signDownloadToken(claims, SECRET, 120, now);
    expect(verifyDownloadToken(token, SECRET, now + 120_000)).not.toBeNull();
    expect(verifyDownloadToken(token, SECRET, now + 121_000)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const { token } = signDownloadToken(claims, SECRET);
    expect(verifyDownloadToken(token, 'another-secret-that-is-also-32-chars-long!')).toBeNull();
  });

  it('rejects a tampered payload (e.g. pointing the token at another document)', () => {
    const { token } = signDownloadToken(claims, SECRET);
    const [payload, mac] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), id: '22222222-2222-4222-8222-222222222222' })).toString('base64url');
    expect(verifyDownloadToken(`${forged}.${mac}`, SECRET)).toBeNull();
  });

  it('rejects malformed input', () => {
    for (const bad of ['', 'abc', 'a.b.c', '.', 'x'.repeat(3000), undefined as unknown as string, null as unknown as string]) {
      expect(verifyDownloadToken(bad, SECRET)).toBeNull();
    }
  });

  it('is not interchangeable with a login token signed by the same secret', () => {
    // A JWT-shaped string (header.payload.signature) has three parts and is refused outright.
    expect(verifyDownloadToken('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln', SECRET)).toBeNull();
  });

  it('carries an auction-notice claim and cannot be re-pointed at another kind of document', () => {
    const now = Date.UTC(2026, 8, 21, 6, 0, 0);
    const { token } = signDownloadToken({ k: 'auction_notice', id: '22222222-2222-4222-8222-222222222222', sub: 'cust-1' }, SECRET, 120, now);
    expect(verifyDownloadToken(token, SECRET, now)).toMatchObject({ k: 'auction_notice' });
    const [payload, mac] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), k: 'statement' })).toString('base64url');
    expect(verifyDownloadToken(`${forged}.${mac}`, SECRET, now)).toBeNull();
  });
});
