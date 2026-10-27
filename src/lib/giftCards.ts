import crypto from 'crypto';
import { signValue } from './auth';
import { SITE_URL } from './siteUrl';

// Gift certificates (model GiftCertificate): requested on /gift-card, paid
// the usual way (100% prepayment arranged by the curator), marked PAID in
// Admin → Sovg'a sertifikatlari, which emails a link to the printable
// certificate (/gift/<code>?s=<signature> — only a PAID/REDEEMED code with
// a valid signature opens it).

export const GIFT_AMOUNTS = [50, 100, 200, 300, 500];
export const GIFT_MIN = 20;
export const GIFT_MAX = 10000;
export const GIFT_STATUSES = ['NEW', 'PAID', 'REDEEMED', 'CANCELLED'] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];

// AQ-XXXX-XXXX without look-alike characters (0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newGiftCode(): string {
  const bytes = crypto.randomBytes(8);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `AQ-${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

export const giftSignature = (code: string) => signValue(`gift:${code}`);

export function giftCertificateUrl(code: string, lang = 'en'): string {
  const prefix = lang === 'en' ? '' : `/${lang}`;
  return `${SITE_URL}${prefix}/gift/${encodeURIComponent(code)}?s=${giftSignature(code)}`;
}
