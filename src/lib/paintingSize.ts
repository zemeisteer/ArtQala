export type SizeBucket = 'small' | 'medium' | 'large';

// Buckets a painting's largest dimension (normalized to cm) into small/medium/large.
// Shared by the Gallery advanced filter and accessory size-tiered pricing, so
// both agree on what counts as "small" vs "large".
// Width × height in centimetres from a size string like "60 × 80 cm",
// "24x36 in" or "50 × 70 sm" (null when it can't be read).
export function parseSizeCm(sizeStr?: string | null): { width: number; height: number } | null {
  if (!sizeStr) return null;
  const match = sizeStr.match(/(\d+(?:[.,]\d+)?)\s*[×x*X]\s*(\d+(?:[.,]\d+)?)\s*(sm|cm|dyum|in|mm)?/i);
  if (!match) return null;
  const unit = (match[3] || 'sm').toLowerCase();
  const factor = unit === 'dyum' || unit === 'in' ? 2.54 : unit === 'mm' ? 0.1 : 1;
  const width = parseFloat(match[1].replace(',', '.')) * factor;
  const height = parseFloat(match[2].replace(',', '.')) * factor;
  return width > 0 && height > 0 ? { width, height } : null;
}

export function getSizeBucket(sizeStr?: string): SizeBucket | null {
  if (!sizeStr) return null;
  const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*[×x*X]\s*(\d+(?:\.\d+)?)\s*(sm|cm|dyum|in)?/i);
  if (!match) return null;
  const w = parseFloat(match[1]);
  const h = parseFloat(match[2]);
  const unit = (match[3] || 'sm').toLowerCase();
  const toCm = unit === 'dyum' || unit === 'in' ? 2.54 : 1;
  const maxDim = Math.max(w, h) * toCm;
  if (maxDim < 50) return 'small';
  if (maxDim <= 90) return 'medium';
  return 'large';
}

// price_medium/price_large fall back to price_small when the admin left them
// blank (a flat-fee accessory doesn't need three separate numbers). Shared by
// the client-side checkboxes and the server-side inquiry routes so the price
// actually charged always matches what the customer was shown.
export function priceForSize(
  accessory: { price_small: number; price_medium: number | null; price_large: number | null },
  sizeBucket?: SizeBucket | null
): number {
  if (sizeBucket === 'large') return accessory.price_large ?? accessory.price_medium ?? accessory.price_small;
  if (sizeBucket === 'medium') return accessory.price_medium ?? accessory.price_small;
  return accessory.price_small;
}

// Picks the largest bucket among several paintings sharing one accessory
// selection (a bulk inquiry / wishlist batch) — undercharging a big canvas
// is worse than slightly overcharging a small one sharing the same order.
export function largestSizeBucket(sizes: (string | null | undefined)[]): SizeBucket | null {
  const order: SizeBucket[] = ['small', 'medium', 'large'];
  return sizes
    .map((s) => getSizeBucket(s || undefined))
    .filter((b): b is SizeBucket => b !== null)
    .reduce<SizeBucket | null>((largest, b) => {
      if (!largest) return b;
      return order.indexOf(b) > order.indexOf(largest) ? b : largest;
    }, null);
}
