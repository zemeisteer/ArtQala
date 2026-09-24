import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPaintingById, getRelatedPaintings } from '@/lib/api';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import PaintingDetailClient from './PaintingDetailClient';

// See src/app/gallery/page.tsx for why this is a cache window instead of
// rendering fresh on every request.
export const revalidate = 30;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const painting = await getPaintingById(id);

  if (!painting) {
    return {
      title: 'Painting Not Found',
    };
  }

  let imageUrl = '/assets/p-arch.svg';
  try {
    const parsed = JSON.parse(painting.images);
    if (Array.isArray(parsed) && parsed.length > 0) imageUrl = parsed[0];
  } catch {
    if (painting.images && !painting.images.startsWith('[')) {
      imageUrl = painting.images;
    }
  }

  const title = `${painting.title_en} by ${painting.artist.name}`;
  const description =
    painting.description_en ||
    `${painting.title_en} — original ${painting.technique_en} painting (${painting.size}) by ${painting.artist.name}. Art Qala Gallery, Tashkent.`;

  return {
    title,
    description,
    alternates: { canonical: `/gallery/${id}` },
    openGraph: {
      title: `${title} | Art Qala Gallery`,
      description,
      images: [{ url: imageUrl, alt: painting.title_en }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Art Qala Gallery`,
      description,
      images: [imageUrl],
    },
  };
}

function buildProductJsonLd(painting: any, siteUrl: string) {
  let imageUrl = `${siteUrl}/assets/p-arch.svg`;
  try {
    const parsed = JSON.parse(painting.images);
    if (Array.isArray(parsed) && parsed.length > 0) imageUrl = parsed[0];
  } catch {
    if (painting.images && !painting.images.startsWith('[')) {
      imageUrl = painting.images;
    }
  }
  // Structured-data image must be an absolute URL — prefix relative /assets paths.
  if (imageUrl.startsWith('/')) {
    imageUrl = `${siteUrl}${imageUrl}`;
  }

  const price = painting.discount_price || painting.price;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: painting.title_en,
    description:
      painting.description_en ||
      `${painting.title_en} — original ${painting.technique_en} painting by ${painting.artist?.name}.`,
    image: imageUrl.startsWith('data:') ? undefined : imageUrl,
    sku: painting.id,
    brand: { '@type': 'Brand', name: 'Art Qala' },
    category: painting.category?.name_en,
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/gallery/${painting.id}`,
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
  const { id } = await params;
  const painting = await getPaintingById(id);

  if (!painting) {
    notFound();
  }

  const relatedPaintings = await getRelatedPaintings(
    painting.id,
    painting.artist_id,
    painting.category_id
  );

  const siteUrl = process.env.NEXTAUTH_URL || 'https://artqala.com';
  const productJsonLd = buildProductJsonLd(painting, siteUrl);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: 'Gallery', path: '/gallery' },
      { name: painting.title_en, path: `/gallery/${id}` },
    ],
    siteUrl
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
      <PaintingDetailClient painting={painting} relatedPaintings={relatedPaintings} />
    </>
  );
}
