import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { sendGiftCertificateEmail } from '@/lib/email';
import { GIFT_STATUSES, giftCertificateUrl, type GiftStatus } from '@/lib/giftCards';

export const dynamic = 'force-dynamic';

// PATCH { status?, admin_notes?, resend? } — marking PAID (or resend: true)
// emails the certificate to the recipient if the buyer gave their email,
// else to the buyer.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const gift = await prisma.giftCertificate.findUnique({ where: { id } });
  if (!gift) return NextResponse.json({ success: false, error: 'Topilmadi' }, { status: 404 });

  const status: GiftStatus | undefined = GIFT_STATUSES.includes(body.status) ? body.status : undefined;
  const updated = await prisma.giftCertificate.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(status === 'PAID' && !gift.paid_at && { paid_at: new Date() }),
      ...(status === 'REDEEMED' && { redeemed_at: new Date() }),
      ...(typeof body.admin_notes === 'string' && { admin_notes: body.admin_notes.slice(0, 1000) }),
    },
  });

  let emailed: string | null = null;
  if ((status === 'PAID' && gift.status === 'NEW') || body.resend === true) {
    if (updated.status !== 'PAID' && updated.status !== 'REDEEMED') {
      return NextResponse.json({ success: false, error: "Avval \"To'landi\" deb belgilang" }, { status: 400 });
    }
    const to = updated.recipient_email || updated.buyer_email;
    const result = await sendGiftCertificateEmail({
      to,
      toName: updated.recipient_name,
      fromName: updated.buyer_name,
      amount: updated.amount,
      code: updated.code,
      url: giftCertificateUrl(updated.code, updated.lang),
      message: updated.message,
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: `Email yuborilmadi: ${result.error}`, gift: updated }, { status: 502 });
    }
    emailed = to;
  }
  return NextResponse.json({ success: true, gift: updated, emailed });
}
