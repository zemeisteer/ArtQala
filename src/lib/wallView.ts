import sharp from 'sharp';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { prisma } from './prisma';
import { mainImage } from './paintingImages';
import { parseSizeCm } from './paintingSize';

// "View on a wall" needs the artwork alone (no wall, easel or floor around it
// in the photo), shown at the size typed in the admin. Gemini finds the artwork in the
// main photo once — the frame's outer edge when it has a frame, otherwise the
// canvas edge — the box is snapped to the real edge in the pixels, and the
// result is stored in Painting.wall_view. A new main photo (src changes)
// makes it detect again; the cropped image itself is never stored, it is cut
// on request (and CDN-cached) by /api/paintings/[id]/wall-image.

export interface WallView {
  src: string; // the main photo this was detected on
  box?: [number, number, number, number]; // x0, y0, x1, y1 as 0..1 of the photo
  framed?: boolean;
  failedAt?: number; // detection failed (quota…) — retried after a while
}

const RETRY_AFTER_FAIL_MS = 6 * 60 * 60 * 1000;

export function parseWallView(raw: string | null | undefined): WallView | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as WallView;
    return v && typeof v.src === 'string' ? v : null;
  } catch {
    return null;
  }
}

// Short stable version for cache-busting URLs.
export function wallViewVersion(v: WallView): string {
  const s = JSON.stringify([v.src, v.box]);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// --- loading the photo -----------------------------------------------------

const ALLOWED_HOSTS = [/\.cloudinary\.com$/, /\.public\.blob\.vercel-storage\.com$/];

export async function loadImageBuffer(src: string): Promise<Buffer> {
  if (src.startsWith('data:')) {
    const m = src.match(/^data:[^;]+;base64,(.+)$/);
    if (!m) throw new Error('Invalid data URL');
    return Buffer.from(m[1], 'base64');
  }
  const site = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const url = new URL(src, site);
  // Only our own uploads (see src/lib/adminImage.ts) — never an arbitrary host.
  if (url.origin !== new URL(site).origin && !ALLOWED_HOSTS.some((re) => re.test(url.hostname))) {
    throw new Error('Image host not allowed');
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Image fetch failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

// --- detection ---------------------------------------------------------------

type Box = [number, number, number, number]; // x0, y0, x1, y1 in 0..1

function geminiModels(): string[] {
  const primary = process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash';
  const fallbacks = (process.env.GEMINI_TRANSLATE_FALLBACK_MODELS || 'gemini-3.5-flash-lite,gemini-flash-lite-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return Array.from(new Set([primary, ...fallbacks]));
}

const PROMPT = [
  'This photo shows one artwork offered by an art gallery (usually a painting; it may be photographed on a wall, an easel, a table or the floor).',
  'Give two bounding boxes as [ymin, xmin, ymax, xmax], integers normalized to 0-1000:',
  '- "outer": the whole physical object as it would hang on a wall — INCLUDING its frame (and mat/passe-partout) if it has one. Exclude the wall, easel, floor, people, hands and shadows.',
  '- "painting": only the painted/printed surface itself (canvas, board or paper), inside any frame or mat. With no frame it equals "outer".',
  '"framed": true only if a separate frame or mat surrounds the painted surface (a painting whose canvas edges simply wrap around has no frame).',
  'Be precise: the box edges must touch the object edges.',
].join('\n');

async function askGemini(jpeg: Buffer): Promise<{ outer: Box; painting: Box; framed: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const ai = new GoogleGenAI({ apiKey });
  const toBox = (b: unknown): Box | null => {
    if (!Array.isArray(b) || b.length !== 4 || b.some((n) => typeof n !== 'number')) return null;
    const [ymin, xmin, ymax, xmax] = (b as number[]).map((n) => Math.min(1, Math.max(0, n / 1000)));
    return xmax - xmin > 0.05 && ymax - ymin > 0.05 ? [xmin, ymin, xmax, ymax] : null;
  };
  let lastError: unknown = null;
  for (const model of geminiModels()) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ inlineData: { data: jpeg.toString('base64'), mimeType: 'image/jpeg' } }, { text: PROMPT }] }],
        config: {
          temperature: 0,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              outer: { type: 'array', items: { type: 'integer' } },
              painting: { type: 'array', items: { type: 'integer' } },
              framed: { type: 'boolean' },
            },
            required: ['outer', 'painting', 'framed'],
          },
          abortSignal: AbortSignal.timeout(30_000),
        },
      });
      const parsed = JSON.parse(response.text || '{}') as Record<string, unknown>;
      const outer = toBox(parsed.outer);
      const painting = toBox(parsed.painting) || outer;
      if (!outer || !painting) throw new Error('No box in Gemini response');
      return { outer, painting, framed: parsed.framed === true };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini failed');
}

