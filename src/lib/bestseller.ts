import { cache } from 'react';
import { prisma } from './prisma';

// A painting is one of a kind, so "bestseller" can't mean "sold many times" —
// it means "many buyers have inquired about this exact piece while it's still
// available", which is the closest real signal of demand we have. Keeping the
// minimum-inquiries and top-N counts here so the whole site stays consistent.
export const BESTSELLER_MIN_INQUIRIES = 2;
export const BESTSELLER_TOP_N = 6;

// cache(): one query per page render, however many loaders ask for it.
export const getBestsellerPaintingIds = cache(async (): Promise<Set<string>> => {
  try {
    const candidates = await prisma.painting.findMany({
      where: { is_sold: false },
      select: { id: true, _count: { select: { inquiries: true } } },
    });

    const ids = candidates
      .filter((p) => p._count.inquiries >= BESTSELLER_MIN_INQUIRIES)
      .sort((a, b) => b._count.inquiries - a._count.inquiries)
      .slice(0, BESTSELLER_TOP_N)
      .map((p) => p.id);

    return new Set(ids);
  } catch (error) {
    console.error('Error computing bestseller paintings:', error);
    return new Set();
  }
});

export function withBestsellerFlag<T extends { id: string }>(
  paintings: T[],
  bestsellerIds: Set<string>
): (T & { is_bestseller: boolean })[] {
  return paintings.map((p) => ({ ...p, is_bestseller: bestsellerIds.has(p.id) }));
}
