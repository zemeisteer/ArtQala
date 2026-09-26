'use client';

import React, { useEffect, useState } from 'react';
import Link from '@/components/LocalizedLink';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import PaintingCard, { PaintingItem } from '@/components/PaintingCard';
import { Palette, Users, Brush, ArrowRight } from 'lucide-react';
import AnimatedGirihWatermark from '@/components/patterns/AnimatedGirihWatermark';
import AnimatedIslimiyDivider from '@/components/patterns/AnimatedIslimiyDivider';
import AnimatedMadohil from '@/components/patterns/AnimatedMadohil';

function firstImage(images: string): string {
  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
  } catch {
    if (images && !images.startsWith('[')) return images;
  }
  return '/assets/p-arch.svg';
}

interface HomeClientProps {
  featuredPaintings: any[];
}

export default function HomeClient({ featuredPaintings }: HomeClientProps) {
  const { t, lang } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Hero carousel shows real featured gallery pieces (up to 5) instead of
  // fixed demo artwork/artist names that don't exist in the database.
  const heroSlides = featuredPaintings.slice(0, 5).map((p) => ({
    id: p.id,
    image: firstImage(p.images),
    title_en: p.title_en,
    title_uz: p.title_uz,
    title_ru: p.title_ru,
    artist: p.artist?.name || '',
    year: String(p.year),
  }));

  useEffect(() => {
    if (heroSlides.length < 2) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Night Gallery Hero Section */}
      <section className="relative overflow-hidden bg-[#1D100B] text-[#FAF4EC] py-20 sm:py-24 lg:py-28">
        {/* Animated Uzbek Ikat pattern background */}
        <div
          className="absolute -inset-[20%] pointer-events-none opacity-85 animate-pattern-drift"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, rgba(186, 78, 37, 0.16) 0 2px, transparent 2px 55px),
              repeating-linear-gradient(-45deg, rgba(66, 149, 153, 0.14) 0 2px, transparent 2px 55px)
            `,
          }}
        />

        {/* Girih watermark — subtle Ichan-Qala minaret motif behind the hero */}
        <AnimatedGirihWatermark className="text-[#FAF4EC]" />

        <div className="relative z-10 max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Text Block */}
          <div className="flex-1 text-center lg:text-left space-y-5">
            <span className="inline-block text-xs font-semibold tracking-[4px] text-[#5AB3B7] uppercase">
              {t.hero.location}
            </span>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.12] shimmer-gold">
              {t.hero.title}
            </h1>

            <p className="text-base sm:text-lg text-[#D0C2B7] leading-relaxed max-w-xl mx-auto lg:mx-0">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
              <Link
                href="/gallery"
                className="bg-[#BA4E25] hover:bg-[#9C3E1B] text-[#FAF4EC] font-semibold text-sm px-7 py-3.5 rounded-[3px] transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                {t.hero.exploreBtn}
              </Link>

              <Link
                href="/artists"
                className="border border-[#C8B8AB] hover:border-[#BA4E25] text-[#FAF4EC] hover:text-[#BA4E25] font-semibold text-sm px-6 py-3.5 rounded-[3px] transition-all duration-300"
              >
                {t.hero.artistsBtn}
              </Link>
            </div>
          </div>

          {/* Right Floating Art Carousel with Spotlight (TZ Section 8.9) */}
          <div className="relative flex-1 w-full max-w-[440px] lg:max-w-[480px] aspect-square flex items-center justify-center">
            {/* Glowing spotlight pulse */}
            <div
              className="absolute inset-[-15%] rounded-full filter blur-[24px] pointer-events-none animate-glow-pulse"
              style={{
                background:
                  'radial-gradient(circle, rgba(186, 78, 37, 0.45) 0%, rgba(66, 149, 153, 0.25) 45%, transparent 72%)',
              }}
            />

            {/* Floating Art Frame Carousel — real featured pieces from the gallery */}
            <div className="relative w-full h-full rounded-[4px] overflow-hidden border border-[#52443E] shadow-[0_35px_70px_-25px_rgba(0,0,0,0.85)] animate-float bg-[#281C18] group">
              {heroSlides.length === 0 ? (
                <Image src="/assets/p-arch.svg" alt="Art Qala" fill priority className="object-cover" />
              ) : (
                heroSlides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ${
                      currentSlide === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                  >
                    <Image
                      src={slide.image}
                      alt={
                        lang === 'uz' ? slide.title_uz : lang === 'ru' ? slide.title_ru : slide.title_en
                      }
                      fill
                      priority={idx === 0}
                      className="object-cover"
                    />
                  </div>
                ))
              )}

              {/* Slide Counter & Dots */}
              {heroSlides.length > 1 && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-[#1D100B]/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10">
                  {heroSlides.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => setCurrentSlide(dotIdx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        currentSlide === dotIdx
                          ? 'w-5 bg-[#DAA932]'
                          : 'w-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                      aria-label={`Slide ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Slide Details Overlay */}
              {heroSlides.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 z-20 bg-[#1D100B]/85 backdrop-blur-xs p-3.5 rounded-[3px] border border-[#FAF4EC]/10 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-serif font-semibold text-sm text-[#FAF4EC]">
                      {lang === 'uz'
                        ? heroSlides[currentSlide].title_uz
                        : lang === 'ru'
                        ? heroSlides[currentSlide].title_ru
                        : heroSlides[currentSlide].title_en}
                    </div>
                    <div className="text-[11px] text-[#A6988E]">
                      {heroSlides[currentSlide].artist} · {heroSlides[currentSlide].year}
                    </div>
                  </div>
                  <Link
                    href={`/gallery/${heroSlides[currentSlide].id}`}
                    className="text-xs font-semibold text-[#5AB3B7] hover:text-[#DAA932] transition-colors"
                  >
                    {lang === 'uz' ? "Ko'rish →" : lang === 'ru' ? 'Смотреть →' : 'View →'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Works Section */}
      <section className="py-20 sm:py-24 bg-[#F5EFE7] border-b border-[#E7E0D8]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
          <AnimatedMadohil />
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 reveal">
            <div>
              <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">
                {t.home.featuredEyebrow}
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#281C18] mt-2">
                {t.home.featuredTitle}
              </h2>
            </div>
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 border border-[#281C18] hover:border-[#BA4E25] text-[#281C18] hover:text-[#BA4E25] font-semibold text-sm px-5 py-2.5 rounded-[3px] transition-all self-start sm:self-auto"
            >
              <span>{t.home.viewAll}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
            {featuredPaintings.slice(0, 4).map((painting, idx) => (
              <div key={painting.id} className="reveal" style={{ transitionDelay: `${idx * 0.1}s` }}>
                <PaintingCard painting={painting as PaintingItem} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Islimiy divider — replaces the old static zigzag with the animated Xorazm motif */}
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        <AnimatedIslimiyDivider />
      </div>

      {/* What We Offer Section */}
      <section className="py-20 sm:py-24 bg-[#FAF4EC]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
          <AnimatedMadohil />
          <div className="text-center max-w-xl mx-auto mb-14 reveal">
            <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">
              {t.home.whatWeOfferEyebrow}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#281C18] mt-2">
              {t.home.whatWeOfferTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {/* Offer 1: Paintings */}
            <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[3px] p-8 flex flex-col justify-between transition-all duration-400 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#BA4E25]/40 group reveal">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#BA4E25]/10 flex items-center justify-center text-[#BA4E25] group-hover:scale-110 transition-transform">
                  <Palette className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-2xl font-semibold text-[#281C18]">
                  {t.home.offerOriginalsTitle}
                </h3>
                <p className="text-sm leading-relaxed text-[#5F534C]">
                  {t.home.offerOriginalsText}
                </p>
              </div>
              <Link
                href="/gallery"
                className="text-xs font-bold text-[#BA4E25] hover:text-[#9C3E1B] flex items-center gap-1.5 pt-6 mt-auto"
              >
                <span>{t.home.offerOriginalsLink}</span>
              </Link>
            </div>

            {/* Offer 2: Artists */}
            <div
              className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[3px] p-8 flex flex-col justify-between transition-all duration-400 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#429599]/40 group reveal"
              style={{ transitionDelay: '0.1s' }}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#429599]/10 flex items-center justify-center text-[#429599] group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-2xl font-semibold text-[#281C18]">
                  {t.home.offerArtistsTitle}
                </h3>
                <p className="text-sm leading-relaxed text-[#5F534C]">
                  {t.home.offerArtistsText}
                </p>
              </div>
              <Link
                href="/artists"
                className="text-xs font-bold text-[#429599] hover:text-[#28696B] flex items-center gap-1.5 pt-6 mt-auto"
              >
                <span>{t.home.offerArtistsLink}</span>
              </Link>
            </div>

            {/* Offer 3: Services */}
            <div
              className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[3px] p-8 flex flex-col justify-between transition-all duration-400 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#BA4E25]/40 group reveal"
              style={{ transitionDelay: '0.2s' }}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#BA4E25]/10 flex items-center justify-center text-[#BA4E25] group-hover:scale-110 transition-transform">
                  <Brush className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-2xl font-semibold text-[#281C18]">
                  {t.home.offerServicesTitle}
                </h3>
                <p className="text-sm leading-relaxed text-[#5F534C]">
                  {t.home.offerServicesText}
                </p>
              </div>
              <Link
                href="/services"
                className="text-xs font-bold text-[#BA4E25] hover:text-[#9C3E1B] flex items-center gap-1.5 pt-6 mt-auto"
              >
                <span>{t.home.offerServicesLink}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Warm Banner */}
      <section className="bg-gradient-to-r from-[#BA4E25] to-[#8C3413] text-white py-14 sm:py-16 shadow-inner">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left space-y-1.5">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold">
              {t.home.ctaTitle}
            </h2>
            <p className="text-sm text-[#F7DCD2]">{t.home.ctaSubtitle}</p>
          </div>
          <Link
            href="/contact"
            className="bg-[#FAF4EC] hover:bg-white text-[#BA4E25] font-semibold text-sm px-7 py-3.5 rounded-[3px] transition-all duration-300 shadow-md hover:scale-105 shrink-0"
          >
            {t.home.ctaBtn}
          </Link>
        </div>
      </section>
    </div>
  );
}
