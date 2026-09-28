import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/rateLimit';
import { splitLangPath } from '@/lib/i18n/routing';

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor/i;

function deviceOf(ua: string): string {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'TABLET';
  if (/mobi|iphone|ipod|android/i.test(ua)) return 'MOBILE';
  return 'DESKTOP';
}

// "https://www.google.com/search?q=..." -> "google.com"; our own site -> null.
function referrerHost(raw: unknown, ownHost: string | null): string | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
    if (!host || (ownHost && host === ownHost.replace(/^www\./, '').toLowerCase())) return null;
    return host.slice(0, 100);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    let path = '/';
    let referrer: unknown = null;
    try {
      const body = await request.json();
      if (body && typeof body.path === 'string') {
        path = body.path.slice(0, 200);
      }
      referrer = body?.referrer;
    } catch {
      // Body parsing optional
    }

    // Don't record admin pages as public site visits
    if (path.startsWith('/admin')) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const ua = request.headers.get('user-agent') || '';
    if (!ua || BOT_UA.test(ua)) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const country = request.headers.get('x-vercel-ip-country');
    const cityRaw = request.headers.get('x-vercel-ip-city');
    let city: string | null = null;
    try {
      city = cityRaw ? decodeURIComponent(cityRaw).slice(0, 80) : null;
    } catch {
      city = null;
    }

    // Daily-rotating anonymous id: same person on the same day -> same hash.
    const day = new Date().toISOString().slice(0, 10);
    const visitor = createHash('sha256')
      .update(`${process.env.NEXTAUTH_SECRET || 'artqala'}|${day}|${getClientIp(request)}|${ua}`)
      .digest('hex')
      .slice(0, 16);

    const visit = await prisma.siteVisit.create({
      data: {
        path,
        country: country && /^[A-Z]{2}$/.test(country) ? country : null,
        city,
        referrer: referrerHost(referrer, request.headers.get('host')),
        device: deviceOf(ua),
        lang: splitLangPath(path).lang,
        visitor,
      },
    });

    return NextResponse.json({ success: true, id: visit.id });
  } catch (error) {
    console.error('Error logging site visit:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
