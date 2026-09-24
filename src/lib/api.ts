import { prisma } from './prisma';
import { getBestsellerPaintingIds, withBestsellerFlag } from './bestseller';
import { applyDiscountRules, getActiveDiscountRules } from './discounts';

const FEATURED_COUNT = 8;
const FEATURED_MAX_PER_ARTIST = 2;

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Picks `count` paintings spread across product types and artists instead
// of just the newest ones: round-robin over product types (a shuffled pool
// per type), capping each artist at FEATURED_MAX_PER_ARTIST — the cap is
// only relaxed if there aren't enough distinct artists to fill the row.
function pickDiverse<
  T extends { id: string; artist_id: string; category_id: string; category?: { parent_id?: string | null } | null }
>(pool: T[], count: number): T[] {
  const byType = new Map<string, T[]>();
  for (const p of shuffle(pool)) {
    const type = p.category?.parent_id || p.category_id;
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(p);
  }
  const queues = shuffle([...byType.values()]);

  const picked: T[] = [];
  const perArtist = new Map<string, number>();
  for (const cap of [FEATURED_MAX_PER_ARTIST, Infinity]) {
    let progressed = true;
    while (picked.length < count && progressed) {
      progressed = false;
      for (const queue of queues) {
        if (picked.length >= count) break;
        const idx = queue.findIndex((p) => (perArtist.get(p.artist_id) || 0) < cap);
        if (idx === -1) continue;
        const [p] = queue.splice(idx, 1);
        picked.push(p);
        perArtist.set(p.artist_id, (perArtist.get(p.artist_id) || 0) + 1);
        progressed = true;
      }
    }
  }
  return picked;
}

// Home page row + hero: a fresh random, diversified selection on every
// revalidation (see `revalidate` in src/app/page.tsx). Featured, unsold
// pieces come first; if there aren't enough of them the row is topped up
// with other available paintings rather than left short.
export async function getFeaturedPaintings() {
  try {
    const [paintings, bestsellerIds, rules] = await Promise.all([
      prisma.painting.findMany({
        where: { is_sold: false },
        include: {
          artist: true,
          category: true,
        },
      }),
      getBestsellerPaintingIds(),
      getActiveDiscountRules(),
    ]);

    const featured = pickDiverse(
      paintings.filter((p) => p.is_featured),
      FEATURED_COUNT
    );
    const pickedIds = new Set(featured.map((p) => p.id));
    const topUp = pickDiverse(
      paintings.filter((p) => !pickedIds.has(p.id)),
      FEATURED_COUNT - featured.length
    );

    return withBestsellerFlag(applyDiscountRules([...featured, ...topUp], rules), bestsellerIds);
  } catch (error) {
    console.error('Error fetching featured paintings:', error);
    return [];
  }
}

export async function getAllPaintings(categorySlug?: string) {
  try {
    const where: Record<string, unknown> = {};
    if (categorySlug && categorySlug !== 'all') {
      where.category = { slug: categorySlug };
    }

    const [paintings, bestsellerIds, rules] = await Promise.all([
      prisma.painting.findMany({
        where,
        include: {
          artist: true,
          category: { include: { parent: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      getBestsellerPaintingIds(),
      getActiveDiscountRules(),
    ]);
    return withBestsellerFlag(applyDiscountRules(paintings, rules), bestsellerIds);
  } catch (error) {
    console.error('Error fetching paintings:', error);
    return [];
  }
}

export async function getPaintingById(id: string) {
  try {
    const [painting, bestsellerIds, rules] = await Promise.all([
      prisma.painting.findUnique({
        where: { id },
        include: {
          artist: true,
          category: { include: { parent: true } },
        },
      }),
      getBestsellerPaintingIds(),
      getActiveDiscountRules(),
    ]);
    if (!painting) return null;
    const [discounted] = applyDiscountRules([painting], rules);
    return { ...discounted, is_bestseller: bestsellerIds.has(painting.id) };
  } catch (error) {
    console.error('Error fetching painting by id:', error);
    return null;
  }
}

// Related paintings for a painting detail page: same artist first, then
// same category, filling up to `limit` without duplicates.
export async function getRelatedPaintings(
  paintingId: string,
  artistId: string,
  categoryId: string,
  limit = 8
) {
  try {
    const byArtist = await prisma.painting.findMany({
      where: { artist_id: artistId, id: { not: paintingId } },
      include: { artist: true, category: true },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    if (byArtist.length >= limit) {
      const [bestsellerIds, rules] = await Promise.all([
        getBestsellerPaintingIds(),
        getActiveDiscountRules(),
      ]);
      return withBestsellerFlag(applyDiscountRules(byArtist, rules), bestsellerIds);
    }

    const byCategory = await prisma.painting.findMany({
      where: {
        category_id: categoryId,
        id: { notIn: [paintingId, ...byArtist.map((p) => p.id)] },
      },
      include: { artist: true, category: true },
      orderBy: { created_at: 'desc' },
      take: limit - byArtist.length,
    });

    const [bestsellerIds, rules] = await Promise.all([
      getBestsellerPaintingIds(),
      getActiveDiscountRules(),
    ]);
    return withBestsellerFlag(applyDiscountRules([...byArtist, ...byCategory], rules), bestsellerIds);
  } catch (error) {
    console.error('Error fetching related paintings:', error);
    return [];
  }
}

export async function getArtists() {
  try {
    return await prisma.artist.findMany({
      include: {
        paintings: {
          take: 3,
          select: {
            id: true,
            title_en: true,
            images: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching artists:', error);
    return [];
  }
}

export async function getCategories() {
  try {
    return await prisma.category.findMany({
      orderBy: { name_en: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}
