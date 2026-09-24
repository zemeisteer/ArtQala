import { prisma } from './prisma';

// Rule-based discounts (the Discount table) — an ARTIST/CATEGORY/SITE rule
// applies to every matching painting without touching the paintings
// themselves, so it has to be resolved at read time. A painting's own
// discount_price (set in the Paintings form, or by a PAINTING-scope rule)
// always wins; otherwise the most specific active rule does:
// ARTIST > CATEGORY > SITE.

export interface DiscountRule {
  id: string;
  scope: string;
  target_id: string | null;
  percent: number;
  starts_at: Date | null;
  ends_at: Date | null;
  is_active: boolean;
}

interface DiscountablePainting {
  price: number;
  discount_price: number | null;
  artist_id: string;
  category_id: string;
  category?: { parent_id?: string | null } | null;
}

export function isRuleActive(rule: DiscountRule, now = new Date()): boolean {
  if (!rule.is_active || !(rule.percent > 0)) return false;
  if (rule.starts_at && new Date(rule.starts_at) > now) return false;
  // ends_at is picked as a calendar day — the rule stays valid through the
  // whole of that day, not just until its midnight.
  if (rule.ends_at && new Date(rule.ends_at).getTime() + 24 * 60 * 60 * 1000 <= now.getTime()) {
    return false;
  }
  return true;
}

export async function getActiveDiscountRules(): Promise<DiscountRule[]> {
  try {
    const rules = await prisma.discount.findMany({
      where: { is_active: true, scope: { in: ['ARTIST', 'CATEGORY', 'SITE'] } },
    });
    const now = new Date();
    return rules.filter((r) => isRuleActive(r, now));
  } catch (error) {
    console.error('Error fetching discount rules:', error);
    return [];
  }
}

// The best matching rule for a painting, most specific first. A CATEGORY
// rule may target either the painting's own (leaf) category or its parent
// product type, so a rule on "Kartina" covers every subject under it.
export function findRuleFor(
  painting: Pick<DiscountablePainting, 'artist_id' | 'category_id' | 'category'>,
  rules: DiscountRule[]
): DiscountRule | null {
  const pickMax = (list: DiscountRule[]) =>
    list.length ? list.reduce((a, b) => (b.percent > a.percent ? b : a)) : null;

  const parentId = painting.category?.parent_id || null;
  return (
    pickMax(rules.filter((r) => r.scope === 'ARTIST' && r.target_id === painting.artist_id)) ||
    pickMax(
      rules.filter(
        (r) =>
          r.scope === 'CATEGORY' &&
          (r.target_id === painting.category_id || (!!parentId && r.target_id === parentId))
      )
    ) ||
    pickMax(rules.filter((r) => r.scope === 'SITE'))
  );
}

export function applyDiscountRules<T extends DiscountablePainting>(
  paintings: T[],
  rules: DiscountRule[]
): T[] {
  if (rules.length === 0) return paintings;
  return paintings.map((p) => {
    if (p.discount_price && p.discount_price < p.price) return p;
    const rule = findRuleFor(p, rules);
    if (!rule) return p;
    return { ...p, discount_price: Math.round(p.price * (1 - rule.percent / 100)) };
  });
}
