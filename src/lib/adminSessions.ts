import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/rateLimit';

// Admin sign-ins are tracked one row each (AdminSession) so they can be
// listed and ended from Admin → Staff. See the model in schema.prisma.

// Mirrors ADMIN_SESSION_MAX_AGE_MS in src/lib/auth.ts (not imported from
// there: auth.ts imports this file).
export const ADMIN_SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;

// Don't write `last_seen_at` on every single request.
const LAST_SEEN_STEP_MS = 2 * 60 * 1000;

// Records a new admin sign-in and returns its id, which goes into the
// session cookie as `sid`.
export async function startAdminSession(request: Request, userId: string): Promise<string> {
  const country = request.headers.get('x-vercel-ip-country');
  const cityRaw = request.headers.get('x-vercel-ip-city');
  let city: string | null = null;
  try {
    city = cityRaw ? decodeURIComponent(cityRaw).slice(0, 80) : null;
  } catch {
    city = null;
  }

  const session = await prisma.adminSession.create({
    data: {
      user_id: userId,
      ip: getClientIp(request).slice(0, 64),
      country: country && /^[A-Z]{2}$/.test(country) ? country : null,
      city,
      user_agent: (request.headers.get('user-agent') || '').slice(0, 400) || null,
    },
    select: { id: true },
  });
  return session.id;
}

// True while the sign-in exists, hasn't been ended (logout / signed out by
// another admin) and belongs to that user. Also keeps "last active" fresh.
export async function isAdminSessionActive(sid: string | undefined | null, userId: string): Promise<boolean> {
  if (!sid) return false;
  const session = await prisma.adminSession.findUnique({
    where: { id: sid },
    select: { user_id: true, ended_at: true, last_seen_at: true },
  });
  if (!session || session.ended_at || session.user_id !== userId) return false;

  if (Date.now() - session.last_seen_at.getTime() > LAST_SEEN_STEP_MS) {
    await prisma.adminSession
      .update({ where: { id: sid }, data: { last_seen_at: new Date() } })
      .catch(() => {});
  }
  return true;
}

export async function endAdminSession(sid: string, reason: 'LOGOUT' | 'REVOKED'): Promise<void> {
  await prisma.adminSession.updateMany({
    where: { id: sid, ended_at: null },
    data: { ended_at: new Date(), end_reason: reason },
  });
}

// "Chrome · Windows" from a user-agent string, for the sign-ins list.
export function describeDevice(ua: string | null | undefined): { browser: string; os: string; mobile: boolean } {
  const s = ua || '';
  const browser = /YaBrowser/i.test(s)
    ? 'Yandex'
    : /Edg\//i.test(s)
    ? 'Edge'
    : /OPR\/|Opera/i.test(s)
    ? 'Opera'
    : /SamsungBrowser/i.test(s)
    ? 'Samsung Internet'
    : /Firefox|FxiOS/i.test(s)
    ? 'Firefox'
    : /Chrome|CriOS/i.test(s)
    ? 'Chrome'
    : /Safari/i.test(s)
    ? 'Safari'
    : '';
  const os = /iPhone|iPod/i.test(s)
    ? 'iPhone'
    : /iPad/i.test(s)
    ? 'iPad'
    : /Android/i.test(s)
    ? 'Android'
    : /Windows/i.test(s)
    ? 'Windows'
    : /Mac OS X|Macintosh/i.test(s)
    ? 'macOS'
    : /Linux/i.test(s)
    ? 'Linux'
    : '';
  return { browser, os, mobile: /Mobi|iPhone|iPod|Android/i.test(s) };
}
