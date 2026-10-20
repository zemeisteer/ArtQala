import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyIndexNow } from '@/lib/indexNow';
import { accessoryIdList } from '@/lib/accessoryPricing';
import { requireAdmin } from '@/lib/auth';
import { parseSoldPrice } from '@/lib/salePriceInput';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const painting = await prisma.painting.findUnique({
      where: { id },
      include: {
        artist: true,
        category: true,
      },
      omit: { sold_price: false },
    });

    if (!painting) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, painting });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.painting.findUnique({
      where: { id },
      select: { is_sold: true, sold_at: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const nextIsSold = Boolean(body.is_sold);
    // Only stamp sold_at the moment a painting first becomes sold — an
    // unrelated edit to an already-sold painting must not reset it (which
    // would silently shift it into today's revenue bucket on the dashboard).
    const nextSoldAt = nextIsSold ? (existing.is_sold ? existing.sold_at : new Date()) : null;

    const updated = await prisma.painting.update({
      where: { id },
      data: {
        title_en: body.title_en,
        title_ru: body.title_ru,
        title_uz: body.title_uz,
        description_en: body.description_en,
        description_ru: body.description_ru,
        description_uz: body.description_uz,
        size: body.size,
        technique_en: body.technique_en,
        technique_ru: body.technique_ru,
        technique_uz: body.technique_uz,
        year: body.year ? parseInt(body.year) : undefined,
        price: body.price ? parseFloat(body.price) : undefined,
        discount_price: body.discount_price ? parseFloat(body.discount_price) : null,
        discount_starts_at: body.discount_starts_at ? new Date(body.discount_starts_at) : null,
        discount_ends_at: body.discount_ends_at ? new Date(body.discount_ends_at) : null,
        is_sold: nextIsSold,
        sold_at: nextSoldAt,
        // Only kept while sold; un-selling clears it.
        sold_price: nextIsSold ? parseSoldPrice(body.sold_price) : null,
        is_featured: Boolean(body.is_featured),
        // Older cached forms don't send it — leave it as is then.
        included_accessories: Array.isArray(body.included_accessories)
          ? accessoryIdList(body.included_accessories)
          : undefined,
        images: body.images || undefined,
        artist_id: body.artist_id,
        category_id: body.category_id,
      },
    });

    notifyIndexNow([`/gallery/${id}`, `/artists/${updated.artist_id}`]);
    return NextResponse.json({ success: true, painting: updated });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

// Lightweight partial update used to toggle "sold" straight from the
// inquiries panel — deliberately touches only is_sold/sold_at, unlike PUT
// above which rewrites the whole form and would otherwise wipe out fields
// (e.g. discount_price) that weren't included in the request body.
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const body = await request.json();

    if (typeof body.is_sold !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'is_sold (boolean) is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.painting.findUnique({
      where: { id },
      select: { is_sold: true, sold_at: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const nextSoldAt = body.is_sold ? (existing.is_sold ? existing.sold_at : new Date()) : null;

    const updated = await prisma.painting.update({
      where: { id },
      // Un-selling clears the recorded sale price; marking sold from an
      // inquiry leaves it alone (that sale's price lives on the inquiry).
      data: { is_sold: body.is_sold, sold_at: nextSoldAt, ...(!body.is_sold && { sold_price: null }) },
    });

    notifyIndexNow([`/gallery/${id}`]);
    return NextResponse.json({ success: true, painting: updated });
  } catch (error) {
    console.error('Mark sold error:', error);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    // A multi-painting inquiry points its painting_id at its first painting,
    // and that relation cascades — re-point such inquiries at another of
    // their paintings first, so deleting one painting doesn't erase the
    // customer's whole inquiry (its own InquiryItem is kept via SetNull).
    const groupedInquiries = await prisma.inquiry.findMany({
      where: { painting_id: id, items: { some: { painting_id: { not: id } } } },
      select: { id: true, items: { where: { painting_id: { not: id } }, orderBy: { position: 'asc' }, take: 1, select: { painting_id: true } } },
    });
    for (const inq of groupedInquiries) {
      const next = inq.items[0]?.painting_id;
      if (next) await prisma.inquiry.update({ where: { id: inq.id }, data: { painting_id: next } });
    }
    await prisma.painting.delete({ where: { id } });
    notifyIndexNow([`/gallery/${id}`]);
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}
