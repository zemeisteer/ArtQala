import React from 'react';
import { prisma } from '@/lib/prisma';
import { getActiveDiscountRules } from '@/lib/discounts';
import PaintingForm from '../PaintingForm';
import { safeBackHref } from '../listQuery';

export const dynamic = 'force-dynamic';

export default async function NewPaintingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { back } = await searchParams;
  const [artists, categories, discountRules] = await Promise.all([
    prisma.artist.findMany(),
    prisma.category.findMany(),
    getActiveDiscountRules(),
  ]);

  return (
    <PaintingForm
      artists={artists}
      categories={categories}
      discountRules={discountRules}
      backHref={safeBackHref(back)}
      isNew={true}
    />
  );
}
