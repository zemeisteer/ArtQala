import crypto from 'crypto';
import { after } from 'next/server';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { prisma } from './prisma';
import { parseTranslations } from './contentTranslations';

// Machine translations of catalogue texts for the site languages beyond
// EN/RU/UZ, stored in each record's `translations` column (read by
// src/lib/contentTranslations.ts). Translated from the English text after
// an admin save, by the daily cron for anything missing or out of date, and
// from Admin → Settings ("Tarjimalarni yangilash"). `_src` holds a hash of
// the English source, so an edited text is translated again.

export const EXTRA_LANGS = ['de', 'fr', 'ko', 'ja', 'zh'] as const;
const LANG_NAMES: Record<string, string> = {
  de: 'German',
  fr: 'French',
  ko: 'Korean',
  ja: 'Japanese',
  zh: 'Simplified Chinese',
};

export type TranslatableModel = 'painting' | 'artist' | 'category' | 'workshop';

const FIELDS: Record<TranslatableModel, string[]> = {
  painting: ['title', 'description', 'technique'],
  artist: ['bio', 'specialty'],
  category: ['name'],
  workshop: ['title', 'description'],
};

const WHAT: Record<TranslatableModel, string> = {
  painting: 'an artwork (painting, ceramic or craft piece) listed by an art gallery in Uzbekistan',
  artist: 'an artist represented by an art gallery in Uzbekistan',
  category: 'a category of artworks in an art gallery',
  workshop: 'a masterclass / workshop offered by an art gallery in Uzbekistan',
};

type Row = { id: string; translations: string | null } & Record<string, unknown>;

function delegate(model: TranslatableModel) {
  // The four delegates share findMany/findUnique/update for these fields.
  return prisma[model] as unknown as {
    findMany(args: unknown): Promise<Row[]>;
    findUnique(args: unknown): Promise<Row | null>;
    update(args: unknown): Promise<unknown>;
  };
}

function sourceOf(model: TranslatableModel, row: Row): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of FIELDS[model]) {
    const v = row[`${f}_en`];
    if (typeof v === 'string' && v.trim()) out[f] = v.trim();
  }
  return out;
}

const hashOf = (src: Record<string, string>) =>
  crypto.createHash('sha1').update(JSON.stringify(src)).digest('hex').slice(0, 16);

function isCurrent(model: TranslatableModel, row: Row): boolean {
  const src = sourceOf(model, row);
  if (!Object.keys(src).length) return true;
  const tr = parseTranslations(row.translations) as Record<string, unknown>;
  return tr._src === hashOf(src) && EXTRA_LANGS.every((l) => tr[l]);
}

function models(): string[] {
  const primary = process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash';
  const fallbacks = (process.env.GEMINI_TRANSLATE_FALLBACK_MODELS || 'gemini-3.5-flash-lite,gemini-flash-lite-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return Array.from(new Set([primary, ...fallbacks]));
}

async function askGemini(model: TranslatableModel, src: Record<string, string>): Promise<Record<string, Record<string, string>>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const ai = new GoogleGenAI({ apiKey });
  const fieldSchema = {
    type: 'object',
    properties: Object.fromEntries(Object.keys(src).map((f) => [f, { type: 'string' }])),
    required: Object.keys(src),
  };
  const prompt = [
    `Translate the texts of ${WHAT[model]} from English into ${EXTRA_LANGS.map((l) => `${LANG_NAMES[l]} (${l})`).join(', ')}.`,
    'Keep names of people, places and monuments recognisable (use their usual spelling in each language), keep the meaning and tone, do not add or drop facts, keep line breaks.',
    'Answer with JSON: one object per language code, each with the same keys as the input.',
    '',
    JSON.stringify(src),
  ].join('\n');
  let lastError: unknown = null;
  for (const m of models()) {
    try {
      const response = await ai.models.generateContent({
        model: m,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: Object.fromEntries(EXTRA_LANGS.map((l) => [l, fieldSchema])),
            required: [...EXTRA_LANGS],
          },
          abortSignal: AbortSignal.timeout(60_000),
        },
      });
      const parsed = JSON.parse(response.text || '{}') as Record<string, Record<string, string>>;
      if (EXTRA_LANGS.every((l) => parsed[l] && typeof parsed[l] === 'object')) return parsed;
      throw new Error('Incomplete translation');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini failed');
}

// Translates one record if its translations are missing or out of date.
export async function translateRecord(model: TranslatableModel, id: string): Promise<'done' | 'current' | 'skipped'> {
  const row = await delegate(model).findUnique({ where: { id } });
  if (!row) return 'skipped';
  if (isCurrent(model, row)) return 'current';
  const src = sourceOf(model, row);
  const tr = await askGemini(model, src);
  const out: Record<string, unknown> = { _src: hashOf(src) };
  for (const l of EXTRA_LANGS) {
    out[l] = Object.fromEntries(Object.keys(src).map((f) => [f, String(tr[l]?.[f] || '').slice(0, 8000)]).filter(([, v]) => v));
  }
  await delegate(model).update({ where: { id }, data: { translations: JSON.stringify(out) } });
  return 'done';
}

// After an admin save: translate in the background, once the response is
// sent (the admin doesn't wait for it).
export function translateAfterSave(model: TranslatableModel, id: string) {
  after(() =>
    translateRecord(model, id).catch((error) => console.error(`Translation of ${model} ${id} failed:`, error))
  );
}

// Records whose translations are missing or stale, oldest first.
export async function pendingTranslations(): Promise<{ model: TranslatableModel; id: string }[]> {
  const out: { model: TranslatableModel; id: string }[] = [];
  for (const model of Object.keys(FIELDS) as TranslatableModel[]) {
    const select = Object.fromEntries([['id', true], ['translations', true], ...FIELDS[model].map((f) => [`${f}_en`, true])]);
    const rows = await delegate(model).findMany({ select, orderBy: { created_at: 'asc' } }).catch(() => [] as Row[]);
    for (const r of rows) if (!isCurrent(model, r)) out.push({ model, id: r.id });
  }
  return out;
}

// Translates up to `limit` pending records within `budgetMs`.
export async function translatePending(limit: number, budgetMs: number) {
  const started = Date.now();
  const pending = await pendingTranslations();
  let done = 0;
  let failed = 0;
  for (const p of pending.slice(0, limit)) {
    if (Date.now() - started > budgetMs) break;
    try {
      if ((await translateRecord(p.model, p.id)) === 'done') done++;
    } catch (error) {
      failed++;
      console.error(`Translation of ${p.model} ${p.id} failed:`, error);
      // Quota or outage: stop for now, the next run continues.
      if (failed >= 2) break;
    }
  }
  return { done, failed, remaining: Math.max(0, pending.length - done) };
}
