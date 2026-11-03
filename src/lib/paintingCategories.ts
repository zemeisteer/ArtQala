import { cache } from 'react';
import { prisma } from './prisma';

// A painting has a main category (category_id — the one its breadcrumbs,
// related works and Telegram/llms texts use) and any number of extra ones
// (Painting.extra_category_ids), at either level: a subject (bola) or a
// product type (ota). Everything that asks "is this painting in category
// X?" — gallery filters, category discounts, accessory scoping — goes
// through the tags made here: every category the painting is in, plus each
// one's parent, as ids and slugs.

export interface CategoryLite {
  id: string;
  slug: string;
  parent_id: string | null;
  name_en: string;
  name_ru: string;
  name_uz: string;
  translations: string | null;
}

export interface CategoryTags {
  category_ids: string[];
  category_slugs: string[];
  // The extra categories themselves, for showing on the painting's page.
  extra_categories: CategoryLite[];
}

// All categories, once per request (a handful of rows).
export const getCategoryMap = cache(async (): Promise<Map<string, CategoryLite>> => {
  const rows = await prisma.category.findMany({
    select: { id: true, slug: true, parent_id: true, name_en: true, name_ru: true, name_uz: true, translations: true },
  });
  return new Map(rows.map((r) => [r.id, r]));
});

export function categoryTags(
  p: { category_id: string; extra_category_ids?: string[] | null },
  map: Map<string, CategoryLite>
): CategoryTags {
  const ids = new Set<string>();
  const extras: CategoryLite[] = [];
  for (const id of [p.category_id, ...(p.extra_category_ids || [])]) {
    const c = map.get(id);
    if (!c) continue;
    ids.add(c.id);
    if (c.parent_id) ids.add(c.parent_id);
    if (id !== p.category_id && !extras.some((e) => e.id === c.id)) extras.push(c);
  }
  const category_ids = [...ids];
  const category_slugs = category_ids.map((id) => map.get(id)?.slug).filter((s): s is string => !!s);
  return { category_ids, category_slugs, extra_categories: extras };
}

export async function withCategoryTags<T extends { category_id: string; extra_category_ids?: string[] | null }>(
  paintings: T[]
): Promise<(T & CategoryTags)[]> {
  if (paintings.length === 0) return [];
  const map = await getCategoryMap();
  return paintings.map((p) => ({ ...p, ...categoryTags(p, map) }));
}

// Admin form input → the painting's extra categories: existing category ids
// only, never its main category (or that one's parent), no duplicates.
export async function extraCategoryIdsFrom(value: unknown, mainCategoryId: string): Promise<string[]> {
  if (!Array.isArray(value)) return [];
  const map = await getCategoryMap();
  const main = map.get(mainCategoryId);
  const skip = new Set([mainCategoryId, main?.parent_id].filter(Boolean));
  return Array.from(new Set(value.filter((v): v is string => typeof v === 'string' && map.has(v) && !skip.has(v))));
}
