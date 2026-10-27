import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getArtistWithPaintings } from '@/lib/api';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import type { Language } from '@/lib/i18n/translations';
import { OG_LOCALE, isLang, languageAlternates, localizePath } from '@/lib/i18n/routing';
import { SITE_URL } from '@/lib/siteUrl';
import { mainImage } from '@/lib/paintingImages';
import { localizeContent } from '@/lib/contentTranslations';
import ArtistDetailClient from './ArtistDetailClient';

// Same caching as the painting pages: built on first visit, kept for a day
// or until a catalogue edit (src/lib/publicCache.ts).
export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ lang: string; id: string }>;
}

type ArtistLike = { bio_en: string; bio_ru: string; bio_uz: string; specialty_en: string; specialty_ru: string; specialty_uz: string };
const bioIn = (a: ArtistLike, lang: Language) => (lang === 'ru' ? a.bio_ru : lang === 'uz' ? a.bio_uz : a.bio_en) || a.bio_en;
const specialtyIn = (a: ArtistLike, lang: Language) =>
  (lang === 'ru' ? a.specialty_ru : lang === 'uz' ? a.specialty_uz : a.specialty_en) || a.specialty_en;

// First ~160 characters of the bio, cut at a word, for search snippets.
function snippet(text: string, max = 160): string {
  const flat = (text || '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, lang: rawLang } = await params;
  const lang: Language = isLang(rawLang) ? rawLang : 'en';
  const artist = localizeContent(await getArtistWithPaintings(id), lang);
  if (!artist) return { title: 'Artist Not Found' };

  const specialty = specialtyIn(artist, lang);
  const title = specialty ? `${artist.name} — ${specialty}` : artist.name;
  const description =
    snippet(bioIn(artist, lang)) || `${artist.name} — ${artist.paintings.length} works at Art Qala Gallery, Tashkent.`;
  const image = artist.photo || (artist.paintings[0] ? mainImage(artist.paintings[0].images) : undefined);

  return {
    title,
    description,
    alternates: languageAlternates(`/artists/${id}`, lang),
    openGraph: {
      title: `${title} | Art Qala Gallery`,
      description,
      url: localizePath(`/artists/${id}`, lang),
      type: 'profile',
      locale: OG_LOCALE[lang],
      ...(image && { images: [{ url: image, alt: artist.name }] }),
    },
    twitter: { card: 'summary_large_image', title: `${title} | Art Qala Gallery`, description, ...(image && { images: [image] }) },
  };
}

export default async function ArtistPage({ params }: PageProps) {
  const { id, lang: rawLang } = await params;
  const lang: Language = isLang(rawLang) ? rawLang : 'en';
  const artist = localizeContent(await getArtistWithPaintings(id), lang);
  if (!artist) notFound();

  const siteUrl = SITE_URL;
  const url = `${siteUrl}${localizePath(`/artists/${id}`, lang)}`;
  const absolute = (src: string) => (src.startsWith('/') ? `${siteUrl}${src}` : src);
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.name,
    url,
    jobTitle: specialtyIn(artist, lang) || undefined,
    description: snippet(bioIn(artist, lang), 300) || undefined,
    ...(artist.photo && !artist.photo.startsWith('data:') && { image: absolute(artist.photo) }),
    affiliation: { '@type': 'ArtGallery', name: 'Art Qala Gallery', url: siteUrl },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: 'Artists', path: localizePath('/artists', lang) },
      { name: artist.name, path: localizePath(`/artists/${id}`, lang) },
    ],
    siteUrl,
    lang
  );

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(breadcrumbJsonLd) }}
      />
      <ArtistDetailClient artist={artist} />
    </>
  );
}
