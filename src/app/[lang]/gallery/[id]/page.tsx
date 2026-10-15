import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPaintingById, getRelatedPaintings, slimPainting } from '@/lib/api';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import PaintingDetailClient from './PaintingDetailClient';
import type { Language } from '@/lib/i18n/translations';
import { OG_LOCALE, isLang, languageAlternates, localizePath } from '@/lib/i18n/routing';
import { SITE_URL } from '@/lib/siteUrl';
import { mainImage } from '@/lib/paintingImages';

// See src/app/gallery/page.tsx for why this is a cache window instead of
// rendering fresh on every request.
export const revalidate = 30;

// Without this, a page under a dynamic segment ([id]) is rendered from the
// database on EVERY visit and `revalidate` above does nothing. An empty list
// = build none in advance, but cache each painting's page the first time
// it's opened and reuse it (refreshed in the background) after that.
export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ lang: string; id: string }>;
}

// The painting's title/description/technique in the page's language.
function localized(painting: any, lang: Language) {
  return {
    title: painting[`title_${lang}`] || painting.title_en,
    description: painting[`description_${lang}`] || painting.description_en,
    technique: painting[`technique_${lang}`] || painting.technique_en,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, lang: rawLang } = await params;
  const lang: Language = isLang(rawLang) ? rawLang : 'en';
  const painting = await getPaintingById(id);

  if (!painting) {
    return {
      title: 'Painting Not Found',
    };
  }

  const imageUrl = mainImage(painting.images);

  const loc = localized(painting, lang);
  const title = `${loc.title} — ${painting.artist.name}`;
  const description =
    loc.description ||
    `${loc.title} — ${loc.technique}, ${painting.size}. ${painting.artist.name}. Art Qala Gallery, Tashkent.`;

  return {
    title,
    description,
    alternates: languageAlternates(`/gallery/${id}`, lang),
    openGraph: {
      title: `${title} | Art Qala Gallery`,
      description,
      url: localizePath(`/gallery/${id}`, lang),
      type: 'article',
      locale: OG_LOCALE[lang],
      images: [{ url: imageUrl, alt: loc.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Art Qala Gallery`,
      description,
      images: [imageUrl],
    },
  };
}

function buildProductJsonLd(painting: any, siteUrl: string, lang: Language) {
  const loc = localized(painting, lang);
  let imageUrl = mainImage(painting.images);
  // Structured-data image must be an absolute URL — prefix relative /assets paths.
  if (imageUrl.startsWith('/')) {
    imageUrl = `${siteUrl}${imageUrl}`;
  }

  const price = painting.discount_price || painting.price;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: loc.title,
    description: loc.description || `${loc.title} — ${loc.technique}, ${painting.artist?.name}.`,
    image: imageUrl.startsWith('data:') ? undefined : imageUrl,
    sku: painting.id,
    brand: { '@type': 'Brand', name: 'Art Qala' },
    category: painting.category?.name_en,
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}${localizePath(`/gallery/${painting.id}`, lang)}`,
      priceCurrency: 'USD',
      price,
      availability: painting.is_sold
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(painting.artist?.name
      ? { creator: { '@type': 'Person', name: painting.artist.name } }
      : {}),
  };
}

export default async function PaintingDetailPage({ params }: PageProps) {
  const { id, lang: rawLang } = await params;
  const lang: Language = isLang(rawLang) ? rawLang : 'en';
  const painting = await getPaintingById(id);

  if (!painting) {
    notFound();
  }

  const relatedPaintings = await getRelatedPaintings(
    painting.id,
    painting.artist_id,
    painting.category_id
  );

  const siteUrl = SITE_URL;
  const productJsonLd = buildProductJsonLd(painting, siteUrl, lang);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: 'Gallery', path: localizePath('/gallery', lang) },
      { name: localized(painting, lang).title, path: localizePath(`/gallery/${id}`, lang) },
    ],
    siteUrl,
    lang
  );

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(breadcrumbJsonLd) }}
      />
      <PaintingDetailClient painting={painting} relatedPaintings={relatedPaintings.map(slimPainting)} />
    </>
  );
}
