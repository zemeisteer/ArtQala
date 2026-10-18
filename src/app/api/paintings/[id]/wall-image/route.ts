import { prisma } from '@/lib/prisma';
import { mainImage } from '@/lib/paintingImages';
import { parseWallView, wallImageJpeg } from '@/lib/wallView';

export const dynamic = 'force-dynamic';

// The artwork cut out of its main photo (frame edge, or canvas edge), as a
// JPEG. URLs carry ?v=<version>, so the CDN may keep each one forever.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const painting = await prisma.painting.findUnique({ where: { id }, select: { images: true, wall_view: true } });
  if (!painting) return new Response('Not found', { status: 404 });
  try {
    const jpeg = await wallImageJpeg(parseWallView(painting.wall_view), mainImage(painting.images), 1600);
    return new Response(new Uint8Array(jpeg), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Wall image error:', error);
    return new Response('Image unavailable', { status: 502 });
  }
}
