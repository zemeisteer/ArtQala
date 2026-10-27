import { revalidatePath, revalidateTag } from 'next/cache';

// Keeping the free Neon plan within its monthly compute: every query wakes
// the database, which then stays up (and billed) for minutes. So public
// pages are cached for a day instead of being rebuilt every 30 seconds, and
// Settings/rates are cached on the server instead of being read on every
// page view. Any change to the catalogue or Settings (see the Prisma hook in
// src/lib/prisma.ts) drops those caches at once, so edits still show
// immediately; the daily cron refreshes them too (discounts that end, etc.).

export const PUBLIC_REVALIDATE_SECONDS = 86400;
export const SETTINGS_TAG = 'site-settings';

// Prisma models whose writes change what the public site shows.
export const PUBLIC_MODELS = new Set([
  'Painting',
  'Artist',
  'Category',
  'Discount',
  'Accessory',
  'Review',
  'SiteSettings',
  'Workshop',
]);

export function refreshPublicSite() {
  try {
    revalidatePath('/[lang]', 'layout');
    revalidatePath('/sitemap.xml');
    revalidateTag(SETTINGS_TAG, { expire: 0 });
  } catch {
    // Outside a request (seed script, build) there is nothing to refresh.
  }
}
