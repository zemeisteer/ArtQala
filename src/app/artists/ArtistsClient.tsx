'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { ArrowRight, Send } from 'lucide-react';
import AnimatedMadohil from '@/components/patterns/AnimatedMadohil';
import AnimatedShamchiroq from '@/components/patterns/AnimatedShamchiroq';
import Breadcrumbs from '@/components/Breadcrumbs';

interface ArtistsClientProps {
  artists: any[];
}

const AVATAR_COLORS = [
  'bg-[#BA4E25]', // Terracotta
  'bg-[#429599]', // Turquoise
  'bg-[#DAA932]', // Gold
  'bg-[#367F82]', // Deep Turquoise
  'bg-[#8C3413]', // Dark Terracotta
];

export default function ArtistsClient({ artists }: ArtistsClientProps) {
  const { lang, t } = useApp();
  // Bios are long, multi-line CVs — collapsed to a few lines by default,
  // expandable per artist so they can actually be read in full.
  const [expandedBios, setExpandedBios] = useState<Set<string>>(new Set());
  const toggleBio = (id: string) =>
    setExpandedBios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="py-14 sm:py-16">
      <Breadcrumbs items={[{ label: t.nav.artists }]} />
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        {/* Page Head */}
        <AnimatedMadohil />
        <div className="max-w-2xl mb-12 space-y-2">
          <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">
            {t.artists.eyebrow}
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18]">
            {t.artists.title}
          </h1>
          <p className="text-sm sm:text-base text-[#6E6057] leading-relaxed">
            {t.artists.subtitle}
          </p>
        </div>

        {/* Artists 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {artists.map((artist, idx) => {
            const bio =
              lang === 'ru'
                ? artist.bio_ru
                : lang === 'uz'
                ? artist.bio_uz
                : artist.bio_en;

            const specialty =
              lang === 'ru'
                ? artist.specialty_ru
                : lang === 'uz'
                ? artist.specialty_uz
                : artist.specialty_en;

            const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];

            return (
              <div
                key={artist.id}
                className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[3px] p-7 flex flex-col justify-between gap-5 transition-all duration-400 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#BA4E25]/40 group"
              >
                <div className="space-y-4">
                  {/* Avatar & Name Row */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-full ${avatarBg} text-white font-serif font-bold text-xl flex items-center justify-center shrink-0 transition-transform duration-400 group-hover:scale-105 group-hover:-rotate-3 shadow-xs`}
                    >
                      {artist.initials || artist.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-[#281C18] leading-tight">
                        {artist.name}
                      </h3>
                      <div className="text-[11px] font-bold tracking-wider text-[#429599] uppercase mt-0.5">
                        {specialty}
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="flex gap-2.5">
                    <div className="shrink-0 -mt-1 scale-[0.55] origin-top-left">
                      <AnimatedShamchiroq />
                    </div>
                    <div className="min-w-0">
                      {/* pre-line keeps the bio's own line breaks (Date of
                          birth / Education / ... each on its own line). */}
                      <p
                        className={`text-[13.5px] leading-relaxed text-[#5F534C] whitespace-pre-line ${
                          expandedBios.has(artist.id) ? '' : 'line-clamp-4'
                        }`}
                      >
                        {bio}
                      </p>
                      {bio && bio.length > 180 && (
                        <button
                          type="button"
                          onClick={() => toggleBio(artist.id)}
                          aria-expanded={expandedBios.has(artist.id)}
                          className="mt-1 text-xs font-semibold text-[#BA4E25] hover:underline cursor-pointer"
                        >
                          {expandedBios.has(artist.id) ? t.artists.showLess : t.artists.readMore}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3 Work Thumbnails */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {artist.paintings && artist.paintings.length > 0 ? (
                      artist.paintings.map((p: any, pIdx: number) => {
                        let src = '/assets/p-arch.svg';
                        try {
                          const parsed = JSON.parse(p.images);
                          if (Array.isArray(parsed) && parsed.length > 0) src = parsed[0];
                        } catch {
                          if (p.images) src = p.images;
                        }

                        return (
                          <div
                            key={pIdx}
                            className="aspect-square rounded-[2px] overflow-hidden border border-[#E7E0D8] relative bg-[#F4ECE1]"
                          >
                            <Image
                              src={src}
                              alt={p.title_en || 'Artwork'}
                              fill
                              className="object-cover transition-transform duration-500 hover:scale-115"
                            />
                          </div>
                        );
                      })
                    ) : (
                      // No placeholder "sample" artworks — they'd look like
                      // this artist's real pieces.
                      <p className="col-span-3 text-xs text-[#8F8178] italic py-3">
                        {t.artists.noWorksYet}
                      </p>
                    )}
                  </div>
                </div>

                {/* View works link — filters the gallery by this artist's id
                    (the gallery reads ?artist= from the URL). */}
                {artist.paintings && artist.paintings.length > 0 && (
                  <Link
                    href={`/gallery?artist=${encodeURIComponent(artist.id)}`}
                    className="text-xs font-bold text-[#BA4E25] hover:text-[#9C3E1B] flex items-center gap-1.5 pt-2 border-t border-[#F2ECE4]"
                  >
                    <span>{t.artists.viewWorks}</span>
                  </Link>
                )}
              </div>
            );
          })}

          {/* Join The Gallery Card */}
          <div className="bg-gradient-to-br from-[#281C18] to-[#1D100B] text-white rounded-[3px] p-8 flex flex-col justify-center gap-4 border border-[#3D2C26] shadow-md">
            <h3 className="font-serif text-2xl font-semibold text-[#FAF4EC]">
              {t.artists.joinTitle}
            </h3>
            <p className="text-sm leading-relaxed text-[#C5B7AD]">
              {t.artists.joinText}
            </p>
            <Link
              href="/contact?subject=Artist%20Portfolio%20Submission"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#5AB3B7] hover:underline pt-2"
            >
              <span>{t.artists.submitPortfolio}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
