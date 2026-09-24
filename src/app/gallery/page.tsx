import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAllPaintings, getCategories } from '@/lib/api';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import GalleryClient from './GalleryClient';

// Cached and revalidated every 30s instead of re-querying the DB on every
// visit — public browsing traffic doesn't need per-request freshness, and
// this was the single biggest contributor to slow page loads.
export const revalidate = 30;

const siteUrl = process.env.NEXTAUTH_URL || 'https://artqala.com';
const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: 'Gallery', path: '/gallery' }], siteUrl);

export const metadata: Metadata = {
  title: 'Gallery — Original Paintings Collection',
  description:
    'Explore original Uzbek oil and acrylic paintings of historical monuments, portraits, and courtyards at Art Qala Gallery in Tashkent.',
  alternates: { canonical: '/gallery' },
  openGraph: {
    title: 'Gallery — Original Paintings | Art Qala',
    description: 'Browse our collection of original Uzbek paintings with worldwide shipping.',
  },
};

export default async function GalleryPage() {
  const paintings = await getAllPaintings();
  const categories = await getCategories();

  // Lets search engines see the collection as a list of individually
  // crawlable products, each linking to its own Product-schema page.
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: paintings.slice(0, 100).map((p: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${siteUrl}/gallery/${p.id}`,
      name: p.title_en,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(itemListJsonLd) }}
      />
      {/* GalleryClient reads useSearchParams() (for the ?wishlist=true deep
          link) — without a Suspense boundary around it, that alone forces
          this whole route to render dynamically on every request, silently
          defeating the `revalidate` cache above. */}
      <Suspense fallback={null}>
        <GalleryClient paintings={paintings} categories={categories} />
      </Suspense>
    </>
  );
}
