'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/LocalizedLink';
import { History, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

// "Recently viewed": the last works a visitor opened, kept only in their
// browser (no database) — a tourist back home finds the piece they liked.
// The painting page records a small snapshot (title in the page language,
// photo, artist); listings show the strip.

const KEY = 'artqala_recent';
const MAX = 12;

export interface RecentItem {
  id: string;
  title: string;
  artist: string;
  image: string;
}

function read(): RecentItem[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((x) => x && typeof x.id === 'string') : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(item: RecentItem) {
  try {
    const next = [item, ...read().filter((x) => x.id !== item.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export default function RecentlyViewed({ excludeId, className = '' }: { excludeId?: string; className?: string }) {
  const { t } = useApp();
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    // Read after mount: the list lives in this browser only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(read().filter((x) => x.id !== excludeId));
  }, [excludeId]);

  if (items.length === 0) return null;

  const clear = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setItems([]);
  };

  return (
    <section className={className} aria-label={t.gallery.recentlyViewed}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-xs font-bold tracking-[2px] uppercase text-[#6B5E55]">
          <History className="w-4 h-4 text-[#BA4E25]" /> {t.gallery.recentlyViewed}
        </h2>
        <button onClick={clear} className="flex items-center gap-1 text-[11px] text-[#756962] hover:text-[#BA4E25]">
          <X className="w-3.5 h-3.5" /> {t.gallery.recentlyViewedClear}
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
        {items.map((it) => (
          <Link
            key={it.id}
            href={`/gallery/${it.id}`}
            className="shrink-0 w-28 sm:w-32 group"
          >
            <div className="relative w-full aspect-square overflow-hidden rounded-[3px] border border-[#E7E0D8] bg-[#F5EFE7]">
              <Image src={it.image} alt={it.title} fill sizes="128px" className="object-cover transition-transform group-hover:scale-105" />
            </div>
            <div className="mt-1.5 text-xs font-semibold text-[#281C18] line-clamp-1 group-hover:text-[#BA4E25]">{it.title}</div>
            {it.artist && <div className="text-[10.5px] text-[#756962] line-clamp-1">{it.artist}</div>}
          </Link>
        ))}
      </div>
    </section>
  );
}
