// A sale price typed in the admin (string or number) → a non-negative
// number, or null when empty/invalid.
export function parseSoldPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
