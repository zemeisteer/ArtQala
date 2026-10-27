import sharp from 'sharp';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { getAllPaintings } from './api';
import { mainImage, PLACEHOLDER_IMAGE } from './paintingImages';
import { isWallPiece, parseSizeCm } from './paintingSize';
import { loadImageBuffer } from './wallView';
import { pick } from './contentTranslations';

// "Find art for my room": the visitor's room photo plus small thumbnails of
// the available wall pieces go to Gemini in one request; it picks the works
// whose colours and style suit the room and says why, in the visitor's
// language. The room photo is never stored.

const MAX_CANDIDATES = 40;
const THUMB = 256;

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
  uz: 'Uzbek (Latin script)',
  de: 'German',
  fr: 'French',
  ko: 'Korean',
  ja: 'Japanese',
  zh: 'Simplified Chinese',
};

// Thumbnails survive between requests on a warm server instance.
const thumbCache = new Map<string, Buffer>();
async function thumbnail(src: string): Promise<Buffer | null> {
  const hit = thumbCache.get(src);
  if (hit) return hit;
  try {
    const buf = await sharp(await loadImageBuffer(src))
      .rotate()
      .resize({ width: THUMB, height: THUMB, fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer();
    if (thumbCache.size > 300) thumbCache.clear();
    thumbCache.set(src, buf);
    return buf;
  } catch {
    return null;
  }
}

function models(): string[] {
  const primary = process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash';
  const fallbacks = (process.env.GEMINI_TRANSLATE_FALLBACK_MODELS || 'gemini-3.5-flash-lite,gemini-flash-lite-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return Array.from(new Set([primary, ...fallbacks]));
}

export interface RoomMatch {
  id: string;
  title: string;
  artist: string;
  size: string;
  price: number;
  discount_price: number | null;
  image: string;
  reason: string;
}

export async function matchRoom(roomJpeg: Buffer, lang: string): Promise<RoomMatch[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const room = await sharp(roomJpeg).rotate().resize({ width: 1024, height: 1024, fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
  const pool = (await getAllPaintings())
    .filter((p) => !p.is_sold && isWallPiece(parseSizeCm(p.size)) && mainImage(p.images) !== PLACEHOLDER_IMAGE)
    .slice(0, MAX_CANDIDATES);
  const thumbs = await Promise.all(pool.map((p) => thumbnail(mainImage(p.images))));
  const candidates = pool.map((p, i) => ({ p, thumb: thumbs[i] })).filter((c) => c.thumb);
  if (!candidates.length) return [];

  const parts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[] = [
    {
      text: [
        'You are the curator of an art gallery in Uzbekistan. The first image is a photo of a customer\'s room or wall.',
        'After it come the artworks currently for sale, each introduced by its number.',
        'Choose the 3 to 5 artworks that would look best in this room — matching or complementing its colours, light, style and the free wall space.',
        `For each, give one short, specific sentence (max 25 words) in ${LANG_NAMES[lang] || 'English'} explaining why it suits this room. Do not mention prices.`,
        'Answer with JSON only: {"picks":[{"n":<artwork number>,"reason":"..."}]}, best match first.',
      ].join('\n'),
    },
    { inlineData: { data: room.toString('base64'), mimeType: 'image/jpeg' } },
  ];
  candidates.forEach((c, i) => {
    parts.push({ text: `Artwork ${i + 1}: "${c.p.title_en}" — ${c.p.technique_en || ''}, ${c.p.size}` });
    parts.push({ inlineData: { data: c.thumb!.toString('base64'), mimeType: 'image/jpeg' } });
  });

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown = null;
  for (const model of models()) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          temperature: 0.3,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              picks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { n: { type: 'integer' }, reason: { type: 'string' } },
                  required: ['n', 'reason'],
                },
              },
            },
            required: ['picks'],
          },
          abortSignal: AbortSignal.timeout(45_000),
        },
      });
      const parsed = JSON.parse(response.text || '{}') as { picks?: { n: number; reason: string }[] };
      const seen = new Set<number>();
      const out: RoomMatch[] = [];
      for (const pk of parsed.picks || []) {
        const c = candidates[pk.n - 1];
        if (!c || seen.has(pk.n) || out.length >= 5) continue;
        seen.add(pk.n);
        out.push({
          id: c.p.id,
          title: pick(c.p, 'title', lang),
          artist: c.p.artist?.name || '',
          size: c.p.size,
          price: c.p.price,
          discount_price: c.p.discount_price && c.p.discount_price < c.p.price ? c.p.discount_price : null,
          image: mainImage(c.p.images),
          reason: String(pk.reason || '').slice(0, 300),
        });
      }
      if (out.length) return out;
      throw new Error('No picks in Gemini response');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini failed');
}
