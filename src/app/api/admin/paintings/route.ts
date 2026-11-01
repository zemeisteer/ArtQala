import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyIndexNow } from '@/lib/indexNow';
import { accessoryIdList } from '@/lib/accessoryPricing';
import { requireAdmin } from '@/lib/auth';
import { postToChannelIfNew } from '@/lib/telegramChannel';
import { translateAfterSave } from '@/lib/translateContent';
import { parseSoldPrice } from '@/lib/salePriceInput';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const paintings = await prisma.painting.findMany({
      include: {
        artist: true,
        category: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({ success: true, paintings });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const {
      title_en,
      title_ru,
      title_uz,
      description_en,
      description_ru,
      description_uz,
      size,
      technique_en,
      technique_ru,
      technique_uz,
      year,
      price,
      discount_price,
      discount_starts_at,
      discount_ends_at,
      is_sold,
      sold_price,
      is_featured,
      included_accessories,
      images,
      artist_id,
      category_id,
    } = body;

    const newPainting = await prisma.painting.create({
      data: {
        title_en,
        title_ru: title_ru || title_en,
        title_uz: title_uz || title_en,
        description_en,
        description_ru: description_ru || description_en,
        description_uz: description_uz || description_en,
        size: size || '60 × 80 cm',
        technique_en: technique_en || 'Oil on canvas',
        technique_ru: technique_ru || 'Холст, масло',
        technique_uz: technique_uz || "Moybo'yoq, polotno",
        year: parseInt(year) || 2024,
        price: parseFloat(price) || 0,
        discount_price: discount_price ? parseFloat(discount_price) : null,
        discount_starts_at: discount_starts_at ? new Date(discount_starts_at) : null,
        discount_ends_at: discount_ends_at ? new Date(discount_ends_at) : null,
        is_sold: Boolean(is_sold),
        sold_at: is_sold ? new Date() : null,
        sold_price: is_sold ? parseSoldPrice(sold_price) : null,
        is_featured: Boolean(is_featured),
        included_accessories: accessoryIdList(included_accessories),
        images: images || JSON.stringify(['/assets/p-arch.svg']),
        artist_id,
        category_id,
      },
    });

    notifyIndexNow([`/gallery/${newPainting.id}`, `/artists/${newPainting.artist_id}`]);
    // A new, unsold work goes to the public Telegram channel (if connected).
    await postToChannelIfNew(newPainting.id).catch((error) => console.error('Channel post failed:', error));
    translateAfterSave('painting', newPainting.id);
    return NextResponse.json({ success: true, painting: newPainting });
  } catch (error) {
    console.error('Create painting error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create painting' }, { status: 500 });
  }
}
