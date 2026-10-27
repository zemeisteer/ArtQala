import React from 'react';
import type { Metadata } from 'next';
import { getArtists } from '@/lib/api';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import ArtistsClient from './ArtistsClient';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang } from '@/lib/i18n/routing';
import { localizeContent } from '@/lib/contentTranslations';
import { SITE_URL } from '@/lib/siteUrl';

// See src/app/gallery/page.tsx for why this is a cache window instead of
// force-dynamic.
export const revalidate = 86400;

const siteUrl = SITE_URL;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('artists', isLang(lang) ? lang : 'en');
}

export default async function ArtistsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [{ name: 'Artists', path: '/artists' }],
    siteUrl,
    isLang(rawLang) ? rawLang : 'en'
  );
  const artists = await getArtists();

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(breadcrumbJsonLd) }}
      />
      <ArtistsClient artists={localizeContent(artists, rawLang)} />
    </>
  );
}
