import { prisma } from './prisma';
import {
  parseLocations,
  parsePhones,
  parseSocialLinks,
  normalizeSocialUrl,
  PLACEHOLDER_PHONE,
  type DaySchedule,
} from './settingsUtils';

// Facts about the gallery for machines — AI assistants (/llms.txt) and the
// schema.org JSON-LD — taken only from Admin → Settings, never invented.
// The city of each address is recognised from the address text itself
// ("…, Xiva" → Khiva), so a new branch shows up everywhere once its address
// is added in Settings.

const CITIES: { name: string; re: RegExp }[] = [
  { name: 'Tashkent', re: /tashkent|toshkent|ташкент/i },
  { name: 'Khiva', re: /khiva|xiva|хива|ichan[- ]?qal/i },
  { name: 'Samarkand', re: /samarkand|samarqand|самарканд/i },
  { name: 'Bukhara', re: /bukhara|buxoro|бухар/i },
  { name: 'Urgench', re: /urgench|urganch|ургенч/i },
];

export function cityOf(address: string): string | null {
  return CITIES.find((c) => c.re.test(address))?.name ?? null;
}

const DAY_EN: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

// "Mon–Sat 10:00–19:00; Sun closed" from the structured schedule, or the
// stored text as is.
function hoursText(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const days = JSON.parse(raw) as DaySchedule[];
    if (!Array.isArray(days)) return raw;
    return days
      .filter((d) => DAY_EN[d?.dayKey])
      .map((d) => `${DAY_EN[d.dayKey]} ${d.isDayOff ? 'closed' : `${d.open}–${d.close}`}`)
      .join(', ');
  } catch {
    return raw.trim() || null;
  }
}

export interface GalleryFacts {
  name: string;
  about: string;
  locations: { address: string; city: string | null; mapUrl: string }[];
  cities: string[];
  phones: string[];
  email: string | null;
  socials: { label: string; url: string }[];
  hours: string | null;
}

export async function getGalleryFacts(): Promise<GalleryFacts | null> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
  if (!settings) return null;
  const locations = parseLocations(settings.locations, settings.address, settings.location_map)
    .filter((l) => l.address?.trim())
    .map((l) => ({ address: l.address.trim(), city: cityOf(l.address), mapUrl: l.url }));
  return {
    name: settings.gallery_name || 'Art Qala',
    about: settings.about_en,
    locations,
    cities: Array.from(new Set(locations.map((l) => l.city).filter((c): c is string => Boolean(c)))),
    phones: parsePhones(settings.phone).filter((p) => p && p !== PLACEHOLDER_PHONE),
    email: settings.email || null,
    socials: parseSocialLinks(settings.social_links, settings.telegram, settings.instagram).map((l) => ({
      label: l.label,
      url: normalizeSocialUrl(l.url),
    })),
    hours: hoursText(settings.working_hours),
  };
}

// "Tashkent and Khiva" / "Tashkent" / "" — for sentences.
export function joinCities(cities: string[]): string {
  if (cities.length <= 1) return cities[0] || '';
  return `${cities.slice(0, -1).join(', ')} and ${cities[cities.length - 1]}`;
}
