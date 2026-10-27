import React from 'react';
import type { Metadata } from 'next';
import { homeMetadata } from '@/lib/i18n/seo';
import { getGalleryFacts } from '@/lib/galleryFacts';
import { isLang } from '@/lib/i18n/routing';
import { getFeaturedPaintings, slimPainting } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { localizeContent } from '@/lib/contentTranslations';
import HomeClient from './HomeClient';

// See src/app/gallery/page.tsx for why this is a cache window instead of
// rendering fresh on every request.
export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const facts = await getGalleryFacts();
  return homeMetadata(isLang(lang) ? lang : 'en', facts?.cities || []);
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const [featuredPaintings, latestReviews, stats] = await Promise.all([
    getFeaturedPaintings(),
    prisma.review.findMany({
      where: { is_approved: true },
      select: { id: true, author_name: true, rating: true, text: true },
      orderBy: { created_at: 'desc' },
      take: 3,
    }),
    prisma.review.aggregate({ where: { is_approved: true }, _avg: { rating: true }, _count: true }),
  ]);

  return (
    <HomeClient
      featuredPaintings={localizeContent(featuredPaintings.map(slimPainting), lang)}
      reviews={{ latest: latestReviews, average: stats._avg.rating || 0, count: stats._count }}
    />
  );
}
