import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ wishlist: [], ids: [] });
    }

    // ?ids=1 — just the painting ids (AppContext's sign-in sync).
    if (new URL(request.url).searchParams.get('ids')) {
      const rows = await prisma.wishlistItem.findMany({
        where: { user_id: session.id },
        select: { painting_id: true },
      });
      return NextResponse.json({ success: true, ids: rows.map((r) => r.painting_id) });
    }

    const items = await prisma.wishlistItem.findMany({
      where: { user_id: session.id },
      include: {
        painting: {
          include: {
            artist: true,
            category: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({
      success: true,
      wishlist: items.map((i) => i.painting),
    });
  } catch (error) {
    console.error('Wishlist fetch error:', error);
    return NextResponse.json({ wishlist: [] });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { paintingIds } = await request.json();

    if (Array.isArray(paintingIds)) {
      // Only paintings that exist (a stale id in someone's browser must not
      // fail the whole sync).
      const wanted = paintingIds.filter((x: unknown): x is string => typeof x === 'string').slice(0, 200);
      const existing = await prisma.painting.findMany({ where: { id: { in: wanted } }, select: { id: true } });
      for (const { id: pId } of existing) {
        await prisma.wishlistItem.upsert({
          where: {
            user_id_painting_id: {
              user_id: session.id,
              painting_id: pId,
            },
          },
          create: {
            user_id: session.id,
            painting_id: pId,
          },
          update: {},
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Wishlist synced' });
  } catch (error) {
    console.error('Wishlist sync error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// Removes one painting from the signed-in user's wishlist.
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { paintingId } = await request.json().catch(() => ({}));
    if (typeof paintingId !== 'string') {
      return NextResponse.json({ success: false, error: 'paintingId is required' }, { status: 400 });
    }
    await prisma.wishlistItem.deleteMany({ where: { user_id: session.id, painting_id: paintingId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Wishlist remove error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
