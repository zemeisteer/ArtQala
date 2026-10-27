import React from 'react';
import { getAllPaintings } from '@/lib/api';
import { SITE_URL } from '@/lib/siteUrl';
import LabelsClient, { type LabelPainting } from './LabelsClient';

export const dynamic = 'force-dynamic';

// Printable wall labels with a QR code for the works hanging in the gallery
// (Admin → Paintings → "QR yorliqlar"). ?ids=a,b preselects works.
export default async function PaintingLabelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { ids } = await searchParams;
  const preselected = typeof ids === 'string' ? ids.split(',').filter(Boolean) : [];
  const paintings = await getAllPaintings();
  const items: LabelPainting[] = paintings.map((p) => ({
    id: p.id,
    title_en: p.title_en,
    title_uz: p.title_uz,
    artist: p.artist?.name || '',
    technique: p.technique_en || '',
    size: p.size || '',
    year: p.year ? String(p.year) : '',
    price: p.price,
    discount_price: p.discount_price && p.discount_price < p.price ? p.discount_price : null,
    is_sold: p.is_sold,
  }));
  return <LabelsClient paintings={items} preselected={preselected} siteUrl={SITE_URL} />;
}
