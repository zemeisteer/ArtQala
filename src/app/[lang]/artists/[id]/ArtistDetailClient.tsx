'use client';

import React from 'react';
import Image from 'next/image';
import { Award, FileText } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Breadcrumbs from '@/components/Breadcrumbs';
import PaintingCard, { PaintingItem } from '@/components/PaintingCard';
import AnimatedMadohil from '@/components/patterns/AnimatedMadohil';
import { achievementTitle, isPdfFile, parseAchievements } from '@/lib/artistAchievements';

interface ArtistDetailClientProps {
  artist: {
    id: string;
    name: string;
    photo?: string | null;
    pdf?: string | null;
    achievements?: string | null;
    initials?: string | null;
    bio_en: string;
    bio_ru: string;
    bio_uz: string;
    specialty_en: string;
    specialty_ru: string;
    specialty_uz: string;
    paintings: unknown[];
  };
}

export default function ArtistDetailClient({ artist }: ArtistDetailClientProps) {
  const { lang, t } = useApp();
  const bio = (lang === 'ru' ? artist.bio_ru : lang === 'uz' ? artist.bio_uz : artist.bio_en) || artist.bio_en;
  const specialty =
    (lang === 'ru' ? artist.specialty_ru : lang === 'uz' ? artist.specialty_uz : artist.specialty_en) ||
    artist.specialty_en;
  const paintings = artist.paintings as PaintingItem[];
  const achievements = parseAchievements(artist.achievements);

  return (
    <div className="py-14 sm:py-16">
      <Breadcrumbs items={[{ label: t.nav.artists, href: '/artists' }, { label: artist.name }]} />
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        <AnimatedMadohil />

        {/* Artist header: photo, name, specialty, full bio, portfolio */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-14">
          <div className="shrink-0">
            {artist.photo ? (
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border border-[#E7E0D8] shadow-sm">
                <Image src={artist.photo} alt={artist.name} fill sizes="176px" priority className="object-cover" />
              </div>
            ) : (
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#BA4E25] text-white font-serif font-bold text-5xl flex items-center justify-center shadow-sm">
                {artist.initials || artist.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="space-y-4 max-w-3xl">
            <div>
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18]">{artist.name}</h1>
              {specialty && (
                <div className="text-xs font-bold tracking-[2px] text-[#429599] uppercase mt-2">{specialty}</div>
              )}
            </div>
            {bio && <p className="text-[15px] leading-relaxed text-[#5F534C] whitespace-pre-line">{bio}</p>}
            {artist.pdf && (
              <a
                href={artist.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#BA4E25] border border-[#BA4E25]/30 rounded-full px-3.5 py-2 hover:bg-[#BA4E25]/5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                {t.artists.portfolioPdf}
              </a>
            )}
          </div>
        </div>

        {/* Awards & certificates (Admin → Artists) */}
        {achievements.length > 0 && (
          <div className="mb-14 border-t border-[#E7E0D8] pt-10">
            <h2 className="font-serif text-3xl font-semibold text-[#281C18] mb-6">{t.artists.achievementsHeading}</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[3px] p-4"
                >
                  {a.file && !isPdfFile(a.file) ? (
                    <a
                      href={a.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative w-16 h-16 shrink-0 rounded-[2px] overflow-hidden border border-[#E7E0D8] bg-white"
                    >
                      <Image src={a.file} alt={achievementTitle(a, lang)} fill sizes="64px" className="object-cover" />
                    </a>
                  ) : (
                    <span className="w-10 h-10 shrink-0 rounded-full bg-[#BA4E25]/10 text-[#BA4E25] flex items-center justify-center">
                      <Award className="w-5 h-5" />
                    </span>
                  )}
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-[#281C18] leading-snug">{achievementTitle(a, lang)}</p>
                    <div className="flex items-center gap-3 text-xs text-[#8F8178]">
                      {a.year && <span>{a.year}</span>}
                      {a.file && (
                        <a
                          href={a.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#BA4E25] hover:underline"
                        >
                          <FileText className="w-3 h-3" />
                          {t.artists.viewDocument}
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Every work of theirs in the gallery */}
        <div className="flex items-baseline justify-between mb-6 border-t border-[#E7E0D8] pt-10">
          <h2 className="font-serif text-3xl font-semibold text-[#281C18]">{t.artists.worksHeading}</h2>
          <span className="text-xs text-[#8F8178]">{paintings.length}</span>
        </div>
        {paintings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paintings.map((p, i) => (
              <PaintingCard key={p.id} painting={p} priority={i < 4} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8F8178] italic">{t.artists.noWorksYet}</p>
        )}
      </div>
    </div>
  );
}
