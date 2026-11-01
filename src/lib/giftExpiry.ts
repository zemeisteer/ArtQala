// A gift certificate is valid for 90 days from the day it was paid; unused
// after that it expires (the owner's rule). Shown to the buyer on /gift-card
// and in the request email, to the recipient on the certificate and in its
// email, and in Admin → Sovg'a sertifikatlari. Pure — safe in client code.

export const GIFT_VALID_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export function giftExpiresAt(paidAt: string | Date): Date {
  return new Date(new Date(paidAt).getTime() + GIFT_VALID_DAYS * DAY_MS);
}

// Only a paid, still-unused certificate can expire.
export function isGiftExpired(
  g: { status: string; paid_at: string | Date | null },
  now = Date.now()
): boolean {
  return g.status === 'PAID' && !!g.paid_at && giftExpiresAt(g.paid_at).getTime() < now;
}

export const giftDate = (d: Date, locale = 'en-GB') =>
  d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Tashkent' });
