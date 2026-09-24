import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActiveDiscountRules } from '@/lib/discounts';
import PaintingForm from '../PaintingForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EditPaintingPage({ params }: PageProps) {
  const { id } = await params;
  const painting = await prisma.painting.findUnique({
    where: { id },
  });

  if (!painting) {
    notFound();
  }

  const [artists, categories, discountRules] = await Promise.all([
    prisma.artist.findMany(),
    prisma.category.findMany(),
    getActiveDiscountRules(),
  ]);

  return (
    <PaintingForm
      initialData={painting}
      artists={artists}
      categories={categories}
      discountRules={discountRules}
      isNew={false}
    />
  );
}
