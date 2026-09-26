import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPaintingById } from '@/lib/api';
import CertificateClient from './CertificateClient';

interface PageProps {
  params: Promise<{ lang: string; id: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const painting = await getPaintingById(id);
  if (!painting) return { title: 'Certificate of Authenticity' };
  const certNumber = `AQ-${new Date(painting.created_at).getFullYear()}-${painting.id.slice(-6).toUpperCase()}`;
  return {
    title: `Certificate of Authenticity #${certNumber} — ${painting.title_en}`,
    description: `Official Certificate of Authenticity for the original painting "${painting.title_en}" by master ${painting.artist?.name || 'Uzbek Master'}, registered at Art Qala Gallery.`,
    alternates: { canonical: `/certificate/${id}` },
    // A printable document per painting — near-duplicate of the painting
    // page, so kept out of search results (links on it are still followed).
    robots: { index: false, follow: true },
  };
}


export default async function CertificatePage({ params }: PageProps) {
  const { id } = await params;
  const painting = await getPaintingById(id);

  if (!painting) {
    notFound();
  }

  return <CertificateClient painting={painting} />;
}
