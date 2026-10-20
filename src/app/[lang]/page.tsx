import React from 'react';
import type { Metadata } from 'next';
import { homeMetadata } from '@/lib/i18n/seo';
import { getGalleryFacts } from '@/lib/galleryFacts';
import { isLang } from '@/lib/i18n/routing';
import { getFeaturedPaintings, slimPainting } from '@/lib/api';
import HomeClient from './HomeClient';

// See src/app/gallery/page.tsx for why this is a cache window instead of
// rendering fresh on every request.
export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const facts = await getGalleryFacts();
  return homeMetadata(isLang(lang) ? lang : 'en', facts?.cities || []);
}

export default async function HomePage() {
  const featuredPaintings = await getFeaturedPaintings();

  return <HomeClient featuredPaintings={featuredPaintings.map(slimPainting)} />;
}
