import React from 'react';
import { prisma } from '@/lib/prisma';
import { giftCertificateUrl } from '@/lib/giftCards';
import GiftCardsClient from './GiftCardsClient';

export const dynamic = 'force-dynamic';

export default async function AdminGiftCardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { open } = await searchParams;
  const gifts = await prisma.giftCertificate.findMany({ orderBy: { created_at: 'desc' } });
  return (
    <GiftCardsClient
      initial={gifts.map((g) => ({
        ...g,
        created_at: g.created_at.toISOString(),
        paid_at: g.paid_at?.toISOString() ?? null,
        redeemed_at: g.redeemed_at?.toISOString() ?? null,
        updated_at: g.updated_at.toISOString(),
        url: giftCertificateUrl(g.code, g.lang),
      }))}
      openId={typeof open === 'string' ? open : null}
    />
  );
}
