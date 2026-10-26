'use client';

import React from 'react';
import { Star, ExternalLink, PenLine } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { GooglePlaceReviews } from '@/lib/googleReviews';

export interface GoogleMapLink {
  label: string;
  url: string;
}

function GoogleMark() {
  return (
    <span className="font-semibold tracking-tight" aria-label="Google">
      <span className="text-[#4285F4]">G</span>
      <span className="text-[#EA4335]">o</span>
      <span className="text-[#FBBC05]">o</span>
      <span className="text-[#4285F4]">g</span>
      <span className="text-[#34A853]">l</span>
      <span className="text-[#EA4335]">e</span>
    </span>
  );
}

function Stars({ value, size = 'w-3.5 h-3.5' }: { value: number; size?: string }) {
  return (
    <div className="flex text-[#FBBC05]">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`${size} ${i < Math.round(value) ? 'fill-current' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

const linkBtn =
  'inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-[3px] border transition';

// The gallery's Google Maps reviews (when GOOGLE_PLACES_API_KEY is set),
// otherwise just buttons to its Google Maps page(s) from Settings.
export default function GoogleReviews({ places, mapLinks }: { places: GooglePlaceReviews[]; mapLinks: GoogleMapLink[] }) {
  const { t } = useApp();
  const g = t.reviews;
  const withReviews = places.filter((p) => p.rating !== null || p.reviews.length);
  if (!withReviews.length && !mapLinks.length) return null;

  if (!withReviews.length) {
    return (
      <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-3 shadow-xs">
        <h2 className="font-serif text-xl font-semibold text-[#281C18] flex items-center gap-2">
          <GoogleMark /> <span>{g.googleTitle}</span>
        </h2>
        <p className="text-xs text-[#6B5E55] leading-relaxed">{g.googleSubtitle}</p>
        <div className="flex flex-wrap gap-2">
          {mapLinks.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkBtn} border-[#E7E0D8] bg-white text-[#281C18] hover:border-[#BA4E25]`}
            >
              <span>{mapLinks.length > 1 ? `${g.googleRead} — ${l.label}` : g.googleRead}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {withReviews.map((p, idx) => (
        <div key={idx} className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#281C18] flex items-center gap-2">
                <GoogleMark /> <span>{g.googleTitle}</span>
              </h2>
              {withReviews.length > 1 && <p className="text-xs text-[#8F8178]">{p.name}</p>}
            </div>
            {p.rating !== null && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-serif font-bold text-[#281C18]">{p.rating.toFixed(1)}</span>
                <div>
                  <Stars value={p.rating} size="w-4 h-4" />
                  <span className="text-[11px] text-[#726861]">{g.googleCount.replace('{n}', String(p.count))}</span>
                </div>
              </div>
            )}
          </div>

          {p.reviews.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {p.reviews.map((r, i) => (
                <div key={i} className="bg-white border border-[#EFE8DE] rounded-[3px] p-4 space-y-2">
                  <div className="flex items-center gap-2.5">
                    {r.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photo} alt="" width={32} height={32} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-[#E7E0D8] flex items-center justify-center text-xs font-bold text-[#6B5E55]">
                        {r.author.slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0">
                      {r.authorUrl ? (
                        <a href={r.authorUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#281C18] hover:underline truncate block">
                          {r.author}
                        </a>
                      ) : (
                        <span className="text-sm font-semibold text-[#281C18] truncate block">{r.author}</span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Stars value={r.rating} size="w-3 h-3" />
                        <span className="text-[11px] text-[#9E9086]">{r.when}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[#4D3F38] leading-relaxed line-clamp-6">{r.text}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {p.reviewsUrl && (
              <a href={p.reviewsUrl} target="_blank" rel="noopener noreferrer" className={`${linkBtn} border-[#E7E0D8] bg-white text-[#281C18] hover:border-[#BA4E25]`}>
                <span>{g.googleReadAll}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {p.writeUrl && (
              <a href={p.writeUrl} target="_blank" rel="noopener noreferrer" className={`${linkBtn} border-[#281C18] bg-[#281C18] text-white hover:bg-[#BA4E25] hover:border-[#BA4E25]`}>
                <PenLine className="w-3.5 h-3.5" />
                <span>{g.googleWrite}</span>
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
