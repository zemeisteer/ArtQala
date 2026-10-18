import { prisma } from './prisma';
import { priceForSize, type SizeBucket } from './paintingSize';
import type { AccessorySnapshot } from './inquiryItems';
import { accessoryAppliesTo } from './productType';

export { accessoryAppliesTo, paintingAccessoryTargets } from './productType';

// Server-side source of truth for accessory prices: only the ids the
// customer checked are honored, and name/price always come from the DB
// (never from the client), priced for the given size tier. Accessories not
// configured for `targets` are dropped, even if a client sends them, and so
// are the ones in `exclude` (Painting.included_accessories — e.g. a painting
// that already comes with its own frame is never charged for one).
export async function resolveAccessories(
  ids: unknown,
  sizeBucket: SizeBucket | null,
  targets: string[],
  exclude: string[] = []
): Promise<AccessorySnapshot[]> {
  if (!Array.isArray(ids)) return [];
  const wanted = ids.filter((id): id is string => typeof id === 'string' && id.length > 0 && !exclude.includes(id));
  if (wanted.length === 0) return [];
  const found = await prisma.accessory.findMany({
    where: { id: { in: wanted }, is_active: true },
    select: {
      id: true,
      name_en: true,
      name_ru: true,
      name_uz: true,
      price_small: true,
      price_medium: true,
      price_large: true,
      product_types: true,
    },
  });
  return found.filter((a) => accessoryAppliesTo(a.product_types, targets)).map((a) => ({
    id: a.id,
    name_en: a.name_en,
    name_ru: a.name_ru,
    name_uz: a.name_uz,
    price: priceForSize(a, sizeBucket),
  }));
}

// Accepts either a list of ids or the older [{id, ...}] client shape.
export function accessoryIdsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v : (v as { id?: unknown })?.id))
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

// Painting.included_accessories as submitted by the admin form.
export function accessoryIdList(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0)))
    : [];
}
