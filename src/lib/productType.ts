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

// What a painting's accessories are scoped against.
export function paintingAccessoryTargets(
  category?: { slug: string; parent?: { slug: string } | null } | null
): string[] {
  if (!category) return [];
  return Array.from(new Set([category.parent?.slug, category.slug].filter((s): s is string => Boolean(s))));
}
