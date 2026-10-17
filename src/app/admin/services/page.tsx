import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminServicesClient from './AdminServicesClient';

export const dynamic = 'force-dynamic';

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ?open=<id> — opened from a Telegram notification's link.
  const { open } = await searchParams;
  const openId = typeof open === 'string' ? open : undefined;

  const serviceRequests = await prisma.serviceRequest.findMany({
    include: {
      messages: {
        orderBy: { created_at: 'asc' },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return <AdminServicesClient initialRequests={serviceRequests} initialSelectedId={openId} />;
}
