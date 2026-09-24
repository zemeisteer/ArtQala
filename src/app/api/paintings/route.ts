import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBestsellerPaintingIds, withBestsellerFlag } from '@/lib/bestseller';
import { applyDiscountRules, getActiveDiscountRules } from '@/lib/discounts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const search = searchParams.get('q');

    const where: Record<string, unknown> = {};

    if (category && category !== 'all') {
      where.category = { slug: category };
    }

    if (featured === 'true') {
      where.is_featured = true;
    }

    if (search) {
      where.OR = [
        { title_en: { contains: search } },
        { title_ru: { contains: search } },
        { title_uz: { contains: search } },
        { artist: { name: { contains: search } } },
      ];
    }

    const [paintings, bestsellerIds, rules] = await Promise.all([
      prisma.painting.findMany({
        where,
        include: {
          artist: true,
          category: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      getBestsellerPaintingIds(),
      getActiveDiscountRules(),
    ]);

    return NextResponse.json({
      success: true,
      paintings: withBestsellerFlag(applyDiscountRules(paintings, rules), bestsellerIds),
    });
  } catch (error) {
    console.error('API paintings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch paintings' },
      { status: 500 }
    );
  }
}
