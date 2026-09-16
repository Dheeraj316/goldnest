// Masks a sensitive identifier (PAN, Aadhaar, etc.) for display, keeping only
// the last `visible` characters (spec #33, #69 — "mask sensitive information
// unless required"). The full value is never stored in the first place; see
// KycRecord.encryptedRef — this only formats what's safe to keep around.
export function maskIdentifier(value: string, visible = 4): string {
  const clean = value.replace(/\s+/g, '');
  if (clean.length <= visible) {
    return 'X'.repeat(clean.length);
  }
  const maskedLength = clean.length - visible;
  return 'X'.repeat(maskedLength) + clean.slice(maskedLength);
}
