import { signValue } from './auth';

// Bot protection for the public review forms — no CAPTCHA keys needed, and
// every review is still approved by a curator before it shows:
// - a signed "form opened at" token (GET /api/reviews/token): a script that
//   posts straight to the API has none, and a human can't fill the form in
//   under MIN_FILL_MS;
// - a hidden honeypot field (`website`) only bots fill in;
// - a per-IP rate limit and a no-links rule in the route itself.

const MIN_FILL_MS = 3000;
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const HONEYPOT_FIELD = 'website';

export function makeFormToken(now = Date.now()): string {
  return `${now}.${signValue(`review-form:${now}`)}`;
}

export function checkFormToken(token: unknown, now = Date.now()): 'ok' | 'too-fast' | 'invalid' {
  if (typeof token !== 'string') return 'invalid';
  const [ts, sig] = token.split('.');
  const issued = Number(ts);
  if (!Number.isFinite(issued) || !sig || signValue(`review-form:${issued}`) !== sig) return 'invalid';
  const age = now - issued;
  if (age < 0 || age > MAX_AGE_MS) return 'invalid';
  return age < MIN_FILL_MS ? 'too-fast' : 'ok';
}

// Links are the payload of almost every spam review.
export function hasLink(text: string): boolean {
  return /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|ru|net|org|io|xyz|top|info|biz|link|click|site|online|shop)\b/i.test(text);
}
