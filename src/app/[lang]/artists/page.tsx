import React from 'react';
import type { Metadata } from 'next';
import { getArtists } from '@/lib/api';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import ArtistsClient from './ArtistsClient';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang } from '@/lib/i18n/routing';

// See src/app/gallery/page.tsx for why this is a cache window instead of
// force-dynamic.
export const revalidate = 30;

const siteUrl = process.env.NEXTAUTH_URL || 'https://artqala.com';
const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: 'Artists', path: '/artists' }], siteUrl);

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('artists', isLang(lang) ? lang : 'en');
}

export default async function ArtistsPage() {
  const artists = await getArtists();

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(breadcrumbJsonLd) }}
      />
      <ArtistsClient artists={artists} />
    </>
  );
}
