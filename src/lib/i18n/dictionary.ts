import { translations, type Language } from './translations';

// The UI texts of one language. EN/RU/UZ are complete in translations.ts;
// the other languages (src/lib/i18n/extra/) override English key by key,
// so a missing key simply shows in English.

export type Dictionary = (typeof translations)['en'];
type DeepPartial<T> = { [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K] };
// The admin panel stays EN/RU/UZ only.
export type ExtraDictionary = DeepPartial<Omit<Dictionary, 'admin'>>;
export type ExtraLanguage = Exclude<Language, 'en' | 'ru' | 'uz'>;

function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== 'object') return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = out[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' ? merge(b, v) : v ?? b;
  }
  return out as T;
}

export function mergeDictionary(extra: ExtraDictionary): Dictionary {
  return merge(translations.en, extra);
}
