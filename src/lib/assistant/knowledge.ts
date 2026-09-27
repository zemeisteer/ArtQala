import { prisma } from '@/lib/prisma';
import { getAllPaintings } from '@/lib/api';
import { localizePath } from '@/lib/i18n/routing';
import type { Language } from '@/lib/i18n/translations';
import { formatWorkingHours, getAboutText, parseLocations, parsePhones, parseSocialLinks } from '@/lib/settingsUtils';
import { estimatePaintingWeightKg, estimateShipping } from '@/lib/shipping';

// The website assistant only knows what's written here — built fresh from
// the live database for every question, so prices (after discounts), sold
// status, hours and contacts are always current. Keeping the model on this
// sheet (and telling it to say "I don't know" otherwise) is what stops it
// from inventing prices or promises.

type Painting = Awaited<ReturnType<typeof getAllPaintings>>[number];

function pick(p: Record<string, unknown>, field: string, lang: Language): string {
  return String(p[`${field}_${lang}`] || p[`${field}_en`] || '').trim();
}

function paintingLine(p: Painting, lang: Language): string {
  const anyP = p as unknown as Record<string, unknown>;
  const category = (p.category as { name_en?: string; parent?: { name_en?: string } | null } | null) || null;
  const type = category?.parent?.name_en || category?.name_en || '';
  const theme = category?.parent ? category?.name_en : '';
  const hasDiscount = !!p.discount_price && p.discount_price < p.price;
  const price = hasDiscount ? `$${p.discount_price} (discounted from $${p.price})` : `$${p.price}`;
  return [
    `- [${pick(anyP, 'title', lang)}](${localizePath(`/gallery/${p.id}`, lang)})`,
    `id=${p.id}`,
    `artist: ${p.artist?.name ?? ''}`,
    type && `type: ${type}${theme ? ` / ${theme}` : ''}`,
    `size: ${p.size}`,
    pick(anyP, 'technique', lang) && `technique: ${pick(anyP, 'technique', lang)}`,
    `year: ${p.year}`,
    p.is_sold ? 'SOLD (not available)' : `price: ${price}`,
  ]
    .filter(Boolean)
    .join(' | ');
}

export async function buildKnowledge(lang: Language): Promise<string> {
  const [paintings, settings, artists] = await Promise.all([
    getAllPaintings(),
    prisma.siteSettings.findUnique({ where: { id: 'default' } }).catch(() => null),
    prisma.artist
      .findMany({ select: { name: true, specialty_en: true, bio_en: true } })
      .catch(() => [] as { name: string; specialty_en: string | null; bio_en: string | null }[]),
  ]);

  const locations = parseLocations(settings?.locations, settings?.address, settings?.location_map);
  const phones = parsePhones(settings?.phone);
  const social = parseSocialLinks(settings?.social_links, settings?.telegram, settings?.instagram);

  const available = paintings.filter((p) => !p.is_sold);
  const sold = paintings.filter((p) => p.is_sold);

  return [
    `# About the gallery`,
    getAboutText(settings, lang, 'Art Qala is an art gallery in Tashkent, Uzbekistan.'),
    ``,
    `# Visiting and contact`,
    `Opening hours: ${formatWorkingHours(settings?.working_hours, lang)}`,
    ...locations.map((l) => `Address: ${l.address}${l.url ? ` (map: ${l.url})` : ''}`),
    phones.length ? `Phone: ${phones.join(', ')}` : '',
    settings?.email ? `Email: ${settings.email}` : '',
    ...social.map((s) => `${s.label}: ${s.url}`),
    ``,
    `# How buying works`,
    `There is no online checkout. A visitor sends an inquiry from the painting's page (the "Inquire" form) or writes on WhatsApp; the gallery replies, agrees the details and arranges payment and delivery.`,
    `Prices are in US dollars; the site can display other currencies. Every original comes with a signed Certificate of Authenticity.`,
    `Optional add-ons on the inquiry form: a frame and a protective shipping case (price depends on the painting's size).`,
    `Shipping: worldwide via Uzbekistan Post — "standard parcel" (about 15-30 days abroad, 10-20 days to CIS, 3-7 days within Uzbekistan) or "EMS express" (about 7-15 days abroad). Use the estimate_shipping tool for a price. If a shipment takes longer than 1 month, the shipping fee is refunded. Paintings can also be collected at the gallery.`,
    ``,
    `# Services (commissions)`,
    `Mural painting for cafés, hotels and homes; hand-painted ceramics (Rishtan / Gijduvan style); custom paintings (portraits, your own courtyard, a monument). Request a quote on the Services page: ${localizePath('/services', lang)}`,
    ``,
    `# Artists`,
    ...artists.map((a) => `- ${a.name}${a.specialty_en ? ` — ${a.specialty_en}` : ''}${a.bio_en ? `: ${a.bio_en.replace(/\s+/g, ' ').slice(0, 300)}` : ''}`),
    ``,
    `# Available paintings (${available.length})`,
    ...available.map((p) => paintingLine(p, lang)),
    ``,
    `# Sold paintings (${sold.length}) — not available`,
    ...sold.map((p) => paintingLine(p, lang)),
    ``,
    `# Useful pages`,
    `Gallery: ${localizePath('/gallery', lang)} · Artists: ${localizePath('/artists', lang)} · Contact: ${localizePath('/contact', lang)} · Reviews: ${localizePath('/reviews', lang)}`,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

// Tool the model can call for a shipping price — the same UzPost-based
// calculation as the estimator on each painting page.
export async function shippingQuote(paintingId: string, countryCode: string) {
  const [painting, settings] = await Promise.all([
    prisma.painting.findUnique({ where: { id: paintingId }, select: { title_en: true, size: true } }),
    prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { rate_usd: true } }).catch(() => null),
  ]);
  if (!painting) return { error: 'Unknown painting id' };

  const m = painting.size.match(/(\d+(?:\.\d+)?)\s*[×x*X]\s*(\d+(?:\.\d+)?)(?:\s*(sm|cm|in|dyum))?/i);
  if (!m) return { error: 'Painting size unknown' };
  const inches = /^(in|dyum)$/i.test(m[3] || '');
  const w = parseFloat(m[1]) * (inches ? 2.54 : 1);
  const h = parseFloat(m[2]) * (inches ? 2.54 : 1);

  const weightKg = estimatePaintingWeightKg(w, h);
  const quote = estimateShipping(countryCode.toUpperCase(), weightKg, settings?.rate_usd || 12850);
  if (!quote.posilka && !quote.ems) return { error: `No UzPost tariff for country ${countryCode}` };
  return {
    painting: painting.title_en,
    country: countryCode.toUpperCase(),
    estimated_weight_kg: weightKg,
    standard_parcel: quote.posilka,
    ems_express: quote.ems,
    note: 'Estimate in USD; the final cost is confirmed by the gallery.',
  };
}
