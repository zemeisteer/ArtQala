'use client';

import { useRef, useState } from 'react';

export type Lang = 'uz' | 'ru' | 'en';
export const LANGS: Lang[] = ['uz', 'ru', 'en'];

// One trilingual field group: current value + setter per language.
export type FieldGroup = Record<Lang, readonly [string, (value: string) => void]>;

export async function requestTranslation(
  text: string,
  sourceLang: Lang
): Promise<Partial<Record<Lang, string>> | null> {
  if (!text.trim()) return null;
  try {
    const res = await fetch('/api/admin/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLang }),
    });
    const data = await res.json();
    return data.success && data.translations ? data.translations : null;
  } catch {
    return null;
  }
}

// Save-time safety net: if the admin submitted before a blur translation
// finished (or it failed), translate whatever languages are still empty from
// one that isn't — so an EN/RU visitor never gets a blank or Uzbek field.
export async function fillMissingTranslations(
  values: Record<Lang, string>,
  preferredSource?: Lang
): Promise<Record<Lang, string>> {
  const missing = LANGS.filter((l) => !values[l].trim());
  const source =
    preferredSource && values[preferredSource].trim()
      ? preferredSource
      : LANGS.find((l) => values[l].trim());
  if (missing.length === 0 || !source) return values;
  const translations = await requestTranslation(values[source], source);
  const out = { ...values };
  for (const l of missing) {
    if (translations?.[l]) out[l] = translations[l] as string;
  }
  return out;
}

// Auto-translate for UZ/RU/EN admin fields. Whichever language the admin
// actually edits becomes the source: on blur, if its text changed, the other
// two are (re)translated from it — including ones that already hold an older
// translation, which is what used to go stale. A field the admin typed into
// themselves during this session is never overwritten, and any overwrite of
// existing text can be reverted once via `undo(group)`.
//
// Usage: <input value={x} onChange={...} {...bind('title', 'uz', groups.title)} />
export function useAutoTranslate() {
  const [translatingGroup, setTranslatingGroup] = useState<string | null>(null);
  const [undoable, setUndoable] = useState<Record<string, Partial<Record<Lang, string>>>>({});

  const manual = useRef(new Map<string, Set<Lang>>());
  const focusValues = useRef(new Map<string, string>());
  const seq = useRef(new Map<string, number>());
  const latest = useRef(new Map<string, FieldGroup>());

  const isManual = (group: string, lang: Lang) => manual.current.get(group)?.has(lang) ?? false;
  const markManual = (group: string, lang: Lang) => {
    if (!manual.current.has(group)) manual.current.set(group, new Set());
    manual.current.get(group)!.add(lang);
  };

  const translateGroup = async (group: string, sourceLang: Lang, text: string) => {
    const mySeq = (seq.current.get(group) || 0) + 1;
    seq.current.set(group, mySeq);
    setTranslatingGroup(group);

    const before = latest.current.get(group);
    const snapshot = before
      ? (Object.fromEntries(LANGS.map((l) => [l, before[l][0]])) as Record<Lang, string>)
      : null;

    const translations = await requestTranslation(text, sourceLang);

    if (seq.current.get(group) !== mySeq) return; // a newer edit superseded this one
    setTranslatingGroup((g) => (g === group ? null : g));
    const fields = latest.current.get(group);
    if (!translations || !fields || !snapshot) return;

    const replaced: Partial<Record<Lang, string>> = {};
    for (const lang of LANGS) {
      if (lang === sourceLang) continue;
      const value = translations[lang];
      if (!value || isManual(group, lang)) continue;
      const [current, setValue] = fields[lang];
      // The admin typed here while the request was in flight — keep it.
      if (current !== snapshot[lang]) continue;
      if (current === value) continue;
      if (current.trim()) replaced[lang] = current;
      setValue(value);
    }
    setUndoable((prev) => {
      const next = { ...prev };
      if (Object.keys(replaced).length > 0) next[group] = replaced;
      else delete next[group];
      return next;
    });
  };

  const bind = (group: string, lang: Lang, fields: FieldGroup) => {
    latest.current.set(group, fields);
    const key = `${group}:${lang}`;
    return {
      onFocus: () => {
        focusValues.current.set(key, fields[lang][0]);
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const text = e.target.value;
        const before = focusValues.current.get(key);
        focusValues.current.delete(key);
        if (before === undefined || text === before || !text.trim()) return;
        markManual(group, lang);
        translateGroup(group, lang, text);
      },
    };
  };

  const undo = (group: string) => {
    const previous = undoable[group];
    const fields = latest.current.get(group);
    if (!previous || !fields) return;
    for (const lang of LANGS) {
      if (previous[lang] !== undefined) fields[lang][1](previous[lang] as string);
    }
    setUndoable((prev) => {
      const next = { ...prev };
      delete next[group];
      return next;
    });
  };

  // Forget per-field history, e.g. when a modal form is reopened for
  // another record — otherwise "typed by hand" would leak between records.
  const reset = () => {
    manual.current.clear();
    focusValues.current.clear();
    seq.current.forEach((v, k) => seq.current.set(k, v + 1));
    setTranslatingGroup(null);
    setUndoable({});
  };

  return {
    bind,
    undo,
    reset,
    translatingGroup,
    canUndo: (group: string) => !!undoable[group],
  };
}
