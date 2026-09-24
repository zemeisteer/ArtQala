import { NextResponse } from 'next/server';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { requireAdmin } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const LANG_NAMES: Record<string, string> = {
  uz: 'Uzbek (Latin script)',
  ru: 'Russian',
  en: 'English',
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

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
  try {
    const body = await request.json();
    text = typeof body?.text === 'string' ? body.text.trim() : '';
    sourceLang = typeof body?.sourceLang === 'string' ? body.sourceLang : '';
  } catch {
    // fall through to the validation below
  }
  if (!text || !LANG_NAMES[sourceLang]) {
    return NextResponse.json({ success: false, error: 'text and a valid sourceLang are required' }, { status: 400 });
  }

  const targetLangs = (['uz', 'ru', 'en'] as const).filter((l) => l !== sourceLang);

  // Gemini gives the most natural gallery wording, but it can be slow and
  // its quota runs out (429) — so it gets a hard deadline, and anything it
  // doesn't deliver in time falls back to Google Translate. The admin never
  // waits more than ~GEMINI_TIMEOUT_MS + FALLBACK_TIMEOUT_MS.
  let translations: Record<string, string> = {};
  let provider = 'gemini';
  try {
    translations = await translateWithGemini(apiKey, text, sourceLang, targetLangs);
  } catch (error) {
    console.warn('Gemini translation failed, falling back:', error instanceof Error ? error.message : error);
  }

  const missing = targetLangs.filter((l) => !translations[l]);
  if (missing.length > 0) {
    provider = missing.length === targetLangs.length ? 'google' : 'mixed';
    const results = await Promise.all(missing.map((l) => translateWithGoogle(text, sourceLang, l)));
    missing.forEach((l, i) => {
      if (results[i]) translations[l] = results[i] as string;
    });
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
const FALLBACK_TIMEOUT_MS = 8_000;

async function translateWithGemini(
  apiKey: string,
  text: string,
  sourceLang: string,
  targetLangs: readonly string[]
): Promise<Record<string, string>> {
  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash';

  const prompt =
    `Translate the following art-gallery text from ${LANG_NAMES[sourceLang]} into ${targetLangs.map((l) => LANG_NAMES[l]).join(' and ')}. ` +
    `Keep the tone natural and gallery-appropriate, keep proper names as they are, do not add commentary. ` +
    `Respond with ONLY a JSON object with keys ${targetLangs.map((l) => `"${l}"`).join(', ')}.\n\n` +
    `Text: ${text}`;

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
// Only used as the fallback above.
async function translateWithGoogle(text: string, from: string, to: string): Promise<string | null> {
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t' +
      `&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FALLBACK_TIMEOUT_MS) });
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
