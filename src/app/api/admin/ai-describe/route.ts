import { NextResponse } from 'next/server';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, recordFailedAttempt } from '@/lib/rateLimit';
import { loadImageAsBase64 } from '@/lib/adminImage';

export const dynamic = 'force-dynamic';

const FIELDS = ['title_uz', 'title_en', 'title_ru', 'description_uz', 'description_en', 'description_ru'] as const;

// Drafts a painting's title and description in UZ/EN/RU from its photo plus
// the admin's own notes ("this is Kalta Minor in Khiva, painted at dawn").
// The admin reviews the draft in the form before saving — nothing is saved here.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
  }

  const rateLimitKey = `ai-describe:${auth.user.id}`;
  const rateCheck = await checkRateLimit(rateLimitKey, 30, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    const minutesLeft = Math.ceil(rateCheck.retryAfterSeconds / 60);
    return NextResponse.json(
      { success: false, error: `Juda ko'p so'rov. ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.` },
      { status: 429 }
    );
  }
  await recordFailedAttempt(rateLimitKey);

  try {
    const body = await request.json();
    const { imageUrl, notes, artist, technique, size, year, category } = body as Record<string, string | undefined>;
    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Avval rasm yuklang' }, { status: 400 });
    }

    const { data, mimeType } = await loadImageAsBase64(imageUrl);

    // A few of the gallery's own descriptions, so drafts match its voice and length.
    const examples = await prisma.painting.findMany({
      where: { description_en: { not: '' } },
      select: { title_en: true, description_en: true },
      orderBy: { created_at: 'desc' },
      take: 3,
    });

    const facts = [
      artist && `Artist: ${artist}`,
      technique && `Technique: ${technique}`,
      size && `Size: ${size}`,
      year && `Year: ${year}`,
      category && `Category: ${category}`,
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = [
      'You write catalogue entries for Art Qala, a fine-art gallery in Uzbekistan (Tashkent and Khiva) selling original works by Uzbek artists.',
      'Look at the artwork in the image and write a short title and a description in Uzbek (Latin script, with the correct oʻ and gʻ letters), English and Russian.',
      '',
      'Rules:',
      '- Title: 1–5 words, evocative, no quotation marks, no artist name.',
      '- Description: 2–3 sentences, about 40–60 words: what is depicted, then the mood, colours and technique. Warm and precise, not salesy; no prices, no superlatives like "masterpiece".',
      "- Only state facts you can see or that are given in the curator's notes/facts below. Name a specific place, building or person ONLY if the notes name it — otherwise describe it generally (e.g. \"an old madrasa with a turquoise dome\"). Never invent dates or history.",
      '- The three languages must say the same thing; each must read naturally, as if written by a native speaker (not a literal translation).',
      '',
      facts && `Known facts:\n${facts}`,
      notes?.trim() && `Curator's notes (trust these, use them): ${notes.trim().slice(0, 1500)}`,
      examples.length > 0 &&
        `Examples of the gallery's existing English entries, to match their style and length:\n${examples
          .map((e) => `- ${e.title_en}: ${e.description_en}`)
          .join('\n')}`,
    ]
      .filter(Boolean)
      .join('\n');

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ inlineData: { data, mimeType } }, { text: prompt }] }],
      config: {
        temperature: 0.6,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: Object.fromEntries(FIELDS.map((f) => [f, { type: 'string' }])),
          required: [...FIELDS],
        },
        abortSignal: AbortSignal.timeout(45_000),
      },
    });

    const parsed = JSON.parse(response.text || '{}') as Record<string, unknown>;
    const result = Object.fromEntries(FIELDS.map((f) => [f, typeof parsed[f] === 'string' ? (parsed[f] as string).trim() : '']));
    if (!result.title_en && !result.description_en) throw new Error('Empty AI response');

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('AI describe error:', error);
    const quota = /429|quota|RESOURCE_EXHAUSTED/i.test(String(error));
    return NextResponse.json(
      {
        success: false,
        error: quota
          ? "AI limiti tugadi (Gemini bepul tarifi). Billingni yoqing yoki ertaga urinib ko'ring."
          : "AI matn yoza olmadi. Qayta urinib ko'ring.",
      },
      { status: quota ? 429 : 500 }
    );
  }
}
