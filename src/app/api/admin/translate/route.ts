import { NextResponse } from 'next/server';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { requireAdmin } from '@/lib/auth';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { checkRateLimit, recordFailedAttempt } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

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
  // vocabulary. Whatever it can't deliver (quota exhausted, timeout, bad
  // response) falls back to Google Translate, so the admin always gets
  // something within ~GEMINI_TIMEOUT_MS + GOOGLE_TIMEOUT_MS.
  const translations: Record<string, string> = {};
  let provider = 'gemini';
  if (apiKey) {
    try {
      Object.assign(translations, await translateWithGemini(apiKey, text, sourceLang, targetLangs, field));
    } catch (error) {
      console.warn('Gemini translation failed, using Google Translate:', error instanceof Error ? error.message : error);
    }
  }

  const missing = targetLangs.filter((l) => !translations[l]);
  if (missing.length > 0) {
    provider = missing.length === targetLangs.length ? 'google' : 'mixed';
    const results = await Promise.all(missing.map((l) => translateWithGoogle(text, sourceLang, l)));
    missing.forEach((l, i) => {
      if (results[i]) translations[l] = results[i] as string;
    });
  }

  // Only Gemini's results are cached: a Google fallback should be retried
  // with Gemini next time rather than remembered.
  if (cache && provider === 'gemini' && targetLangs.every((l) => translations[l])) {
    cache.set(cacheKey, translations, { ex: CACHE_TTL_SECONDS }).catch(() => {});
  }

  if (targetLangs.every((l) => !translations[l])) {
    return NextResponse.json(
      { success: false, error: "Tarjima xizmati hozir javob bermayapti. Birozdan so'ng qayta urinib ko'ring." },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, translations, provider });
}

const GEMINI_TIMEOUT_MS = 12_000;
const GOOGLE_TIMEOUT_MS = 8_000;

async function translateWithGemini(
  apiKey: string,
  text: string,
  sourceLang: string,
  targetLangs: readonly string[],
  field: string
): Promise<Record<string, string>> {
  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash';

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

// Google Translate's public web endpoint — no key, fast, decent Uzbek.
// It's unofficial and can throttle very heavy use, which is why Gemini
// stays wired in above as a fallback.
async function translateWithGoogle(text: string, from: string, to: string): Promise<string | null> {
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t' +
      `&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = await res.json();
    const joined = Array.isArray(data?.[0])
      ? data[0].map((chunk: unknown[]) => (typeof chunk?.[0] === 'string' ? chunk[0] : '')).join('')
      : '';
    return joined.trim() || null;
  } catch {
    return null;
  }
}
