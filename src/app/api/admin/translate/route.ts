import { NextResponse } from 'next/server';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { requireAdmin } from '@/lib/auth';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { checkRateLimit, recordFailedAttempt } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
// Several Gemini models may be tried in turn before the Google fallback.
export const maxDuration = 60;

const LANG_NAMES: Record<string, string> = {
  uz: 'Uzbek (Latin script)',
  ru: 'Russian',
  en: 'English',
};

// What kind of text this is — the admin forms send their field name. Telling
// the model "this is a painting's technique" is what turns "Moybo'yoq,
// polotno" into "Oil on canvas" rather than a word-by-word rendering.
function describeField(field: string): string {
  const f = field.toLowerCase();
  if (f.includes('title')) return "the title of an artwork (keep it short and evocative; keep place names, transliterated naturally for each language, e.g. Xiva / Khiva / Хива)";
  if (f.includes('description')) return "the description of an artwork on its sales page (natural, gallery-appropriate prose)";
  if (f.includes('technique')) return "an artwork's medium/technique — use the standard art-catalogue term in each language (e.g. Moybo'yoq, polotno = Oil on canvas = Холст, масло)";
  if (f.includes('specialty')) return "an artist's specialty (a short job title, e.g. Painter / Художник / Rassom)";
  if (f.includes('bio')) return "an artist's biography (keep dates, names, institutions and awards exact; keep the line breaks)";
  if (f.includes('about')) return "the gallery's 'About us' text";
  if (f.includes('name')) return "a short name/label of an art category or product";
  return "text from an art gallery website";
}

