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

const FIELDS = ['title', 'description', 'technique', 'name', 'bio', 'specialty'];

// For a page in `lang`: copies that language's translations over the
// English fields (which the UI falls back to for every language but RU/UZ)
// and drops the `translations` column, so a page never ships every
// language's texts. Walks nested records (painting.category.parent,
// painting.artist, review.painting, …). Use it on data handed to client
// components.
export function localizeContent<T>(data: T, lang: string, depth = 0): T {
  if (depth > 4 || data === null || typeof data !== 'object' || data instanceof Date) return data;
  if (Array.isArray(data)) return data.map((d) => localizeContent(d, lang, depth + 1)) as T;
  const r: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  if ('translations' in r) {
    const tr = BASE_LANGS.includes(lang) ? undefined : parseTranslations(r.translations)[lang];
    if (tr) for (const f of FIELDS) if (tr[f] && `${f}_en` in r) r[`${f}_en`] = tr[f];
    delete r.translations;
  }
  for (const [k, v] of Object.entries(r)) {
    if (v && typeof v === 'object' && !(v instanceof Date)) r[k] = localizeContent(v, lang, depth + 1);
  }
  return r as T;
}
