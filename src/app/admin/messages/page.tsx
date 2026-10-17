import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminMessagesClient from './AdminMessagesClient';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ?open=<id> — opened from a Telegram notification's link.
  const { open } = await searchParams;
  const openId = typeof open === 'string' ? open : undefined;

  const messages = await prisma.contactMessage.findMany({
    orderBy: { created_at: 'desc' },
  });

  return <AdminMessagesClient initialMessages={messages} initialSelectedId={openId} />;
}
