import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminPaintingsClient from './AdminPaintingsClient';
import { getSalePriceByPainting } from '@/lib/salePrices';
import { parseListQuery } from './listQuery';

export const dynamic = 'force-dynamic';

export default async function AdminPaintingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialQuery = parseListQuery(await searchParams);
  const rawPaintings = await prisma.painting.findMany({
    include: {
      artist: true,
      category: true,
    },
    // id as a tie-breaker keeps the order (and so each page) stable.
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
  });
  // What each sold painting went for (inquiry agreement, else the price
  // typed when it was marked sold) — shown next to the "Sold" badge.
  const salePrices = await getSalePriceByPainting(rawPaintings.filter((p) => p.is_sold).map((p) => p.id));
  const paintings = rawPaintings.map((p) => ({ ...p, sale_price: salePrices.get(p.id) ?? null }));

  const categories = await prisma.category.findMany();
  const artists = await prisma.artist.findMany();

  return (
    <AdminPaintingsClient
      initialPaintings={paintings}
      categories={categories}
      artists={artists}
      initialQuery={initialQuery}
    />
  );
}
