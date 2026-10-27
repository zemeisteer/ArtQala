import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { giftSignature } from '@/lib/giftCards';
import GiftCertificateView from './GiftCertificateView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Gift certificate', robots: { index: false, follow: false } };

// The printable certificate emailed once a gift card is paid — opens only
// with the signed link (?s=) and only for a PAID or REDEEMED certificate.
export default async function GiftCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code: rawCode } = await params;
  const { s } = await searchParams;
  const code = decodeURIComponent(rawCode);
  if (typeof s !== 'string' || s !== giftSignature(code)) notFound();
  const gift = await prisma.giftCertificate.findUnique({ where: { code } });
  if (!gift || (gift.status !== 'PAID' && gift.status !== 'REDEEMED')) notFound();
  return (
    <GiftCertificateView
      gift={{
        code: gift.code,
        amount: gift.amount,
        recipient: gift.recipient_name,
        from: gift.buyer_name,
        message: gift.message,
        redeemed: gift.status === 'REDEEMED',
        issued: (gift.paid_at || gift.created_at).toISOString(),
      }}
    />
  );
}
