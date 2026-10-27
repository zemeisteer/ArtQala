import { isBaseLang, translations, type Language } from '../translations';
import { mergeDictionary, type Dictionary, type ExtraLanguage } from '../dictionary';
import { de } from './de';
import { fr } from './fr';
import { ko } from './ko';
import { ja } from './ja';
import { zh } from './zh';

// Server-only: the [lang] layout hands the merged dictionary of an extra
// language to the client (RouteLangProvider), so these never ship in the
// shared JS bundle.
const EXTRA: Record<ExtraLanguage, Dictionary> = {
  de: mergeDictionary(de),
  fr: mergeDictionary(fr),
  ko: mergeDictionary(ko),
  ja: mergeDictionary(ja),
  zh: mergeDictionary(zh),
};

// The full dictionary of any language, for server components.
export function dictionaryFor(lang: Language): Dictionary {
  return isBaseLang(lang) ? translations[lang] : EXTRA[lang as ExtraLanguage];
}

export function extraDictionary(lang: Language): Dictionary | undefined {
  return isBaseLang(lang) ? undefined : EXTRA[lang as ExtraLanguage];
}