// Translations are remembered for 30 days (Upstash Redis, when configured),
// so re-saving or re-editing the same text doesn't spend Gemini quota again.
const cache =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  const apiKey = process.env.GEMINI_API_KEY;

  const rateLimitKey = `translate:${auth.user.id}`;
  const rateCheck = await checkRateLimit(rateLimitKey, 60, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    const minutesLeft = Math.ceil(rateCheck.retryAfterSeconds / 60);
    return NextResponse.json(
      { success: false, error: `Juda ko'p so'rov. ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.` },
      { status: 429 }
    );
  }
  await recordFailedAttempt(rateLimitKey);

  let text = '';
  let sourceLang = '';
  let field = '';
  try {
    const body = await request.json();
    text = typeof body?.text === 'string' ? body.text.trim() : '';
    sourceLang = typeof body?.sourceLang === 'string' ? body.sourceLang : '';
    field = typeof body?.field === 'string' ? body.field.slice(0, 40) : '';
  } catch {
    // fall through to the validation below
  }
  if (!text || !LANG_NAMES[sourceLang]) {
    return NextResponse.json({ success: false, error: 'text and a valid sourceLang are required' }, { status: 400 });
  }

  const targetLangs = (['uz', 'ru', 'en'] as const).filter((l) => l !== sourceLang);

  const cacheKey = `translate:v2:${crypto
    .createHash('sha256')
    .update(`${sourceLang}|${describeField(field)}|${text}`)
    .digest('hex')}`;
  if (cache) {
    try {
      const cached = await cache.get<Record<string, string>>(cacheKey);
      if (cached && targetLangs.every((l) => cached[l])) {
        return NextResponse.json({ success: true, translations: cached, provider: 'cache' });
      }
    } catch {
      // cache is an optimisation only
    }
  }

  // Gemini first — far better than Google Translate for Uzbek and for art
  // vocabulary. Free-tier keys have a small per-MODEL daily quota (429
  // "generate_content_free_tier_requests") and free traffic is the first to
  // get 503 "high demand", so several models are tried in turn — each has
  // its own quota. Whatever Gemini can't deliver falls back to Google
  // Translate's public endpoint (which often answers 429 to cloud servers).
  // Every failure is recorded so the admin sees *why* nothing was filled.
  const translations: Record<string, string> = {};
  const failures: string[] = [];
  let provider = '';
  let quotaHit = false;
  const startedAt = Date.now();
  if (!apiKey) {
    failures.push("Gemini: GEMINI_API_KEY o'rnatilmagan");
  } else {
    for (const model of geminiModels()) {
      if (Date.now() - startedAt > GEMINI_TOTAL_BUDGET_MS) break;
      const cooling = await coolingDownReason(model);
      if (cooling) {
        if (cooling === 'quota') quotaHit = true;
        failures.push(
          `Gemini (${model}): ${cooling === 'quota' ? 'limit tugagan (429)' : 'model band (503)'}, o'tkazib yuborildi`
        );
        continue;
      }
      try {
        const result = await translateWithGemini(apiKey, model, text, sourceLang, targetLangs, field);
        for (const l of targetLangs) if (!translations[l] && result[l]) translations[l] = result[l];
        provider = provider ? 'mixed' : `gemini:${model}`;
        if (targetLangs.every((l) => translations[l])) break;
      } catch (error) {
        const status = errorStatus(error);
        failures.push(`Gemini (${model}): ${describeGeminiError(status, error)}`);
        console.warn(`Gemini translation failed (${model}, status ${status ?? '-'}):`, errorMessage(error));
        if (status === 429) {
          quotaHit = true;
          await coolDown(model, 'quota');
        } else if (status === 503 || status === 500 || status === 408) {
          await coolDown(model, 'busy');
        }
      }
    }
  }

  const missing = targetLangs.filter((l) => !translations[l]);
  if (missing.length > 0) {
    const results = await Promise.all(missing.map((l) => translateWithGoogle(text, sourceLang, l)));
    missing.forEach((l, i) => {
      const r = results[i];
      if (r.text) translations[l] = r.text;
      else failures.push(`Google Translate (${l}): ${r.error}`);
    });
    if (results.some((r) => r.text)) provider = provider ? 'mixed' : 'google';
  }

  // Only Gemini's results are cached: a Google fallback should be retried
  // with Gemini next time rather than remembered.
  if (cache && provider.startsWith('gemini') && targetLangs.every((l) => translations[l])) {
    cache.set(cacheKey, translations, { ex: CACHE_TTL_SECONDS }).catch(() => {});
  }

  if (targetLangs.every((l) => !translations[l])) {
    console.error('Translation unavailable:', failures.join(' | '));
    return NextResponse.json(
      {
        success: false,
        error:
          "Avtomatik tarjima hozir ishlamayapti — EN/RU maydonlarini qo'lda to'ldiring yoki birozdan so'ng qayta urinib ko'ring. " +
          (quotaHit
            ? "Sabab: Gemini bepul tarifining kunlik limiti tugagan (Google AI Studio'da billing'ni yoqish buni hal qiladi)."
            : ''),
        details: failures,
      },
      { status: 503 }
    );
  }

  const stillMissing = targetLangs.filter((l) => !translations[l]);
  return NextResponse.json({
    success: true,
    translations,
    provider,
    ...(stillMissing.length > 0 && {
      warning: `${stillMissing.map((l) => l.toUpperCase()).join(', ')} tarjimasi olinmadi — qo'lda to'ldiring.`,
      details: failures,
    }),
  });
}

