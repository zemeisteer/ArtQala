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
  const [artists, categories, discountRules, accessories] = await Promise.all([
    prisma.artist.findMany(),
    prisma.category.findMany(),
    getActiveDiscountRules(),
    prisma.accessory.findMany({
      where: { is_active: true },
      select: { id: true, name_uz: true, product_types: true },
      orderBy: { name_uz: 'asc' },
    }),
  ]);

  return (
    <PaintingForm
      artists={artists}
      categories={categories}
      discountRules={discountRules}
      accessories={accessories}
      backHref={safeBackHref(back)}
      isNew={true}
    />
  );
}
