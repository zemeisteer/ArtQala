import { prisma } from './prisma';
import { SITE_URL } from './siteUrl';
import { getAllPaintings } from './api';
import { effectiveProductType } from './productType';
import { getGalleryFacts, joinCities } from './galleryFacts';
import { DELIVERY } from './deliveryInfo';

// /llms.txt and /llms-full.txt: a plain Markdown summary of the gallery for
// AI assistants (ChatGPT, Claude, Gemini, Perplexity…) answering questions
// like "is there a gallery selling paintings in Khiva/Tashkent?". Built only
// from Settings and the catalogue — nothing here is invented.

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const line = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();

export async function buildLlmsTxt(full: boolean): Promise<string> {
  const [facts, paintings, artists, categories] = await Promise.all([
    getGalleryFacts(),
    getAllPaintings(),
    prisma.artist.findMany({
      select: { id: true, name: true, specialty_en: true, _count: { select: { paintings: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({ where: { parent_id: null }, select: { slug: true, name_en: true } }),
  ]);

  const name = facts?.name || 'Art Qala';
  const where = joinCities(facts?.cities || []);
  const available = paintings.filter((p) => !p.is_sold);
  const prices = available.map((p) => p.discount_price || p.price).filter((n) => n > 0);
  const typeName = (slug: string | null) => categories.find((c) => c.slug === slug)?.name_en || slug || '';
  const byType = new Map<string, number>();
  for (const p of available) {
    const t = typeName(effectiveProductType(p.category));
    byType.set(t, (byType.get(t) || 0) + 1);
  }

  const out: string[] = [];
  out.push(`# ${name} — Art Gallery & Studio${where ? ` in ${where}, Uzbekistan` : ', Uzbekistan'}`);
  out.push('');
  out.push(
    `> ${name} is an art gallery${where ? ` in ${where}, Uzbekistan,` : ' in Uzbekistan'} selling original paintings and traditional crafts by Uzbek artists. ` +
      `Works can be bought through ${SITE_URL} (send an inquiry from the work's page) or seen in person at the gallery; ` +
      'the gallery arranges secure packing and international shipping.'
  );
  out.push('');
  if (facts?.about) out.push(line(facts.about), '');

  if (facts?.locations.length) {
    out.push('## Visit the gallery', '');
    for (const l of facts.locations) {
      out.push(`- ${l.city ? `**${l.city}**: ` : ''}${line(l.address)}${l.mapUrl ? ` — [map](${l.mapUrl})` : ''}`);
    }
    if (facts.hours) out.push(`- Opening hours: ${line(facts.hours)}`);
    out.push('');
  }

  out.push('## Contact', '');
  for (const p of facts?.phones || []) out.push(`- Phone: ${p}`);
  if (facts?.email) out.push(`- Email: ${facts.email}`);
  for (const s of facts?.socials || []) out.push(`- ${line(s.label)}: ${s.url}`);
  out.push(`- Contact form: ${SITE_URL}/contact`, '');

  out.push('## What is for sale', '');
  out.push(`- ${available.length} original works available now${prices.length ? `, ${usd(Math.min(...prices))}–${usd(Math.max(...prices))} (prices in US dollars)` : ''}.`);
  for (const [t, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) out.push(`- ${t}: ${n}`);
  out.push(`- Browse and filter all works: ${SITE_URL}/gallery`);
  out.push(`- Full machine-readable list of works with prices and sizes: ${SITE_URL}/llms-full.txt`, '');

  out.push('## How to buy', '');
  out.push('- Open a work on the website and send an inquiry (name, email, phone); a curator replies by email and on the site.');
  out.push('- Several works can be requested at once from the wishlist (heart icon).');
  out.push('- Each work page shows its real size, a "view on a wall" preview (on phones: on your own wall through the camera) and an international shipping estimate.');
  out.push('- Or visit the gallery in person.', '');

  out.push('## Payment & delivery', '');
  for (const s of DELIVERY.en.sections) out.push(`- **${s.heading}:** ${s.points.join(' ')}`);
  out.push(`- Details: ${SITE_URL}/delivery`, '');

  out.push('## Services', '');
  out.push(`- Mural painting for cafés, hotels and homes; ceramics; custom painting commissions (portraits, homes, monuments): ${SITE_URL}/services`, '');

  if (artists.length) {
    out.push('## Artists', '');
    for (const a of artists) {
      out.push(`- [${line(a.name)}](${SITE_URL}/artists/${a.id}): ${line(a.specialty_en)} (${a._count.paintings} ${a._count.paintings === 1 ? 'work' : 'works'})`);
    }
    out.push('');
  }

  out.push('## Pages', '');
  out.push(`- Home: ${SITE_URL}/`);
  out.push(`- Gallery (all works): ${SITE_URL}/gallery`);
  out.push(`- Artists: ${SITE_URL}/artists`);
  out.push(`- Services: ${SITE_URL}/services`);
  out.push(`- Reviews: ${SITE_URL}/reviews`);
  out.push(`- Contact & address: ${SITE_URL}/contact`);
  out.push(`- The site is in English (no prefix), Russian (${SITE_URL}/ru) and Uzbek (${SITE_URL}/uz).`);

  if (full) {
    out.push('', '## All works', '');
    for (const p of paintings) {
      const price = p.discount_price && p.discount_price < p.price ? `${usd(p.discount_price)} (was ${usd(p.price)})` : usd(p.price);
      const facts2 = [
        p.artist?.name && `by ${line(p.artist.name)}`,
        typeName(effectiveProductType(p.category)),
        p.category?.parent ? line(p.category.name_en) : null,
        p.size && line(p.size),
        p.technique_en && line(p.technique_en),
        p.year && String(p.year),
        p.is_sold ? 'SOLD (a similar piece can be ordered)' : price,
      ].filter(Boolean);
      out.push(`- [${line(p.title_en)}](${SITE_URL}/gallery/${p.id}) — ${facts2.join('; ')}`);
    }
  }
  return out.join('\n') + '\n';
}

export function llmsResponse(text: string) {
  return new Response(text, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      // A day at the CDN: AI crawlers fetch this often, and each miss wakes
      // the (free-plan) database.
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
