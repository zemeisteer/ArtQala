import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import ServicesClient from './ServicesClient';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang } from '@/lib/i18n/routing';

// See src/app/gallery/page.tsx for why this is a cache window instead of
// force-dynamic.
export const revalidate = 30;

const siteUrl = process.env.NEXTAUTH_URL || 'https://artqala.com';
const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: 'Services', path: '/services' }], siteUrl);

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('services', isLang(lang) ? lang : 'en');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pulls a pool of real painting cover images matching an optional category
// filter, shuffled — used to power the rotating carousels on this page.
async function getRandomCoverImages(categorySlugs: string[] | null, limit: number): Promise<string[]> {
  const paintings = await prisma.painting.findMany({
    where: categorySlugs ? { category: { slug: { in: categorySlugs } } } : undefined,
    select: { images: true },
    orderBy: { created_at: 'desc' },
    take: 60,
  });

  const urls: string[] = [];
  for (const p of paintings) {
    try {
      const parsed = JSON.parse(p.images);
      if (Array.isArray(parsed) && parsed[0] && !urls.includes(parsed[0])) {
        urls.push(parsed[0]);
      }
    } catch {
      // skip malformed image data rather than breaking the carousel
    }
  }

  return shuffle(urls).slice(0, limit);
}

export default async function ServicesPage() {
  const [ceramicsImages, generalImages] = await Promise.all([
    getRandomCoverImages(['kulolchilik', 'handicrafts'], 6),
    getRandomCoverImages(null, 10),
  ]);

  // Split the general pool so the Mural and Custom Painting rows don't
  // necessarily show the exact same rotation.
  const muralImages = generalImages.slice(0, 5);
  const customImages = generalImages.slice(5, 10);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(breadcrumbJsonLd) }}
      />
      <ServicesClient
        muralImages={muralImages}
        ceramicsImages={ceramicsImages}
        customImages={customImages}
      />
    </>
  );
}
