import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { translateAfterSave } from '@/lib/translateContent';
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

    // A category can't be its own parent, and (since only one level is used
    // today) can't be assigned a parent that itself has a parent.
    if (body.parent_id === id) {
      return NextResponse.json({ success: false, error: 'A category cannot be its own parent' }, { status: 400 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name_en: body.name_en,
        name_ru: body.name_ru,
        name_uz: body.name_uz,
        slug: body.slug,
        parent_id: body.parent_id || null,
      },
    });

    translateAfterSave('category', updated.id);
    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update category' }, { status: 500 });
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
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete category' }, { status: 500 });
  }
}
