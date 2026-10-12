import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAllPaintings, getCategories } from '@/lib/api';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import GalleryClient from './GalleryClient';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang, localizePath } from '@/lib/i18n/routing';
import { SITE_URL } from '@/lib/siteUrl';

// Cached and revalidated every 30s instead of re-querying the DB on every
// visit — public browsing traffic doesn't need per-request freshness, and
// this was the single biggest contributor to slow page loads.
export const revalidate = 30;

const siteUrl = SITE_URL;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('gallery', isLang(lang) ? lang : 'en');
}

export default async function GalleryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params;
  const lang = isLang(rawLang) ? rawLang : 'en';
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: 'Gallery', path: '/gallery' }], siteUrl, lang);
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
      // This language's own URL and title for each work
      url: `${siteUrl}${localizePath(`/gallery/${p.id}`, lang)}`,
      name: p[`title_${lang}`] || p.title_en,
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
