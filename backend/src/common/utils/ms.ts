// Minimal duration-string parser ("15m", "30d", "1h", "45s") so config values
// stay human-readable without pulling in an extra dependency for it.
const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function toMillis(duration: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${duration}". Expected formats like "15m", "1h", "30d".`);
  }
  const [, value, unit] = match;
  return parseInt(value, 10) * UNIT_MS[unit];
}

export function toSeconds(duration: string): number {
  return Math.floor(toMillis(duration) / 1000);
}
