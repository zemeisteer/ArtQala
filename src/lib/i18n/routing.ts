// Language-prefixed URLs for the public site.
//
// English lives at the plain URLs (/gallery, /artists/...), Russian and
// Uzbek under /ru/... and /uz/... . Every public page is really served from
// app/[lang]/..., and src/middleware.ts rewrites the unprefixed English URLs
// onto /en/... internally — so each language is a real, server-rendered,
// indexable page (the old language switch only swapped text in the
// browser, which search engines never saw).

import type { Language } from './translations';

export const LANGS: Language[] = ['en', 'ru', 'uz', 'de', 'fr', 'ko', 'ja', 'zh'];
export const DEFAULT_LANG: Language = 'en';
// Remembers the visitor's choice; the middleware sends unprefixed page
// requests from a browser with this cookie to its language's URL.
export const LANG_COOKIE = 'artqala_lang';

export const OG_LOCALE: Record<Language, string> = {
  en: 'en_US',
  ru: 'ru_RU',
  uz: 'uz_UZ',
  de: 'de_DE',
  fr: 'fr_FR',
  ko: 'ko_KR',
  ja: 'ja_JP',
  zh: 'zh_CN',
};

// Each language's own name, for the language picker.
export const LANG_NAMES: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  uz: "O'zbekcha",
  de: 'Deutsch',
  fr: 'Français',
  ko: '한국어',
  ja: '日本語',
  zh: '中文',
};

// hreflang codes (zh = Simplified Chinese).
const HREFLANG: Record<Language, string> = { en: 'en', ru: 'ru', uz: 'uz', de: 'de', fr: 'fr', ko: 'ko', ja: 'ja', zh: 'zh-Hans' };

export function isLang(value: string | undefined | null): value is Language {
  return !!value && (LANGS as string[]).includes(value);
}

const LANG_PREFIX = new RegExp(`^\\/(${LANGS.join('|')})(?=\\/|$)(.*)$`);

// "/ru/gallery?x=1" -> { lang: 'ru', path: '/gallery' }; unprefixed -> 'en'.
export function splitLangPath(pathname: string): { lang: Language; path: string } {
  const match = pathname.match(LANG_PREFIX);
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
      ...Object.fromEntries(LANGS.map((l) => [HREFLANG[l], localizePath(path, l)])),
      'x-default': localizePath(path, 'en'),
    },
  };
}
