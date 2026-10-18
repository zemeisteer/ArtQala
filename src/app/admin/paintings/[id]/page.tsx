import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActiveDiscountRules } from '@/lib/discounts';
import { getAgreedPriceByPainting } from '@/lib/salePrices';
import PaintingForm from '../PaintingForm';
import { safeBackHref } from '../listQuery';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

export default async function EditPaintingPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { back } = await searchParams;
  const painting = await prisma.painting.findUnique({
    where: { id },
    omit: { sold_price: false },
  });

  if (!painting) {
    notFound();
  }

  const [artists, categories, discountRules, agreed, accessories] = await Promise.all([
    prisma.artist.findMany(),
    prisma.category.findMany(),
    getActiveDiscountRules(),
    getAgreedPriceByPainting([id]),
    prisma.accessory.findMany({
      where: { is_active: true },
      select: { id: true, name_uz: true, product_types: true },
      orderBy: { name_uz: 'asc' },
    }),
  ]);

  return (
    <PaintingForm
      initialData={painting}
      artists={artists}
      categories={categories}
      discountRules={discountRules}
      accessories={accessories}
      backHref={safeBackHref(back)}
      isNew={false}
      agreedSalePrice={agreed.get(id) ?? null}
    />
  );
}
