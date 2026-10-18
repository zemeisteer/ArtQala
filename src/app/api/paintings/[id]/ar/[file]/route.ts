import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { mainImage } from '@/lib/paintingImages';
import { parseSizeCm } from '@/lib/paintingSize';
import { paintingGlb } from '@/lib/paintingGlb';
import { paintingUsdz } from '@/lib/paintingUsdz';
import { parseWallView, wallImageJpeg } from '@/lib/wallView';

export const dynamic = 'force-dynamic';

const FORMATS = {
  // Android Scene Viewer (fetched by Google's app, hence CORS *).
  'painting.glb': { type: 'model/gltf-binary', build: paintingGlb },
  // iPhone/iPad AR Quick Look — a real URL, so non-Safari iOS browsers work too.
  'painting.usdz': { type: 'model/vnd.usdz+zip', build: paintingUsdz },
} as const;

// The painting at its real (typed) size for phone AR ("view on my wall").
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await params;
  const format = FORMATS[file as keyof typeof FORMATS];
  if (!format) return new Response('Not found', { status: 404 });
  const painting = await prisma.painting.findUnique({
    where: { id },
    select: { images: true, size: true, wall_view: true },
  });
  if (!painting) return new Response('Not found', { status: 404 });
  const size = parseSizeCm(painting.size);
  if (!size) return new Response('Size unknown', { status: 404 });
  try {
    const cropped = await wallImageJpeg(parseWallView(painting.wall_view), mainImage(painting.images), 2048);
    // Power-of-two texture (mipmaps on every AR viewer); UVs span it whole.
    const meta = await sharp(cropped).metadata();
    const pot = (n: number) => Math.min(2048, Math.max(256, 2 ** Math.round(Math.log2(n || 1))));
    const jpeg = await sharp(cropped)
      .resize(pot(meta.width || 0), pot(meta.height || 0), { fit: 'fill' })
      .jpeg({ quality: 86 })
      .toBuffer();
    return new Response(new Uint8Array(format.build(jpeg, size.width, size.height)), {
      headers: {
        'Content-Type': format.type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Wall AR model error:', error);
    return new Response('Model unavailable', { status: 502 });
  }
}
