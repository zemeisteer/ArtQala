import { prisma } from './prisma';
import { applyDiscountRules, getActiveDiscountRules } from './discounts';
import { sendPriceDropEmail } from './email';
import { signValue } from './auth';
import { mainImage } from './paintingImages';
import { SITE_URL } from './siteUrl';

// Ignore changes smaller than this (rounding of percentage discounts).
const MIN_DROP_USD = 1;

export function priceAlertUnsubscribeUrl(userId: string): string {
  return `${SITE_URL}/api/user/price-alerts/unsubscribe?u=${encodeURIComponent(userId)}&s=${signValue(`price-alerts:${userId}`)}`;
}

export function isValidUnsubscribe(userId: string, signature: string): boolean {
  return !!userId && !!signature && signValue(`price-alerts:${userId}`) === signature;
}

// Daily (run from the cron in src/app/api/cron/review-reminders): for every
// signed-in user's wishlist painting that's still for sale, compare the
// price a visitor sees now (own discount or ARTIST/CATEGORY/SITE rule) with
// the last price we recorded for that user:
// - first time: just record it (no email);
// - lower by at least $1: one email per user listing every drop, then record;
// - higher: record it, so the next real drop is noticed.
// Guests' wishlists live only in their browser, so they can't be alerted.
export async function runPriceAlerts(): Promise<{ checked: number; emailed: number; drops: number }> {
  const [items, rules] = await Promise.all([
    prisma.wishlistItem.findMany({
      where: { painting: { is_sold: false }, user: { price_alerts: true, email_verified: true } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        painting: {
          select: {
            id: true,
            title_en: true,
            price: true,
            discount_price: true,
            discount_starts_at: true,
            discount_ends_at: true,
            artist_id: true,
            category_id: true,
            images: true,
            category: { select: { parent_id: true } },
          },
        },
      },
    }),
    getActiveDiscountRules(),
  ]);

  const priced = applyDiscountRules(
    items.map((it) => it.painting),
    rules
  );
  const currentById = new Map(priced.map((p) => [p.id, p.discount_price || p.price]));

  const dropsByUser = new Map<
    string,
    { user: { id: string; name: string; email: string }; items: Parameters<typeof sendPriceDropEmail>[0]['items']; ids: string[] }
  >();
  const updates: { id: string; price: number }[] = [];

  for (const it of items) {
    const current = currentById.get(it.painting.id);
    if (current == null) continue;
    const last = it.last_seen_price;
    if (last == null || current > last) {
      updates.push({ id: it.id, price: current });
    } else if (last - current >= MIN_DROP_USD) {
      const entry = dropsByUser.get(it.user.id) || { user: it.user, items: [], ids: [] };
      const image = mainImage(it.painting.images);
      entry.items.push({
        title: it.painting.title_en,
        oldPrice: last,
        newPrice: current,
        url: `${SITE_URL}/gallery/${it.painting.id}`,
        imageUrl: image.startsWith('/') ? `${SITE_URL}${image}` : image,
      });
      entry.ids.push(it.id);
      dropsByUser.set(it.user.id, entry);
      updates.push({ id: it.id, price: current });
    }
  }

  // Record new prices first, so a failed/slow email never causes a repeat.
  for (const u of updates) {
    await prisma.wishlistItem.update({ where: { id: u.id }, data: { last_seen_price: u.price } });
  }

  let emailed = 0;
  let drops = 0;
  for (const { user, items: dropped } of dropsByUser.values()) {
    drops += dropped.length;
    const result = await sendPriceDropEmail({
      to: user.email,
      recipientName: user.name,
      items: dropped,
      unsubscribeUrl: priceAlertUnsubscribeUrl(user.id),
    }).catch((err) => ({ success: false, error: String(err) }));
    if (result.success) emailed++;
    else console.error('Price alert email failed:', user.email, 'error' in result ? result.error : '');
  }

  return { checked: items.length, emailed, drops };
}
