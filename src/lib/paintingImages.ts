// Painting.images is a JSON array string of image URLs; the first entry is
// the MAIN photo (picked/reordered in Admin → Paintings). Older rows may
// hold a bare URL instead of an array, so both shapes are accepted.

export const PLACEHOLDER_IMAGE = '/assets/p-arch.svg';

export function parseImages(images?: string | null): string[] {
  if (!images) return [];
  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed)) {
      return parsed.filter((u): u is string => typeof u === 'string' && u.trim() !== '');
    }
  } catch {
    if (!images.startsWith('[')) return [images];
  }
  return [];
}

// The one photo every listing (gallery grid, home page, related paintings,
// artist thumbnails, wishlist, account, admin lists) shows.
export function mainImage(images?: string | null, fallback = PLACEHOLDER_IMAGE): string {
  return parseImages(images)[0] || fallback;
}

// Listings only ever show the main photo — trim the rest so they aren't
// shipped in every listing page's HTML/JSON. The painting's own detail page
// loads the full list separately.
export function withMainImageOnly<T extends { images: string }>(painting: T): T {
  const first = parseImages(painting.images)[0];
  return { ...painting, images: JSON.stringify(first ? [first] : []) };
}
