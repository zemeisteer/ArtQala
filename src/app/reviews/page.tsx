import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import ReviewsClient from './ReviewsClient';

// See src/app/gallery/page.tsx for why this is a cache window instead of
// force-dynamic.
export const revalidate = 30;

const siteUrl = process.env.NEXTAUTH_URL || 'https://artqala.com';
const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: 'Reviews', path: '/reviews' }], siteUrl);

export const metadata: Metadata = {
  title: 'Client Reviews & Collector Testimonials',
  description: 'Reviews from collectors and clients of Art Qala Gallery in Tashkent — written by verified buyers of original paintings and commissions.',
  alternates: { canonical: '/reviews' },
  openGraph: {
    title: 'Collector Reviews & Testimonials | Art Qala Gallery',
    description: 'Reviews from verified collectors of original paintings at Art Qala Gallery, Tashkent.',
  },
};

export default async function ReviewsPage() {
  const reviews = await prisma.review.findMany({
    where: { is_approved: true },
    include: {
      painting: { select: { id: true, title_en: true, title_ru: true, title_uz: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  // Surfaces star ratings in search results — Google reads aggregateRating
  // off an ArtGallery/LocalBusiness node the same way it does for Product.
  const reviewsJsonLd =
    reviews.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ArtGallery',
          name: 'Art Qala',
          url: siteUrl,
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: +(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
            reviewCount: reviews.length,
          },
          review: reviews.slice(0, 20).map((r) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.author_name },
            reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
            reviewBody: r.text,
            datePublished: r.created_at.toISOString(),
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(breadcrumbJsonLd) }}
      />
      {reviewsJsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: safeJsonLdString(reviewsJsonLd) }}
        />
      )}
      <ReviewsClient initialReviews={reviews} />
    </>
  );
}

