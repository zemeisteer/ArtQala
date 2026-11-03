// A painting's Category is a subject-matter tag (Nature, Portraits, ...).
// For accessory scoping we care about the physical PRODUCT TYPE instead —
// the top-level category it belongs to (Kartina, Kulolchilik, ...). A
// top-level category (no parent) is already its own product type.
export function effectiveProductType(category?: { slug: string; parent?: { slug: string } | null } | null): string | null {
  if (!category) return null;
  return category.parent?.slug ?? category.slug;
}

// Accessory.product_types: [] = offered everywhere; otherwise a top-level
// Category slug (the painting's product type, see effectiveProductType) or
// a Services code (MURAL/CERAMICS/CUSTOM). `targets` is what the request is
// about — e.g. ['kartina', 'nature'] for a painting (its product type, plus
// its own leaf slug for accessories scoped the older way) or ['MURAL'].
export function accessoryAppliesTo(productTypes: string[] | null | undefined, targets: string[]): boolean {
  if (!productTypes || productTypes.length === 0) return true;
  return productTypes.some((t) => targets.includes(t));
}

// What a painting's accessories are scoped against: its main category and
// product type, plus every extra category's (`allSlugs` — category_slugs from
// src/lib/paintingCategories.ts), so a carved panel that is also a painting
// is offered the painting accessories too.
export function paintingAccessoryTargets(
  category?: { slug: string; parent?: { slug: string } | null } | null,
  allSlugs?: string[] | null
): string[] {
  const own = category ? [category.parent?.slug, category.slug] : [];
  return Array.from(new Set([...own, ...(allSlugs || [])].filter((s): s is string => Boolean(s))));
}
