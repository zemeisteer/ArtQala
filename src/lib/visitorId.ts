import { createHash } from 'crypto';
import { getClientIp } from './rateLimit';

// Shared by the anonymous stats endpoints (page views, contact clicks).

export const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor/i;

// Daily-rotating anonymous id: same person on the same day -> same hash; no
// IP or cookie is stored, and it can't follow anyone across days.
export function dailyVisitorId(request: Request, ua: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${process.env.NEXTAUTH_SECRET || 'artqala'}|${day}|${getClientIp(request)}|${ua}`)
    .digest('hex')
    .slice(0, 16);
}

// Vercel's IP geolocation country (ISO-3166 alpha-2), or null.
export function requestCountry(request: Request): string | null {
  const c = request.headers.get('x-vercel-ip-country');
  return c && /^[A-Z]{2}$/.test(c) ? c : null;
}
