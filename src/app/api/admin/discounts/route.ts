import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const discounts = await prisma.discount.findMany({
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({ success: true, discounts });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { scope, target_id, percent, starts_at, ends_at, is_active } = body;

    const discount = await prisma.discount.create({
      data: {
        scope, // SITE, CATEGORY, ARTIST, PAINTING
        target_id: target_id || null,
        percent: parseFloat(percent) || 0,
        starts_at: starts_at ? new Date(starts_at) : null,
        ends_at: ends_at ? new Date(ends_at) : null,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      },
    });

    // If scope is PAINTING, calculate discount_price directly on painting
    if (scope === 'PAINTING' && target_id) {
      const painting = await prisma.painting.findUnique({ where: { id: target_id } });
      if (painting) {
        const discountPrice = Math.round(painting.price * (1 - (parseFloat(percent) || 0) / 100));
        await prisma.painting.update({
          where: { id: target_id },
          data: {
            discount_price: discountPrice,
            discount_starts_at: starts_at ? new Date(starts_at) : null,
            discount_ends_at: ends_at ? new Date(ends_at) : null,
          },
        });
      }
    }

    return NextResponse.json({ success: true, discount });
  } catch (error) {
    console.error('Discount creation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create discount' }, { status: 500 });
  }
}

// Edit an existing rule in place — used by the Paintings form, which
// shows the artist/category rule a painting falls under and lets the admin
// change its percent or dates without creating a duplicate rule.
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { id, percent, starts_at, ends_at, is_active } = body;
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    const discount = await prisma.discount.update({
      where: { id },
      data: {
        ...(percent !== undefined && { percent: parseFloat(percent) || 0 }),
        ...(starts_at !== undefined && { starts_at: starts_at ? new Date(starts_at) : null }),
        ...(ends_at !== undefined && { ends_at: ends_at ? new Date(ends_at) : null }),
        ...(is_active !== undefined && { is_active: Boolean(is_active) }),
      },
    });
    return NextResponse.json({ success: true, discount });
  } catch (error) {
    console.error('Discount update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update discount' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    await prisma.discount.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Delete error' }, { status: 500 });
  }
}
