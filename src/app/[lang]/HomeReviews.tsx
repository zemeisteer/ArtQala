'use client';

import React from 'react';
import Link from '@/components/LocalizedLink';
import { Star, MessageSquarePlus, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export interface HomeReview {
  id: string;
  author_name: string;
  rating: number;
  text: string;
}

// The latest approved reviews on the home page, with a way to write one —
// the Reviews page is otherwise only linked from the menu and the footer.
export default function HomeReviews({ reviews, average, count }: { reviews: HomeReview[]; average: number; count: number }) {
  const { t } = useApp();
  const r = t.reviews;

  return (
    <section className="py-16 sm:py-20 bg-[#F5EFE7] border-t border-[#E7E0D8]">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">{r.homeEyebrow}</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#281C18]">{r.homeTitle}</h2>
            {count > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="font-serif text-xl font-bold text-[#BA4E25]">{average.toFixed(1)}</span>
                <div className="flex text-[#DAA932]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.round(average) ? 'fill-current' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-xs text-[#726861]">
                  {count} {count === 1 ? r.reviewSingular : r.reviewPlural}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {count > 0 && (
              <Link
                href="/reviews"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-[3px] border border-[#E7E0D8] bg-white text-[#281C18] hover:border-[#BA4E25] transition"
              >
                <span>{r.allReviews}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <Link
              href="/reviews#write-review"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-[3px] bg-[#BA4E25] hover:bg-[#9C3E1B] text-white transition shadow-xs"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>{r.leaveReview}</span>
            </Link>
          </div>
        </div>

        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-5 space-y-3 shadow-xs">
                <div className="flex text-[#DAA932]">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-[#4D3F38] leading-relaxed italic line-clamp-5">&ldquo;{rev.text}&rdquo;</p>
                <p className="font-serif font-semibold text-sm text-[#281C18]">{rev.author_name}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6B5E55]">{r.homeEmpty}</p>
        )}
      </div>
    </section>
  );
}
