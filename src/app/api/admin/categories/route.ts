import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { translateAfterSave } from '@/lib/translateContent';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        _count: { select: { paintings: true } },
      },
      orderBy: { created_at: 'asc' },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('Fetch categories error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { name_en, name_ru, name_uz, slug, parent_id } = body;

    if (!name_en && !name_uz) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
    }

    const finalSlug = (slug || name_en || name_uz || 'category')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const category = await prisma.category.create({
      data: {
        slug: finalSlug,
        name_en: name_en || name_uz,
        name_ru: name_ru || name_uz,
        name_uz: name_uz || name_en,
        parent_id: parent_id || null,
      },
    });

    translateAfterSave('category', category.id);
    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
  }
}
