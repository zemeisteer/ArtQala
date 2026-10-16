import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getSalePriceByPainting } from '@/lib/salePrices';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'daily'; // 'daily' | 'weekly' | 'monthly'

    const now = new Date();

    // 1. Fetch Categories with painting IDs
    const categories = await prisma.category.findMany({
      include: {
        paintings: {
          select: {
            id: true,
            views_count: true,
            _count: { select: { inquiries: true, views: true } },
          },
        },
      },
    });

    const categoryStats = categories.map((cat) => {
      // Views can be calculated from PaintingView count or views_count
      const totalViews = cat.paintings.reduce(
        (sum, p) => sum + (p._count.views > 0 ? p._count.views : p.views_count),
        0
      );
      const totalInquiries = cat.paintings.reduce((sum, p) => sum + p._count.inquiries, 0);

      return {
        id: cat.id,
        slug: cat.slug,
        name_en: cat.name_en,
        name_ru: cat.name_ru,
        name_uz: cat.name_uz,
        views: totalViews,
        inquiries: totalInquiries,
      };
    });

    // 2. Fetch Artists with painting stats
    const artists = await prisma.artist.findMany({
      include: {
        paintings: {
          select: {
            id: true,
            is_sold: true,
            views_count: true,
            _count: { select: { inquiries: true, views: true } },
          },
        },
      },
    });

    const artistStats = artists.map((art) => {
      const totalViews = art.paintings.reduce(
        (sum, p) => sum + (p._count.views > 0 ? p._count.views : p.views_count),
        0
      );
      const totalInquiries = art.paintings.reduce((sum, p) => sum + p._count.inquiries, 0);
      const totalSales = art.paintings.filter((p) => p.is_sold).length;

      return {
        id: art.id,
        name: art.name,
        views: totalViews,
        inquiries: totalInquiries,
        sales: totalSales,
      };
    });

    // 3. Fetch Sold Paintings for Revenue calculation
    const soldPaintings = await prisma.painting.findMany({
      where: { is_sold: true },
      select: {
        id: true,
        price: true,
        discount_price: true,
        sold_at: true,
        updated_at: true,
        created_at: true,
      },
    });

    // The recorded sale price (Paintings form, or agreed in Admin → Inquiries)
    // overrides the painting's list/discount price for revenue purposes.
    const finalPriceByPainting = await getSalePriceByPainting(soldPaintings.map((p) => p.id));

    const effectivePrice = (p: { id: string; price: number; discount_price: number | null }) =>
      finalPriceByPainting.get(p.id) ?? (p.discount_price || p.price);

    const totalRevenue = soldPaintings.reduce((sum, p) => sum + effectivePrice(p), 0);

    // 4. Calculate Timeline Dynamics based on range
    let timeline: {
      label: string;
      dateKey: string;
      revenue: number;
      visits: number;
      views: number;
    }[] = [];

    if (range === 'daily') {
      // Past 14 days
      const daysCount = 14;
      const startDate = new Date(now.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);

      const [views, visits] = await Promise.all([
        prisma.paintingView.findMany({
          where: { created_at: { gte: startDate } },
          select: { created_at: true },
        }),
        prisma.siteVisit.findMany({
          where: { created_at: { gte: startDate } },
          select: { created_at: true },
        }),
      ]);

      const buckets: Record<string, { label: string; revenue: number; visits: number; views: number }> = {};

      for (let i = 0; i < daysCount; i++) {
        const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        buckets[key] = { label, revenue: 0, visits: 0, views: 0 };
      }

      // Populate views
      for (const v of views) {
        const key = v.created_at.toISOString().slice(0, 10);
        if (buckets[key]) buckets[key].views++;
      }

      // Populate visits
      for (const s of visits) {
        const key = s.created_at.toISOString().slice(0, 10);
        if (buckets[key]) buckets[key].visits++;
      }

      // Populate revenue from sold paintings
      for (const p of soldPaintings) {
        const saleDate = p.sold_at || p.updated_at;
        if (saleDate) {
          const key = saleDate.toISOString().slice(0, 10);
          if (buckets[key]) {
            buckets[key].revenue += effectivePrice(p);
          }
        }
      }

      timeline = Object.entries(buckets).map(([dateKey, val]) => ({
        dateKey,
        label: val.label,
        revenue: val.revenue,
        visits: val.visits,
        views: val.views,
      }));
    } else if (range === 'weekly') {
      // Past 8 weeks
      const weeksCount = 8;
      const buckets: {
        label: string;
        dateKey: string;
        start: Date;
        end: Date;
        revenue: number;
        visits: number;
        views: number;
      }[] = [];

      for (let i = weeksCount - 1; i >= 0; i--) {
        const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        const label = `${start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${end.toLocaleDateString('en-US', { day: 'numeric' })}`;
        buckets.push({
          label,
          dateKey: `W-${i}`,
          start,
          end,
          revenue: 0,
          visits: 0,
          views: 0,
        });
      }

      const minStart = buckets[0].start;
      const [views, visits] = await Promise.all([
        prisma.paintingView.findMany({
          where: { created_at: { gte: minStart } },
          select: { created_at: true },
        }),
        prisma.siteVisit.findMany({
          where: { created_at: { gte: minStart } },
          select: { created_at: true },
        }),
      ]);

      for (const b of buckets) {
        b.views = views.filter((v) => v.created_at >= b.start && v.created_at < b.end).length;
        b.visits = visits.filter((v) => v.created_at >= b.start && v.created_at < b.end).length;

        for (const p of soldPaintings) {
          const saleDate = p.sold_at || p.updated_at;
          if (saleDate && saleDate >= b.start && saleDate < b.end) {
            b.revenue += effectivePrice(p);
          }
        }
      }

      timeline = buckets.map((b) => ({
        dateKey: b.dateKey,
        label: b.label,
        revenue: b.revenue,
        visits: b.visits,
        views: b.views,
      }));
    } else {
      // Monthly: past 6-12 months
      const monthsCount = 6;
      const buckets: {
        label: string;
        dateKey: string;
        year: number;
        month: number;
        revenue: number;
        visits: number;
        views: number;
      }[] = [];

      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        buckets.push({
          label,
          dateKey: `${d.getFullYear()}-${d.getMonth() + 1}`,
          year: d.getFullYear(),
          month: d.getMonth(),
          revenue: 0,
          visits: 0,
          views: 0,
        });
      }

      const earliestDate = new Date(buckets[0].year, buckets[0].month, 1);
      const [views, visits] = await Promise.all([
        prisma.paintingView.findMany({
          where: { created_at: { gte: earliestDate } },
          select: { created_at: true },
        }),
        prisma.siteVisit.findMany({
          where: { created_at: { gte: earliestDate } },
          select: { created_at: true },
        }),
      ]);

      for (const b of buckets) {
        b.views = views.filter(
          (v) =>
            v.created_at.getFullYear() === b.year && v.created_at.getMonth() === b.month
        ).length;
        b.visits = visits.filter(
          (v) =>
            v.created_at.getFullYear() === b.year && v.created_at.getMonth() === b.month
        ).length;

        for (const p of soldPaintings) {
          const saleDate = p.sold_at || p.updated_at;
          if (
            saleDate &&
            saleDate.getFullYear() === b.year &&
            saleDate.getMonth() === b.month
          ) {
            b.revenue += effectivePrice(p);
          }
        }
      }

      timeline = buckets.map((b) => ({
        dateKey: b.dateKey,
        label: b.label,
        revenue: b.revenue,
        visits: b.visits,
        views: b.views,
      }));
    }

    // 5. Total overall stats
    const [totalViewsCount, totalVisitsCount, totalInquiriesCount] = await Promise.all([
      prisma.paintingView.count(),
      prisma.siteVisit.count(),
      prisma.inquiry.count(),
    ]);

    return NextResponse.json({
      success: true,
      range,
      timeline,
      categoryStats,
      artistStats,
      summary: {
        totalRevenue,
        totalVisits: totalVisitsCount,
        totalViews: totalViewsCount,
        totalInquiries: totalInquiriesCount,
        totalSales: soldPaintings.length,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
