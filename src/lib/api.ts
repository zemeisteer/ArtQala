import { cache } from 'react';
import { prisma } from './prisma';
import { getBestsellerPaintingIds, withBestsellerFlag } from './bestseller';
import { applyDiscountRules, getActiveDiscountRules } from './discounts';
import { withMainImageOnly } from './paintingImages';

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

// What a listing (gallery grid, home page row) needs of a painting. The
// three long descriptions and the artist's full biography are only shown on
// the painting's own page; leaving them in multiplied the size of every
// listing page's HTML by the number of paintings on it. Same for the extra
// photos: a listing shows only the main (first) one.
export function slimPainting<
  T extends {
    images: string;
    description_en?: unknown;
    description_ru?: unknown;
    description_uz?: unknown;
    artist?: { id: string; name: string } | null;
  }
>(painting: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { description_en, description_ru, description_uz, artist, ...rest } = painting;
  return withMainImageOnly({ ...rest, artist: artist ? { id: artist.id, name: artist.name } : artist });
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

// cache(): generateMetadata() and the page both need the painting — this
// makes that one database round-trip per render instead of two.
export const getPaintingById = cache(async (id: string) => {
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
    // What physically comes with it (e.g. its own frame), for the specs.
    const included_accessory_names = painting.included_accessories.length
      ? await prisma.accessory.findMany({
          where: { id: { in: painting.included_accessories } },
          select: { id: true, name_en: true, name_ru: true, name_uz: true },
        })
      : [];
    return { ...discounted, is_bestseller: bestsellerIds.has(painting.id), included_accessory_names };
  } catch (error) {
    console.error('Error fetching painting by id:', error);
    return null;
  }
});

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
    const artists = await prisma.artist.findMany({
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
    // Artist cards show one thumbnail per painting — its main photo.
    return artists.map((a) => ({ ...a, paintings: a.paintings.map(withMainImageOnly) }));
  } catch (error) {
    console.error('Error fetching artists:', error);
    return [];
  }
}

// One artist's own page: the artist plus every painting of theirs (available
// first, then sold), priced like any listing. cache(): generateMetadata()
// and the page share one query.
export const getArtistWithPaintings = cache(async (id: string) => {
  try {
    const [artist, bestsellerIds, rules] = await Promise.all([
      prisma.artist.findUnique({
        where: { id },
        include: {
          paintings: {
            include: { artist: true, category: { include: { parent: true } } },
            orderBy: [{ is_sold: 'asc' }, { created_at: 'desc' }],
          },
        },
      }),
      getBestsellerPaintingIds(),
      getActiveDiscountRules(),
    ]);
    if (!artist) return null;
    const { paintings, ...rest } = artist;
    return {
      ...rest,
      paintings: withBestsellerFlag(applyDiscountRules(paintings, rules), bestsellerIds).map(slimPainting),
    };
  } catch (error) {
    console.error('Error fetching artist:', error);
    return null;
  }
});

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
