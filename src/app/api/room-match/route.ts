import { NextResponse } from 'next/server';
import { matchRoom } from '@/lib/roomMatch';
import { checkRateLimit, getClientIp, recordFailedAttempt } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

// POST (multipart: photo, lang) — "Find art for my room" (src/lib/roomMatch.ts).
export async function POST(request: Request) {
  const rateKey = `room-match:${getClientIp(request)}`;
  if (!(await checkRateLimit(rateKey, 8, 60 * 60 * 1000)).allowed) {
    return NextResponse.json({ success: false, code: 'rate_limited' }, { status: 429 });
  }
  try {
    const form = await request.formData();
    const photo = form.get('photo');
    const lang = String(form.get('lang') || 'en').slice(0, 5);
    if (!(photo instanceof File) || !photo.type.startsWith('image/') || photo.size > MAX_BYTES) {
      return NextResponse.json({ success: false, code: 'invalid' }, { status: 400 });
    }
    await recordFailedAttempt(rateKey, 60 * 60 * 1000);
    const matches = await matchRoom(Buffer.from(await photo.arrayBuffer()), lang);
    return NextResponse.json({ success: true, matches });
  } catch (error) {
    console.error('Room match failed:', error);
    return NextResponse.json({ success: false, code: 'server' }, { status: 500 });
  }
}
