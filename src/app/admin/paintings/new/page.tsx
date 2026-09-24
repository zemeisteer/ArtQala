import React from 'react';
import { prisma } from '@/lib/prisma';
import { getActiveDiscountRules } from '@/lib/discounts';
import PaintingForm from '../PaintingForm';

export const dynamic = 'force-dynamic';

export default async function NewPaintingPage() {
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
      isNew={true}
    />
  );
}
