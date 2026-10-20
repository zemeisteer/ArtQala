export type SizeBucket = 'small' | 'medium' | 'large';

// Buckets a painting's largest dimension (normalized to cm) into small/medium/large.
// Shared by the Gallery advanced filter and accessory size-tiered pricing, so
// both agree on what counts as "small" vs "large".
// Width × height (× depth, for objects like a chess board or a box) in
// centimetres from a size string like "60 × 80 cm", "40 × 40 × 5 sm" or
// "24x36 in" (null when it can't be read). Paintings have no depth.
const SIZE_RE =
  /(\d+(?:[.,]\d+)?)\s*[×x*X]\s*(\d+(?:[.,]\d+)?)(?:\s*[×x*X]\s*(\d+(?:[.,]\d+)?))?\s*(sm|cm|dyum|in|mm)?/i;

export function parseSizeCm(
  sizeStr?: string | null
): { width: number; height: number; depth?: number; unit: 'sm' | 'dyum' } | null {
  if (!sizeStr) return null;
  const match = sizeStr.match(SIZE_RE);
  if (!match) return null;
  const unit = (match[4] || 'sm').toLowerCase();
  const factor = unit === 'dyum' || unit === 'in' ? 2.54 : unit === 'mm' ? 0.1 : 1;
  const num = (s: string) => parseFloat(s.replace(',', '.')) * factor;
  const width = num(match[1]);
  const height = num(match[2]);
  const depth = match[3] ? num(match[3]) : undefined;
  if (!(width > 0 && height > 0)) return null;
  return { width, height, ...(depth && depth > 0 ? { depth } : {}), unit: unit === 'dyum' || unit === 'in' ? 'dyum' : 'sm' };
}

// Only pieces typed WITHOUT a third dimension hang on a wall (paintings,
// carved panels); a chess board, a box or a vase has its depth typed.
export const isWallPiece = (size: { depth?: number } | null) => !size?.depth;

export function getSizeBucket(sizeStr?: string): SizeBucket | null {
  const size = parseSizeCm(sizeStr);
  if (!size) return null;
  const maxDim = Math.max(size.width, size.height, size.depth || 0);
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
