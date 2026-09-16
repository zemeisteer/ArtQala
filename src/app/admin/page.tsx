import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const now = new Date();

  // 1. Fetch Categories with stats
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

  // 2. Fetch Artists with stats
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

  // 3. Sold paintings & total revenue
  const soldPaintings = await prisma.painting.findMany({
    where: { is_sold: true },
    select: {
      id: true,
      price: true,
      discount_price: true,
      sold_at: true,
      updated_at: true,
    },
  });

  // A curator-agreed final_price (set on the winning inquiry) overrides the
  // painting's list/discount price for revenue purposes — it's the actual
  // negotiated sale amount, not just whatever the listing showed.
  const finalPriceByPainting = new Map<string, number>();
  if (soldPaintings.length > 0) {
    const soldPaintingIds = soldPaintings.map((p) => p.id);
    const inquiriesWithFinalPrice = await prisma.inquiry.findMany({
      where: { painting_id: { in: soldPaintingIds }, final_price: { not: null } },
      select: { painting_id: true, final_price: true, updated_at: true },
      orderBy: { updated_at: 'desc' },
    });
    for (const inq of inquiriesWithFinalPrice) {
      if (!finalPriceByPainting.has(inq.painting_id) && inq.final_price != null) {
        finalPriceByPainting.set(inq.painting_id, inq.final_price);
      }
    }
  }

  const effectivePrice = (p: { id: string; price: number; discount_price: number | null }) =>
    finalPriceByPainting.get(p.id) ?? (p.discount_price || p.price);

  const totalRevenue = soldPaintings.reduce((sum, p) => sum + effectivePrice(p), 0);

  // 4. Initial Daily Timeline (Past 14 days)
  const daysCount = 14;
  const startDate = new Date(now.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  const [recentViews, recentVisits] = await Promise.all([
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

  for (const v of recentViews) {
    const key = v.created_at.toISOString().slice(0, 10);
    if (buckets[key]) buckets[key].views++;
  }

  for (const s of recentVisits) {
    const key = s.created_at.toISOString().slice(0, 10);
    if (buckets[key]) buckets[key].visits++;
  }

  for (const p of soldPaintings) {
    const saleDate = p.sold_at || p.updated_at;
    if (saleDate) {
      const key = saleDate.toISOString().slice(0, 10);
      if (buckets[key]) {
        buckets[key].revenue += effectivePrice(p);
      }
    }
  }

  const initialTimeline = Object.entries(buckets).map(([dateKey, val]) => ({
    dateKey,
    label: val.label,
    revenue: val.revenue,
    visits: val.visits,
    views: val.views,
  }));

  // 5. Counts summary
  const [totalViewsCount, totalVisitsCount, totalInquiriesCount] = await Promise.all([
    prisma.paintingView.count(),
    prisma.siteVisit.count(),
    prisma.inquiry.count(),
  ]);

  // 5b. Content inventory — just the three main catalog counts, shown on
  // the dashboard so the curator can see what's filled in at a glance.
  const [paintingsCount, artistsCount, categoriesCount] = await Promise.all([
    prisma.painting.count(),
    prisma.artist.count(),
    prisma.category.count(),
  ]);

  // 6. Recent inquiries
  const recentInquiries = await prisma.inquiry.findMany({
    take: 5,
    orderBy: { created_at: 'desc' },
    include: {
      painting: {
        select: {
          title_en: true,
          title_ru: true,
          title_uz: true,
        },
      },
    },
  });

  // 7. Top viewed paintings
  const topViewedPaintings = await prisma.painting.findMany({
    take: 5,
    orderBy: { views_count: 'desc' },
    include: {
      artist: { select: { name: true } },
      _count: { select: { inquiries: true } },
    },
  });

  return (
    <AdminDashboardClient
      initialSummary={{
        totalRevenue,
        totalVisits: totalVisitsCount,
        totalViews: totalViewsCount,
        totalInquiries: totalInquiriesCount,
        totalSales: soldPaintings.length,
      }}
      initialTimeline={initialTimeline}
      initialCategoryStats={categoryStats}
      initialArtistStats={artistStats}
      recentInquiries={recentInquiries}
      topViewedPaintings={topViewedPaintings}
      contentCounts={{
        paintings: paintingsCount,
        artists: artistsCount,
        categories: categoriesCount,
      }}
    />
  );
}
