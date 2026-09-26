// Language-prefixed URLs for the public site.
//
// English lives at the plain URLs (/gallery, /artists/...), Russian and
// Uzbek under /ru/... and /uz/... . Every public page is really served from
// app/[lang]/..., and src/middleware.ts rewrites the unprefixed English URLs
// onto /en/... internally — so each language is a real, server-rendered,
// indexable page (the old language switch only swapped text in the
// browser, which search engines never saw).

import type { Language } from './translations';

export const LANGS: Language[] = ['en', 'ru', 'uz'];
export const DEFAULT_LANG: Language = 'en';
// Remembers the visitor's choice; the middleware sends unprefixed page
// requests from a browser with this cookie to its language's URL.
export const LANG_COOKIE = 'artqala_lang';

export const OG_LOCALE: Record<Language, string> = { en: 'en_US', ru: 'ru_RU', uz: 'uz_UZ' };

export function isLang(value: string | undefined | null): value is Language {
  return !!value && (LANGS as string[]).includes(value);
}

// "/ru/gallery?x=1" -> { lang: 'ru', path: '/gallery' }; unprefixed -> 'en'.
export function splitLangPath(pathname: string): { lang: Language; path: string } {
  const match = pathname.match(/^\/(en|ru|uz)(?=\/|$)(.*)$/);
  if (!match) return { lang: DEFAULT_LANG, path: pathname || '/' };
  return { lang: match[1] as Language, path: match[2] || '/' };
}

// "/gallery" in 'ru' -> "/ru/gallery"; English stays unprefixed.
export function localizePath(path: string, lang: Language): string {
  const clean = splitLangPath(path).path;
  if (lang === DEFAULT_LANG) return clean;
  return clean === '/' ? `/${lang}` : `/${lang}${clean}`;
}

// canonical + hreflang alternates for a page, for generateMetadata().
export function languageAlternates(path: string, lang: Language) {
  return {
    canonical: localizePath(path, lang),
    languages: {
      en: localizePath(path, 'en'),
      ru: localizePath(path, 'ru'),
      uz: localizePath(path, 'uz'),
      'x-default': localizePath(path, 'en'),
    },
  };
}
