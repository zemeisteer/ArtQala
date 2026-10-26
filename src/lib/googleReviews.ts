import { unstable_cache } from 'next/cache';
import { getGalleryFacts } from './galleryFacts';
import { SETTINGS_TAG } from './publicCache';

// The gallery's own Google Maps rating and (at most 5, Google's limit)
// reviews, through the official Places API (New) — only when
// GOOGLE_PLACES_API_KEY is set. Fetched at most once a day per language, so
// it stays far inside Google's free monthly allowance. The place is
// GOOGLE_PLACE_ID (comma-separated for several branches) or else found by
// text search for "<gallery name> <address>" of each Settings address.
// Google's terms: shown with the Google name, author and a link back.

export interface GoogleReview {
  author: string;
  authorUrl: string | null;
  photo: string | null;
  rating: number;
  text: string;
  when: string;
  publishTime: string;
  url: string | null;
}

export interface GooglePlaceReviews {
  name: string;
  rating: number | null;
  count: number;
  mapsUrl: string | null;
  reviewsUrl: string | null;
  writeUrl: string | null;
  reviews: GoogleReview[];
}

// GOOGLE_PLACES_API_URL exists only to test against a mock.
const API = process.env.GOOGLE_PLACES_API_URL || 'https://places.googleapis.com/v1';

async function placeIds(key: string): Promise<string[]> {
  const configured = (process.env.GOOGLE_PLACE_ID || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (configured.length) return configured;

  const facts = await getGalleryFacts();
  const name = facts?.name || 'Art Qala';
  const wanted = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ids: string[] = [];
  for (const loc of facts?.locations || []) {
    const res = await fetch(`${API}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName',
      },
      body: JSON.stringify({ textQuery: `${name} ${loc.address}`, pageSize: 3 }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Places search ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { places?: { id: string; displayName?: { text?: string } }[] };
    // Only a place that really carries the gallery's name — never a
    // neighbouring business that happens to match the address.
    const hit = data.places?.find((p) =>
      (p.displayName?.text || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(wanted)
    );
    if (hit && !ids.includes(hit.id)) ids.push(hit.id);
  }
  return ids;
}

interface PlaceResponse {
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  googleMapsLinks?: { reviewsUri?: string; writeAReviewUri?: string; placeUri?: string };
  reviews?: {
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    relativePublishTimeDescription?: string;
    publishTime?: string;
    googleMapsUri?: string;
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
}

async function fetchPlace(key: string, id: string, lang: string): Promise<GooglePlaceReviews> {
  const res = await fetch(`${API}/places/${encodeURIComponent(id)}?languageCode=${lang}`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'displayName,rating,userRatingCount,googleMapsUri,googleMapsLinks,reviews',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Place details ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const p = (await res.json()) as PlaceResponse;
  return {
    name: p.displayName?.text || '',
    rating: typeof p.rating === 'number' ? p.rating : null,
    count: p.userRatingCount || 0,
    mapsUrl: p.googleMapsLinks?.placeUri || p.googleMapsUri || null,
    reviewsUrl: p.googleMapsLinks?.reviewsUri || p.googleMapsUri || null,
    writeUrl: p.googleMapsLinks?.writeAReviewUri || null,
    reviews: (p.reviews || [])
      .map((r) => ({
        author: r.authorAttribution?.displayName || 'Google',
        authorUrl: r.authorAttribution?.uri || null,
        photo: r.authorAttribution?.photoUri || null,
        rating: r.rating || 0,
        text: (r.text?.text || r.originalText?.text || '').trim(),
        when: r.relativePublishTimeDescription || '',
        publishTime: r.publishTime || '',
        url: r.googleMapsUri || null,
      }))
      .filter((r) => r.text),
  };
}

const cachedGoogleReviews = unstable_cache(
  async (lang: string): Promise<GooglePlaceReviews[]> => {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) return [];
    const ids = await placeIds(key);
    return Promise.all(ids.map((id) => fetchPlace(key, id, lang)));
  },
  ['google-reviews'],
  { tags: [SETTINGS_TAG], revalidate: 86400 }
);

export function isGoogleReviewsConfigured(): boolean {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

export async function getGoogleReviews(lang: string): Promise<GooglePlaceReviews[]> {
  if (!isGoogleReviewsConfigured()) return [];
  // A failure is not cached — the next page rebuild tries again.
  try {
    return await cachedGoogleReviews(lang);
  } catch (error) {
    console.error('Google reviews failed:', error);
    return [];
  }
}
