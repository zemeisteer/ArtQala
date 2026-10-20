import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/siteUrl';
import type { Language } from '@/lib/i18n/translations';
import { homeMetadata } from '@/lib/i18n/seo';
import {
  parseSocialLinks,
  normalizeSocialUrl,
  parseLocations,
  parsePhones,
  parseCoords,
  PLACEHOLDER_PHONE,
  type DaySchedule,
} from '@/lib/settingsUtils';
import { cityOf } from '@/lib/galleryFacts';

const SCHEMA_DAY: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// The admin's weekly schedule (SiteSettings.working_hours, a JSON array of
// days) as schema.org opening hours — days sharing the same hours are
// grouped into one entry, days off are left out. Nothing when the schedule
// isn't stored in that structured form.
function openingHours(raw: string | null | undefined) {
  if (!raw) return [];
  let days: DaySchedule[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    days = parsed;
  } catch {
    return [];
  }

  const groups = new Map<string, string[]>();
  for (const d of days) {
    const day = SCHEMA_DAY[d?.dayKey];
    if (!day || d.isDayOff || !TIME.test(d.open) || !TIME.test(d.close)) continue;
    const key = `${d.open}|${d.close}`;
    groups.set(key, [...(groups.get(key) || []), day]);
  }
  return [...groups.entries()].map(([key, dayOfWeek]) => {
    const [opens, closes] = key.split('|');
    return { '@type': 'OpeningHoursSpecification', dayOfWeek, opens, closes };
  });
}

// "$200–$4500" from the works actually for sale; nothing when there are none.
async function priceRange(): Promise<string | undefined> {
  const stats = await prisma.painting.aggregate({
    where: { is_sold: false, price: { gt: 0 } },
    _min: { price: true },
    _max: { price: true },
  });
  const min = stats._min.price;
  const max = stats._max.price;
  if (!min || !max) return undefined;
  return min === max ? `$${Math.round(min)}` : `$${Math.round(min)}–$${Math.round(max)}`;
}

// The gallery's schema.org ArtGallery block, rendered on every public page.
// Every value comes from Admin → Settings (or the catalogue); a property
// that has no real value is left out rather than filled with a placeholder.
export async function getOrganizationJsonLd(lang: Language) {
  try {
    const [settings, range] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: 'default' } }),
      priceRange().catch(() => undefined),
    ]);
    if (!settings) return null;

    const locations = parseLocations(settings.locations, settings.address, settings.location_map).filter((l) =>
      l.address?.trim()
    );
    const primaryLocation = locations[0];
    const geo = parseCoords(primaryLocation?.coords) || parseCoords(primaryLocation?.auto_coords);
    const name = settings.gallery_name || 'Art Qala';
    // Every address with its own city (recognised from the address text) —
    // so "gallery in Khiva" finds the Khiva branch, not just Tashkent.
    const postal = (address: string) => {
      const city = cityOf(address);
      return {
        '@type': 'PostalAddress',
        streetAddress: address,
        ...(city ? { addressLocality: city } : {}),
        addressCountry: 'UZ',
      };
    };
    const branches = locations.map((l) => {
      const g = parseCoords(l.coords) || parseCoords(l.auto_coords);
      const city = cityOf(l.address);
      return {
        '@type': 'ArtGallery',
        name: city ? `${name} — ${city}` : name,
        address: postal(l.address),
        ...(g ? { geo: { '@type': 'GeoCoordinates', latitude: g.lat, longitude: g.lng } } : {}),
        ...(l.url ? { hasMap: l.url } : {}),
      };
    });
    const phone = parsePhones(settings.phone).find((p) => p !== PLACEHOLDER_PHONE);
    const hours = openingHours(settings.working_hours);
    const sameAs = parseSocialLinks(settings.social_links, settings.telegram, settings.instagram).map((l) =>
      normalizeSocialUrl(l.url)
    );

    return {
      '@context': 'https://schema.org',
      '@type': 'ArtGallery',
      name,
      // Same text as the home page's meta description, in the page's language.
      description: homeMetadata(
        lang,
        Array.from(new Set(locations.map((l) => cityOf(l.address)).filter((c): c is string => Boolean(c))))
      ).description as string,
      url: SITE_URL,
      image: `${SITE_URL}/logo.png`,
      ...(phone ? { telephone: phone } : {}),
      ...(settings.email ? { email: settings.email } : {}),
      ...(locations.length === 1 ? { address: postal(locations[0].address) } : {}),
      ...(locations.length > 1 ? { address: locations.map((l) => postal(l.address)), department: branches } : {}),
      ...(geo ? { geo: { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng } } : {}),
      ...(primaryLocation?.url ? { hasMap: primaryLocation.url } : {}),
      ...(hours.length > 0 ? { openingHoursSpecification: hours } : {}),
      ...(range ? { priceRange: range } : {}),
      ...(sameAs.length > 0 ? { sameAs } : {}),
      knowsLanguage: ['uz', 'ru', 'en'],
      areaServed: 'Worldwide',
    };
  } catch {
    return null;
  }
}
