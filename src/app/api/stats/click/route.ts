import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, recordFailedAttempt } from '@/lib/rateLimit';
import { BOT_UA, dailyVisitorId, requestCountry } from '@/lib/visitorId';
import { CONTACT_METHODS } from '@/lib/contactClicks';

// Records one click on a contact button/link (WhatsApp, Telegram, phone…),
// sent by navigator.sendBeacon from the public site. Anonymous; at most 30
// per IP per 10 minutes so a script can't inflate the numbers.
export async function POST(request: Request) {
  try {
    const ua = request.headers.get('user-agent') || '';
    if (!ua || BOT_UA.test(ua)) return NextResponse.json({ success: true, ignored: true });

    const body = (await request.json().catch(() => null)) as { method?: unknown; path?: unknown } | null;
    const method = typeof body?.method === 'string' ? body.method : '';
    if (!(CONTACT_METHODS as readonly string[]).includes(method)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }
    const path = typeof body?.path === 'string' && body.path.startsWith('/') ? body.path.slice(0, 200) : '/';
    if (path.startsWith('/admin')) return NextResponse.json({ success: true, ignored: true });

    const limitKey = `click:${getClientIp(request)}`;
    const limit = await checkRateLimit(limitKey, 30, 10 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ success: true, ignored: true });
    await recordFailedAttempt(limitKey, 10 * 60 * 1000);

    await prisma.contactClick.create({
      data: { method, path, visitor: dailyVisitorId(request, ua), country: requestCountry(request) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact click error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
