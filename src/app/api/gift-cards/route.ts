import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAdmin } from '@/lib/adminNotify';
import { sendGiftRequestReceivedEmail } from '@/lib/email';
import { checkRateLimit, getClientIp, recordFailedAttempt } from '@/lib/rateLimit';
import { HONEYPOT_FIELD, checkFormToken, hasLink } from '@/lib/reviewGuard';
import { GIFT_MAX, GIFT_MIN, newGiftCode } from '@/lib/giftCards';
import { isLang } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// POST /api/gift-cards — a visitor asks for a gift certificate. Saved as NEW;
// the curator arranges payment and marks it PAID in the admin, which emails
// the certificate. Same bot checks as the review forms (src/lib/reviewGuard.ts).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const fail = (code: string, status = 400) => NextResponse.json({ success: false, code }, { status });

  if (typeof body[HONEYPOT_FIELD] === 'string' && body[HONEYPOT_FIELD].trim()) {
    return NextResponse.json({ success: true });
  }
  const token = checkFormToken(body.form_token);
  if (token !== 'ok') return fail(token === 'too-fast' ? 'too_fast' : 'expired');

  const amount = Math.round(Number(body.amount));
  const buyer_name = str(body.buyer_name, 80);
  const buyer_email = str(body.buyer_email, 120).toLowerCase();
  const buyer_phone = str(body.buyer_phone, 40) || null;
  const recipient_name = str(body.recipient_name, 80);
  const recipient_email = str(body.recipient_email, 120).toLowerCase() || null;
  const message = str(body.message, 300) || null;
  const lang = isLang(body.lang) ? body.lang : 'en';

  if (!Number.isFinite(amount) || amount < GIFT_MIN || amount > GIFT_MAX) return fail('amount');
  if (!buyer_name || !recipient_name || !EMAIL_RE.test(buyer_email)) return fail('invalid');
  if (recipient_email && !EMAIL_RE.test(recipient_email)) return fail('invalid');
  if (message && hasLink(message)) return fail('links');

  const rateKey = `gift:${getClientIp(request)}`;
  if (!(await checkRateLimit(rateKey, 5, 60 * 60 * 1000)).allowed) return fail('rate_limited', 429);
  await recordFailedAttempt(rateKey, 60 * 60 * 1000);

  try {
    let gift = null;
    for (let i = 0; i < 3 && !gift; i++) {
      gift = await prisma.giftCertificate
        .create({
          data: { code: newGiftCode(), amount, buyer_name, buyer_email, buyer_phone, recipient_name, recipient_email, message, lang },
        })
        .catch((e: { code?: string }) => (e?.code === 'P2002' ? null : Promise.reject(e)));
    }
    if (!gift) return fail('server', 500);

    await Promise.all([
      sendGiftRequestReceivedEmail({ to: buyer_email, buyerName: buyer_name, amount, recipientName: recipient_name }),
      notifyAdmin({
        heading: "Yangi sovg'a sertifikati so'rovi",
        summary: `${buyer_name} $${amount} lik sovg'a sertifikati so'radi. To'lovni kelishib, admin panelda "To'landi" ni bosing — sertifikat emailga o'zi yuboriladi.`,
        details: [
          ['Summa', `$${amount}`],
          ['Kim uchun', recipient_name],
          ["Qabul qiluvchi email", recipient_email],
          ['Xaridor', buyer_name],
          ['Email', buyer_email],
          ['Telefon', buyer_phone],
          ['Kod', gift.code],
        ],
        message: message || '',
        adminPath: '/admin/gift-cards',
        subject: `Sovg'a sertifikati: $${amount} — ${buyer_name}`,
        customerEmail: buyer_email,
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gift card request failed:', error);
    return fail('server', 500);
  }
}
