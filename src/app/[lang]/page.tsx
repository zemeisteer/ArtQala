import React from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang } from '@/lib/i18n/routing';
import { getFeaturedPaintings } from '@/lib/api';
import HomeClient from './HomeClient';

// See src/app/gallery/page.tsx for why this is a cache window instead of
// rendering fresh on every request.
export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('home', isLang(lang) ? lang : 'en');
}

export default async function HomePage() {
  const featuredPaintings = await getFeaturedPaintings();

  return <HomeClient featuredPaintings={featuredPaintings} />;
}
