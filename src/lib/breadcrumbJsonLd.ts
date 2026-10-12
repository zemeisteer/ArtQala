import type { Language } from '@/lib/i18n/translations';
import { localizePath } from '@/lib/i18n/routing';

export interface BreadcrumbEntry {
  name: string;
  path: string; // site-relative, e.g. "/gallery" or "/gallery/abc123"
}

// Home is always position 1 — callers only pass the trail after it. Every
// item URL is the page's own language version (/ru/..., /uz/...), so the
// trail on a Russian page doesn't point at the English pages.
export function buildBreadcrumbJsonLd(trail: BreadcrumbEntry[], siteUrl: string, lang: Language = 'en') {
  const items: BreadcrumbEntry[] = [{ name: 'Home', path: '/' }, ...trail];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${localizePath(item.path, lang)}`,
    })),
  };
}