// Gemini's boxes are a percent or two off. Each edge is moved to the
// strongest straight brightness edge close to it (the frame/canvas border
// against the wall), so the crop shows neither a sliver of wall nor cuts
// into the frame. An edge already at the photo border (a photo cropped to
// the artwork) stays there.
async function snapToEdges(img: Buffer, box: Box): Promise<Box> {
  const { data, info } = await sharp(img)
    .resize({ width: 800, height: 800, fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  // Colour difference, not just brightness: a gold frame on a beige wall
  // is barely an edge in greyscale.
  const diff = (x1: number, y1: number, x2: number, y2: number) => {
    const a = (y1 * W + x1) * 3;
    const b = (y2 * W + x2) * 3;
    return Math.abs(data[a] - data[b]) + Math.abs(data[a + 1] - data[b + 1]) + Math.abs(data[a + 2] - data[b + 2]);
  };

  // Mean difference across the line between rows r-1 and r (columns c-1
  // and c), over the middle of the box (corners can be shadowed).
  const rowScore = (r: number, x0: number, x1: number) => {
    let s = 0;
    for (let x = x0; x < x1; x++) s += diff(x, r, x, r - 1);
    return s / Math.max(1, x1 - x0);
  };
  const colScore = (c: number, y0: number, y1: number) => {
    let s = 0;
    for (let y = y0; y < y1; y++) s += diff(c, y, c - 1, y);
    return s / Math.max(1, y1 - y0);
  };

  const snap = (value: number, size: number, score: (i: number) => number): number => {
    const pos = Math.round(value * size);
    if (pos < size * 0.015 || pos > size * 0.985) return value <= 0.5 ? 0 : 1;
    const at = (i: number) => (i >= 1 && i < size ? score(i) : 0);
    // How sharp an edge already sits where Gemini put it (±2 px).
    let here = 0;
    for (let i = pos - 2; i <= pos + 2; i++) here = Math.max(here, at(i));
    const win = Math.max(3, Math.round(size * 0.02));
    let best = pos;
    let bestScore = here;
    for (let i = pos - win; i <= pos + win; i++) {
      const s = at(i);
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    // Move only to a clearly stronger edge; otherwise take the sharpest
    // edge right at Gemini's line.
    if (bestScore > Math.max(20, here * 1.8)) return best / size;
    let local = pos;
    for (let i = pos - 2; i <= pos + 2; i++) if (at(i) > at(local)) local = i;
    return at(local) > 20 ? local / size : value;
  };

  const [x0, y0, x1, y1] = box;
  const ix0 = Math.round((x0 + (x1 - x0) * 0.15) * W);
  const ix1 = Math.round((x1 - (x1 - x0) * 0.15) * W);
  const iy0 = Math.round((y0 + (y1 - y0) * 0.15) * H);
  const iy1 = Math.round((y1 - (y1 - y0) * 0.15) * H);
  const top = snap(y0, H, (r) => rowScore(r, ix0, ix1));
  const bottom = snap(y1, H, (r) => rowScore(r, ix0, ix1));
  const left = snap(x0, W, (c) => colScore(c, iy0, iy1));
  const right = snap(x1, W, (c) => colScore(c, iy0, iy1));
  return right - left > 0.05 && bottom - top > 0.05 ? [left, top, right, bottom] : box;
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;

async function detect(src: string): Promise<WallView> {
  const original = await loadImageBuffer(src);
  // EXIF-rotated, like every upload — all box maths is on this upright image.
  const upright = await sharp(original).rotate().jpeg({ quality: 90 }).toBuffer();
  const forAi = await sharp(upright).resize({ width: 1280, height: 1280, fit: 'inside' }).jpeg({ quality: 85 }).toBuffer();

  const found = await askGemini(forAi);
  const outer = await snapToEdges(upright, found.outer);
  return {
    src,
    box: outer.map(round4) as Box,
    framed: found.framed,
  };
}

// The painting's wall view, detecting it first when the main photo is new.
// Never throws: on failure the whole photo and the typed size are used.
export async function getWallView(paintingId: string, force = false): Promise<WallView | null> {
  const painting = await prisma.painting.findUnique({
    where: { id: paintingId },
    select: { images: true, wall_view: true },
  });
  if (!painting) return null;
  const src = mainImage(painting.images);
  const stored = parseWallView(painting.wall_view);
  const fresh = stored && stored.src === src;
  if (!force && fresh && (stored.box || (stored.failedAt && Date.now() - stored.failedAt < RETRY_AFTER_FAIL_MS))) {
    return stored;
  }

  let view: WallView;
  try {
    view = await detect(src);
  } catch (error) {
    console.error('Wall view detection failed:', error);
    view = { src, failedAt: Date.now() };
  }
  await prisma.painting
    .update({ where: { id: paintingId }, data: { wall_view: JSON.stringify(view) } })
    .catch(() => {});
  return view;
}

// What the client gets: the size exactly as typed in the admin (never
// re-computed — the owner measures it) and URLs.
export function wallViewPayload(paintingId: string, sizeStr: string | null | undefined, view: WallView | null) {
  const size = parseSizeCm(sizeStr);
  const widthCm = size?.width ?? null;
  const heightCm = size?.height ?? null;
  const v = view ? wallViewVersion(view) : '0';
  return {
    widthCm,
    heightCm,
    framed: Boolean(view?.framed),
    cropped: Boolean(view?.box),
    image: `/api/paintings/${paintingId}/wall-image?v=${v}`,
    model: `/api/paintings/${paintingId}/ar/painting.glb?v=${v}`,
    usdz: `/api/paintings/${paintingId}/ar/painting.usdz?v=${v}`,
  };
}

// The cropped artwork as a JPEG (longest side ≤ maxSide).
export async function wallImageJpeg(view: WallView | null, src: string, maxSide = 2048): Promise<Buffer> {
  const upright = await sharp(await loadImageBuffer(view?.src || src)).rotate().toBuffer();
  let pipeline = sharp(upright);
  if (view?.box && view.src === src) {
    const meta = await sharp(upright).metadata();
    const W = meta.width || 1;
    const H = meta.height || 1;
    const [x0, y0, x1, y1] = view.box;
    const left = Math.max(0, Math.round(x0 * W));
    const top = Math.max(0, Math.round(y0 * H));
    pipeline = pipeline.extract({
      left,
      top,
      width: Math.max(1, Math.min(W - left, Math.round((x1 - x0) * W))),
      height: Math.max(1, Math.min(H - top, Math.round((y1 - y0) * H))),
    });
  }
  return pipeline
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 86 })
    .toBuffer();
}
