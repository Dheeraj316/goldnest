// Stock photography from Unsplash (unsplash.com/license — free for commercial
// and personal use, no permission or attribution required; credited below
// anyway as good practice). Each URL is a stable per-photo CDN link with our
// own size/quality params — not an API call, so no key or rate limit.
// Verified by loading each directly before use.
function unsplash(id: string, params = 'q=80&auto=format&fit=crop') {
  return `https://images.unsplash.com/${id}?${params}`;
}

export const IMAGES = {
  // Stacked gold bars on black — hero background.
  heroGoldBars: unsplash('photo-1762463176417-2c5e63767bd2', 'w=2000&q=80&auto=format&fit=crop'),
  // Traditional Indian gold bangles, chain and earrings — product/appraisal imagery.
  jewelleryCollection: unsplash('photo-1611107683227-e9060eccd846', 'w=1400&q=80&auto=format&fit=crop'),
  // Bank vault door, black and white — security/trust imagery.
  vaultDoor: unsplash('photo-1582139329536-e7284fece509', 'w=1400&q=80&auto=format&fit=crop'),
};
