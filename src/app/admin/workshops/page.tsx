import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminWorkshopsClient from './AdminWorkshopsClient';
import WorkshopBookings from './WorkshopBookings';
import WorkshopTabs from './WorkshopTabs';

export const dynamic = 'force-dynamic';

// Admin → Master-klasslar: bookings (default tab) and the list of
// masterclasses itself (?tab=list).
export default async function AdminWorkshopsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tab, open } = await searchParams;
  const [workshops, bookings] = await Promise.all([
    prisma.workshop.findMany({ orderBy: [{ sort: 'asc' }, { created_at: 'asc' }] }),
    prisma.workshopBooking.findMany({
      orderBy: [{ date: 'asc' }, { time: 'asc' }, { created_at: 'asc' }],
      include: { workshop: { select: { title_uz: true, max_people: true, price: true } } },
    }),
  ]);
  const newCount = bookings.filter((b) => b.status === 'NEW').length;
  return (
    <WorkshopTabs active={tab === 'list' ? 'list' : 'bookings'} newCount={newCount}>
      {tab === 'list' ? (
        <AdminWorkshopsClient initial={JSON.parse(JSON.stringify(workshops))} />
      ) : (
        <WorkshopBookings initial={JSON.parse(JSON.stringify(bookings))} openId={typeof open === 'string' ? open : null} />
      )}
    </WorkshopTabs>
  );
}
