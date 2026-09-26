// The visitor's country (ISO-3166 alpha-2), as detected from their IP by
// Vercel and handed to the browser by src/middleware.ts in the
// `aq_country` cookie. Used to preselect the phone code and the shipping
// destination. Client-only (reads document.cookie) — call it after mount so
// server and client render the same default first.
export const VISITOR_COUNTRY_COOKIE = 'aq_country';

export function getVisitorCountry(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${VISITOR_COUNTRY_COOKIE}=([A-Z]{2})`));
  return match ? match[1] : null;
}
