import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await prisma.artist.update({
      where: { id },
      data: {
        name: body.name,
        specialty_en: body.specialty_en,
        specialty_ru: body.specialty_ru,
        specialty_uz: body.specialty_uz,
        bio_en: body.bio_en,
        bio_ru: body.bio_ru,
        bio_uz: body.bio_uz,
        photo: body.photo,
        pdf: body.pdf,
        category_id: body.category_id || null,
      },
    });

    return NextResponse.json({ success: true, artist: updated });
  } catch (error) {
    console.error('Update artist error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update artist' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    await prisma.artist.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete artist error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete artist' }, { status: 500 });
  }
}
