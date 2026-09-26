import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendReviewRequestEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMIND_AFTER_DAYS = 21;
// Sales older than this are left alone (e.g. if the cron was off for a while)
const GIVE_UP_AFTER_DAYS = 60;

// Daily (vercel.json → crons): one gentle reminder to buyers whose sale was
// 3+ weeks ago and who still haven't left a review for that painting.
// Every processed inquiry is stamped, so nobody is reminded twice — and
// buyers who already reviewed are stamped without an email.
export async function GET(request: Request) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" on cron calls; without
  // the secret configured this endpoint refuses to run at all.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const due = await prisma.inquiry.findMany({
    where: {
      status: 'COMPLETED',
      review_reminder_sent_at: null,
      completed_at: {
        lte: new Date(now - REMIND_AFTER_DAYS * DAY_MS),
        gte: new Date(now - GIVE_UP_AFTER_DAYS * DAY_MS),
      },
    },
    include: {
      painting: { select: { id: true, title_en: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    take: 50,
  });

  const siteUrl = process.env.NEXTAUTH_URL || 'https://artqala.com';
  let sent = 0;
  let skipped = 0;

  for (const inquiry of due) {
    const email = (inquiry.guest_email || inquiry.user?.email || '').toLowerCase();
    const alreadyReviewed = email
      ? await prisma.review.findFirst({
          where: {
            painting_id: inquiry.painting_id,
            OR: [
              ...(inquiry.user_id ? [{ user_id: inquiry.user_id }] : []),
              { user: { email } },
            ],
          },
          select: { id: true },
        })
      : null;

    if (email && !alreadyReviewed) {
      const result = await sendReviewRequestEmail({
        to: email,
        recipientName: inquiry.guest_name || inquiry.user?.name || '',
        paintingTitle: inquiry.painting?.title_en || 'your artwork',
        paintingUrl: `${siteUrl}/gallery/${inquiry.painting_id}#reviews`,
        signupUrl: `${siteUrl}/signup`,
        reminder: true,
      });
      if (!result.success) {
        console.error('Review reminder failed for inquiry', inquiry.id, result.error);
        continue; // try again tomorrow
      }
      sent++;
    } else {
      skipped++;
    }

    await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { review_reminder_sent_at: new Date() },
    });
  }

  return NextResponse.json({ success: true, due: due.length, sent, skipped });
}
