'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RouteLangContext } from '@/context/AppContext';
import type { Language } from '@/lib/i18n/translations';
import { DEFAULT_LANG, LANG_COOKIE, isLang, localizePath, splitLangPath } from '@/lib/i18n/routing';

function rememberLang(lang: Language) {
  try {
    localStorage.setItem(LANG_COOKIE, lang);
  } catch {}
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
}

function readLangCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([a-z]{2})`));
  return match ? match[1] : null;
}

export default function RouteLangProvider({ lang, children }: { lang: Language; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Switching language = going to the same page in the other language.
  const setLang = useCallback(
    (next: Language) => {
      rememberLang(next);
      if (next === lang) return;
      const search = typeof window !== 'undefined' ? window.location.search : '';
      router.push(`${localizePath(splitLangPath(pathname).path, next)}${search}`);
    },
    [lang, pathname, router]
  );

  // Visitors who picked Russian/Uzbek before language URLs existed only
  // have it in localStorage, which the middleware can't see: carry it over
  // to the cookie once and move them to their language's URL.
  useEffect(() => {
    if (lang !== DEFAULT_LANG || readLangCookie()) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_COOKIE);
    } catch {}
    if (isLang(saved) && saved !== DEFAULT_LANG) {
      rememberLang(saved);
      router.replace(`${localizePath(splitLangPath(pathname).path, saved)}${window.location.search}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return (
    <RouteLangContext.Provider value={value}>
      {/* lang attribute for the page content, matching its URL */}
      <div lang={lang} className="flex flex-col min-h-screen">
        {children}
      </div>
    </RouteLangContext.Provider>
  );
}
