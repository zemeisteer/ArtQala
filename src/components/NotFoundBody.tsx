'use client';

import React from 'react';
import Link from '@/components/LocalizedLink';
import { useApp } from '@/context/AppContext';
import { Compass, Home } from 'lucide-react';

// The 404 message itself — used by app/not-found.tsx (unknown URLs, with
// its own header/footer) and app/[lang]/not-found.tsx (e.g. a painting id
// that doesn't exist, inside the public layout).
export default function NotFoundBody() {
  const { t } = useApp();

  return (
    <div className="flex-grow min-h-[70vh] flex items-center justify-center px-6 py-20 bg-[#FAF4EC]">
      <div className="max-w-md w-full text-center space-y-5">
        <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">
          {t.notFound.eyebrow}
        </span>
        <div className="font-serif text-7xl sm:text-8xl font-semibold text-[#BA4E25]">404</div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#281C18]">
          {t.notFound.title}
        </h1>
        <p className="text-sm text-[#6E6057] leading-relaxed">{t.notFound.description}</p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-sm px-6 py-3 rounded-[3px] transition-all shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>{t.notFound.backHomeBtn}</span>
          </Link>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 border border-[#281C18] hover:border-[#BA4E25] text-[#281C18] hover:text-[#BA4E25] font-semibold text-sm px-6 py-3 rounded-[3px] transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>{t.notFound.browseGalleryBtn}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
