// Catalogue texts are typed in the admin in UZ/EN/RU (`title_uz`, …). The
// site's other languages read machine translations kept in the record's
// `translations` column: JSON { de: { title: "…", description: "…" }, … },
// filled from the English text (src/lib/translateContent.ts). Anything
// missing falls back to English.

const BASE_LANGS = ['en', 'ru', 'uz'];

export type ContentTranslations = Record<string, Record<string, string>>;

export function parseTranslations(raw: unknown): ContentTranslations {
  if (typeof raw !== 'string' || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as ContentTranslations) : {};
  } catch {
    return {};
  }
}

// pick(painting, 'title', lang) → the painting's title in that language.
export function pick(record: object | null | undefined, field: string, lang: string): string {
  if (!record) return '';
  const r = record as Record<string, unknown>;
  const own = (l: string) => (typeof r[`${field}_${l}`] === 'string' ? (r[`${field}_${l}`] as string) : '');
  if (BASE_LANGS.includes(lang)) return own(lang) || own('en');
  return parseTranslations(r.translations)[lang]?.[field] || own('en');
}
