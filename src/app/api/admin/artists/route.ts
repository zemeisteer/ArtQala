import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const artists = await prisma.artist.findMany({
      include: {
        category: true,
        _count: { select: { paintings: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ success: true, artists });
  } catch (error) {
    console.error('Fetch artists error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch artists' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { name, bio_uz, bio_en, bio_ru, specialty_uz, specialty_en, specialty_ru, photo, pdf, initials, category_id } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const artist = await prisma.artist.create({
      data: {
        name,
        bio_en: bio_en || bio_uz || '',
        bio_ru: bio_ru || bio_uz || '',
        bio_uz: bio_uz || name,
        specialty_en: specialty_en || specialty_uz || 'Painter',
        specialty_ru: specialty_ru || specialty_uz || 'Художник',
        specialty_uz: specialty_uz || 'Rassom',
        photo: photo || null,
        pdf: pdf || null,
        initials: initials || name.slice(0, 2).toUpperCase(),
        category_id: category_id || null,
      },
    });

    return NextResponse.json({ success: true, artist });
  } catch (error) {
    console.error('Create artist error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create artist' }, { status: 500 });
  }
}
