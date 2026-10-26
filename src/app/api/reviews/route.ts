import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyAdmin } from '@/lib/adminNotify';
import { checkRateLimit, getClientIp, recordFailedAttempt } from '@/lib/rateLimit';
import { HONEYPOT_FIELD, checkFormToken, hasLink } from '@/lib/reviewGuard';

export const dynamic = 'force-dynamic';

// GET /api/reviews?painting_id=...
// Returns only approved reviews (is_approved: true) along with average rating
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const painting_id = searchParams.get('painting_id');

    const whereClause: any = { is_approved: true };
    if (painting_id) {
      whereClause.painting_id = painting_id;
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        painting: {
          select: {
            id: true,
            title_en: true,
            title_ru: true,
            title_uz: true,
            images: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const total_reviews = reviews.length;
    const sum_ratings = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average_rating = total_reviews > 0 ? +(sum_ratings / total_reviews).toFixed(1) : 0;

    return NextResponse.json({
      success: true,
      reviews,
      total_reviews,
      average_rating,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Database error' },
      { status: 500 }
    );
  }
}

// POST /api/reviews
// Anyone can review the gallery (no painting_id) or a work (painting_id).
// Every review waits for a curator's approval (is_approved: false), and the
// form carries the bot checks of src/lib/reviewGuard.ts. A review is linked
// to the account (user_id — shown as "Verified Collector") only when the
// signed-in reviewer has an inquiry for that painting.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const fail = (code: string, status = 400) => NextResponse.json({ success: false, code }, { status });

    // Honeypot filled → a bot; pretend it worked so it doesn't adapt.
    if (typeof body[HONEYPOT_FIELD] === 'string' && body[HONEYPOT_FIELD].trim()) {
      return NextResponse.json({ success: true });
    }
    const token = checkFormToken(body.form_token);
    if (token !== 'ok') return fail(token === 'too-fast' ? 'too_fast' : 'expired');

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const authorName = typeof body.author_name === 'string' ? body.author_name.trim().slice(0, 80) : '';
    if (text.length < 5 || text.length > 2000 || !authorName) return fail('invalid');
    if (hasLink(text) || hasLink(authorName)) return fail('links');

    const rateKey = `review:${getClientIp(request)}`;
    const limit = await checkRateLimit(rateKey, 3, 60 * 60 * 1000);
    if (!limit.allowed) return fail('rate_limited', 429);

    const painting_id = typeof body.painting_id === 'string' && body.painting_id ? body.painting_id : null;
    const painting = painting_id
      ? await prisma.painting.findUnique({ where: { id: painting_id }, select: { id: true, title_uz: true } })
      : null;
    if (painting_id && !painting) return fail('invalid', 404);

    const session = await getServerSession();
    const verified =
      session && painting
        ? await prisma.inquiry.findFirst({
            where: {
              // The painting may also be one line of a multi-painting inquiry.
              AND: [
                { OR: [{ painting_id: painting.id }, { items: { some: { painting_id: painting.id } } }] },
                { OR: [{ user_id: session.id }, { guest_email: session.email.toLowerCase() }] },
              ],
            },
            select: { id: true },
          })
        : null;

    await recordFailedAttempt(rateKey, 60 * 60 * 1000);
    const review = await prisma.review.create({
      data: {
        user_id: verified ? session!.id : null,
        painting_id: painting?.id ?? null,
        author_name: authorName,
        rating: Math.min(5, Math.max(1, parseInt(body.rating) || 5)),
        text,
        is_approved: false, // Moderatsiya talab qilinadi (TZ 8.12)
      },
    });

    await notifyAdmin({
      heading: 'Yangi sharh',
      summary: `${authorName} ${painting ? `"${painting.title_uz}" asariga` : 'galereya haqida'} sharh qoldirdi. Tasdiqlaganingizdan keyin saytda chiqadi.`,
      details: [
        ['Ism', authorName],
        ['Baho', '★'.repeat(review.rating)],
        ['Asar', painting?.title_uz || 'Galereya haqida (umumiy)'],
        ['Xaridor', verified ? 'Ha, tasdiqlangan' : "Yo'q"],
      ],
      message: text,
      adminPath: '/admin/reviews',
      subject: `Yangi sharh: ${authorName} (${review.rating}★)`,
    });

    return NextResponse.json({ success: true, verified: !!verified });
  } catch (error) {
    console.error('Review submission error:', error);
    return NextResponse.json({ success: false, code: 'server' }, { status: 500 });
  }
}
