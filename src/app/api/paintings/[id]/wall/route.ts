import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getWallView, wallViewPayload } from '@/lib/wallView';

export const dynamic = 'force-dynamic';
// Detection (Gemini + image work) can take a while the first time.
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

// "View on a wall" data for a painting: its real outer size and the URLs of
// the cropped artwork image and the AR model. The first call for a new main
// photo detects the artwork in it (see src/lib/wallView.ts).
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const painting = await prisma.painting.findUnique({ where: { id }, select: { size: true } });
  if (!painting) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const view = await getWallView(id);
  return NextResponse.json({ success: true, ...wallViewPayload(id, painting.size, view) });
}

// Admin: detect again (Paintings form → "Qayta aniqlash").
export async function POST(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const { id } = await params;
  const painting = await prisma.painting.findUnique({ where: { id }, select: { size: true } });
  if (!painting) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const view = await getWallView(id, true);
  return NextResponse.json({ success: true, ...wallViewPayload(id, painting.size, view) });
}