// Primary model (GEMINI_TEXT_MODEL) first, then fallbacks — overridable with
// a comma-separated GEMINI_TRANSLATE_FALLBACK_MODELS.
function geminiModels(): string[] {
  const primary = process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash';
  const fallbacks = (process.env.GEMINI_TRANSLATE_FALLBACK_MODELS || 'gemini-3.5-flash-lite,gemini-flash-lite-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return Array.from(new Set([primary, ...fallbacks]));
}

// A model that just answered 429 (quota) or 503 (overloaded) is skipped for
// a while, so the next field doesn't wait on a call that will fail again.
// Shared across Vercel instances through Upstash when configured.
const QUOTA_COOLDOWN_SECONDS = 60 * 60;
const OVERLOAD_COOLDOWN_SECONDS = 2 * 60;
type CooldownReason = 'quota' | 'busy';
const localCooldowns = new Map<string, { until: number; reason: CooldownReason }>();

async function coolingDownReason(model: string): Promise<CooldownReason | null> {
  const local = localCooldowns.get(model);
  if (local && local.until > Date.now()) return local.reason;
  if (cache) {
    try {
      const reason = await cache.get<string>(`translate:cooldown:${model}`);
      return reason === 'quota' || reason === 'busy' ? reason : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function coolDown(model: string, reason: CooldownReason): Promise<void> {
  const seconds = reason === 'quota' ? QUOTA_COOLDOWN_SECONDS : OVERLOAD_COOLDOWN_SECONDS;
  localCooldowns.set(model, { until: Date.now() + seconds * 1000, reason });
  if (cache) {
    await cache.set(`translate:cooldown:${model}`, reason, { ex: seconds }).catch(() => {});
  }
}

function errorStatus(error: unknown): number | null {
  const status = (error as { status?: unknown })?.status;
  if (typeof status === 'number') return status;
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return 408;
  return null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function describeGeminiError(status: number | null, error: unknown): string {
  if (status === 429) return 'limit tugagan (429 — bepul tarif kunlik limiti)';
  if (status === 503) return "model band (503 — bepul so'rovlar navbatda)";
  if (status === 408) return 'javob kelmadi (vaqt tugadi)';
  if (status === 400 || status === 403) return `kalit yoki model xato (${status})`;
  if (status === 404) return 'model topilmadi (404)';
  return status ? `xato ${status}` : errorMessage(error).slice(0, 120);
}

const GEMINI_TIMEOUT_MS = 10_000;
const GEMINI_TOTAL_BUDGET_MS = 25_000;
const GOOGLE_TIMEOUT_MS = 6_000;

async function translateWithGemini(
  apiKey: string,
  model: string,
  text: string,
  sourceLang: string,
  targetLangs: readonly string[],
  field: string
): Promise<Record<string, string>> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt =
    `You translate content for Art Qala, an art gallery in Tashkent, Uzbekistan, selling original paintings, straw and wood art, and ceramics.\n` +
    `Translate the text below from ${LANG_NAMES[sourceLang]} into ${targetLangs.map((l) => LANG_NAMES[l]).join(' and ')}. ` +
    `The text is ${describeField(field)}.\n` +
    `Rules: write natural, fluent, native-sounding text as a professional gallery would — not word-for-word. ` +
    `Keep the meaning exact; keep people's names, dates and numbers unchanged. ` +
    `Uzbek must be in Latin script with the correct letters oʻ and gʻ. Do not add explanations or quotes.\n` +
    `Respond with ONLY a JSON object with keys ${targetLangs.map((l) => `"${l}"`).join(', ')}.\n\n` +
    `Text:\n${text}`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      // Translation needs no reasoning — thinking is what made a single
      // field take tens of seconds.
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      responseMimeType: 'application/json',
      abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    },
  });

  const jsonMatch = (response.text || '').match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('unexpected Gemini response format');
  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  const out: Record<string, string> = {};
  for (const lang of targetLangs) {
    const value = parsed[lang];
    if (typeof value === 'string' && value.trim()) out[lang] = value.trim();
  }
  return out;
}

// Google Translate's public web endpoint — no key, fast, decent Uzbek. It's
// unofficial: it throttles heavy use and frequently answers 429 ("automated
// queries") to cloud/datacenter IPs such as Vercel's, so it's only a
// last-resort fallback behind Gemini.
async function translateWithGoogle(
  text: string,
  from: string,
  to: string
): Promise<{ text: string | null; error?: string }> {
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t' +
      `&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) });
    if (!res.ok) {
      return {
        text: null,
        error: res.status === 429 ? "server IP'si bloklangan (429)" : `xato ${res.status}`,
      };
    }
    const data = await res.json();
    const joined = Array.isArray(data?.[0])
      ? data[0].map((chunk: unknown[]) => (typeof chunk?.[0] === 'string' ? chunk[0] : '')).join('')
      : '';
    return joined.trim() ? { text: joined.trim() } : { text: null, error: "bo'sh javob" };
  } catch (error) {
    console.warn('Google Translate fallback failed:', errorMessage(error));
    return { text: null, error: errorStatus(error) === 408 ? 'javob kelmadi (vaqt tugadi)' : errorMessage(error).slice(0, 120) };
  }
}
