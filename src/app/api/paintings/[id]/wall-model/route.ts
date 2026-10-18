import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { mainImage } from '@/lib/paintingImages';
import { parseSizeCm } from '@/lib/paintingSize';
import { paintingGlb } from '@/lib/paintingGlb';
import { parseWallView, wallImageJpeg } from '@/lib/wallView';

export const dynamic = 'force-dynamic';

// The painting at its real size as a .glb, for phone AR ("view on my wall").
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const painting = await prisma.painting.findUnique({
    where: { id },
    select: { images: true, size: true, wall_view: true },
  });
  if (!painting) return new Response('Not found', { status: 404 });
  const view = parseWallView(painting.wall_view);
  const size = parseSizeCm(painting.size);
  const widthCm = view?.widthCm ?? size?.width;
  const heightCm = view?.heightCm ?? size?.height;
  if (!widthCm || !heightCm) return new Response('Size unknown', { status: 404 });
  try {
    const cropped = await wallImageJpeg(view, mainImage(painting.images), 2048);
    // Power-of-two texture (mipmaps on every AR viewer); UVs span it whole.
    const meta = await sharp(cropped).metadata();
    const pot = (n: number) => Math.min(2048, Math.max(256, 2 ** Math.round(Math.log2(n || 1))));
    const jpeg = await sharp(cropped)
      .resize(pot(meta.width || 0), pot(meta.height || 0), { fit: 'fill' })
      .jpeg({ quality: 86 })
      .toBuffer();
    return new Response(new Uint8Array(paintingGlb(jpeg, widthCm, heightCm)), {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Scene Viewer fetches it from Google's app.
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Wall model error:', error);
    return new Response('Model unavailable', { status: 502 });
  }
}
