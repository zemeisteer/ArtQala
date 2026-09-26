'use client';

import React from 'react';
import Link from '@/components/LocalizedLink';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Star, ShieldCheck, Sparkles, ExternalLink, ArrowRight, MessageSquareCheck } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';

interface ReviewsClientProps {
  initialReviews: any[];
}

const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

function formatReviewDate(dateStr: string, lang: 'en' | 'ru' | 'uz'): string {
  const date = new Date(dateStr);
  if (lang === 'uz') {
    return `${date.getDate()}-${UZ_MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
  }
  return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ReviewsClient({ initialReviews }: ReviewsClientProps) {
  const { user, lang, t } = useApp();

  const totalCount = initialReviews.length;
  const avgRating =
    totalCount > 0
      ? +(initialReviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1)
      : 5.0;

  return (
    <div className="py-14 sm:py-16">
      <Breadcrumbs items={[{ label: t.footer.reviews }]} />
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        {/* Page Head */}
        <div className="max-w-2xl mb-12 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">
              {t.reviews.pageEyebrow}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-[#DAA932]" />
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18]">
            {t.reviews.pageTitle}
          </h1>
          <p className="text-sm sm:text-base text-[#6E6057] leading-relaxed">
            {t.reviews.pageSubtitle}
          </p>
        </div>

        {/* 2-Column: Reviews Grid on Left, Authenticity & Submission Info on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Reviews List (Left) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Overall Rating Banner */}
            <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-serif font-bold text-[#BA4E25]">
                  {avgRating.toFixed(1)}
                </div>
                <div>
                  <div className="flex text-[#DAA932]">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(avgRating) ? 'fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[#726861] mt-0.5 block">
                    {t.reviews.basedOn} {totalCount} {t.reviews.verifiedCollector} {totalCount === 1 ? t.reviews.reviewSingular : t.reviews.reviewPlural}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-[#16A34A] bg-[#DCFCE7] px-3 py-1.5 rounded-full border border-[#BBF7D0]">
                <MessageSquareCheck className="w-4 h-4" />
                <span>{t.reviews.fullyVerifiedBadge}</span>
              </div>
            </div>

            {initialReviews.length > 0 ? (
              <div className="space-y-4">
                {initialReviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-3.5 shadow-xs hover:border-[#BA4E25]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-lg font-semibold text-[#281C18]">
                            {r.author_name}
                          </h3>
                          <span className="bg-[#FAF4EC] border border-[#E7E0D8] text-[#BA4E25] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {t.reviews.verifiedCollectorBadge}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#8F8178]">
                          {formatReviewDate(r.created_at, lang)}
                        </span>
                      </div>

                      <div className="flex text-[#DAA932] shrink-0">
                        {[...Array(r.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-[#4D3F38] leading-relaxed italic bg-[#FAF4EC]/30 p-4 rounded-[3px] border border-[#F0EAE1]">
                      "{r.text}"
                    </p>

                    {r.painting && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F0EAE1]">
                        <span className="text-[#8F8178]">{t.reviews.artworkLabel}</span>
                        <Link
                          href={`/gallery/${r.painting.id}`}
                          className="font-semibold text-[#BA4E25] hover:underline flex items-center gap-1"
                        >
                          <span>
                            {lang === 'ru'
                              ? r.painting.title_ru
                              : lang === 'uz'
                              ? r.painting.title_uz
                              : r.painting.title_en}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] text-center space-y-2">
                <p className="text-sm font-semibold text-[#4D3F38]">
                  {t.reviews.noReviewsTitle}
                </p>
                <p className="text-xs text-[#726861]">
                  {t.reviews.noReviewsDesc}
                </p>
              </div>
            )}
          </div>

          {/* Right Sidebar: Policy & Leave Review Guide */}
          <div className="lg:col-span-4 space-y-6">
            {/* How Reviews Work */}
            <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-[#429599]">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-serif text-xl font-semibold text-[#281C18]">
                  {t.reviews.policyTitle}
                </h3>
              </div>

              <p className="text-xs text-[#6B5E55] leading-relaxed">
                {t.reviews.policyDesc}
              </p>

              <div className="space-y-2 pt-2 border-t border-[#EFE8DE] text-xs text-[#554740]">
                <div className="flex items-start gap-2">
                  <span className="text-[#BA4E25] font-bold">1.</span>
                  <span>{t.reviews.step1}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#BA4E25] font-bold">2.</span>
                  <span>{t.reviews.step2}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#BA4E25] font-bold">3.</span>
                  <span>{t.reviews.step3}</span>
                </div>
              </div>

              <div className="pt-2">
                {user ? (
                  <Link
                    href="/account"
                    className="w-full bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-xs py-3 rounded-[3px] transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <span>{t.reviews.goToMyInquiries}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    href="/signin"
                    className="w-full bg-[#281C18] hover:bg-[#BA4E25] text-white font-semibold text-xs py-3 rounded-[3px] transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <span>{t.reviews.signInToLeaveFeedback}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Gallery Heritage Box */}
            <div className="bg-[#FAF4EC] border border-[#E7E0D8] rounded-[4px] p-6 space-y-3">
              <span className="text-[10.5px] font-bold tracking-wider text-[#BA4E25] uppercase">
                {t.reviews.certifiedEyebrow}
              </span>
              <h4 className="font-serif text-lg font-semibold text-[#281C18]">
                {t.reviews.culturalOriginalTitle}
              </h4>
              <p className="text-xs text-[#6B5E55] leading-relaxed">
                {t.reviews.culturalOriginalDesc}
              </p>
              <Link
                href="/gallery"
                className="inline-block text-xs font-bold text-[#429599] hover:underline pt-1"
              >
                {t.reviews.browseArtworks}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
