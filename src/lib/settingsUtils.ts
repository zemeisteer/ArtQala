import { Language } from '@/lib/i18n/translations';

export interface DaySchedule {
  dayKey: string;
  dayLabelUz: string;
  dayLabelRu: string;
  dayLabelEn: string;
  open: string;
  close: string;
  isDayOff: boolean;
}

// The made-up number new installs start with (schema default / empty form).
// Never publish it as the gallery's real phone, e.g. in JSON-LD.
export const PLACEHOLDER_PHONE = '+998 66 233 44 55';

export function parsePhones(raw: string | null | undefined): string[] {
  if (!raw) return ['+998 66 233 44 55'];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((p) => String(p).trim()).filter(Boolean);
    }
  } catch {}
  const parts = String(raw).split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : ['+998 66 233 44 55'];
}

export function getAboutText(
  settings: { about_uz?: string | null; about_ru?: string | null; about_en?: string | null } | null | undefined,
  lang: Language,
  fallback: string
): string {
  if (!settings) return fallback;
  if (lang === 'uz' && settings.about_uz?.trim()) return settings.about_uz.trim();
  if (lang === 'ru' && settings.about_ru?.trim()) return settings.about_ru.trim();
  if (lang === 'en' && settings.about_en?.trim()) return settings.about_en.trim();
  return fallback;
}

export interface GalleryLocation {
  address: string;
  url: string;
  // "latitude, longitude" (e.g. "41.3378, 69.2397") for the JSON-LD geo
  // coordinates. `auto_coords` is read from the Google Maps link each time
  // settings are saved (api/settings); `coords` is an optional manual
  // override typed in Settings, and wins when present.
  coords?: string;
  auto_coords?: string;
}

// "41.3378, 69.2397" -> { lat, lng }; null when empty or not a valid pair.
export function parseCoords(raw: string | null | undefined): { lat: number; lng: number } | null {
  const m = String(raw || '').match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// Admin can list any number of physical addresses, each with its own map
// link, stored as JSON in SiteSettings.locations. Falls back to the older
// fixed address/location_map fields when that JSON hasn't been set yet.
export function parseLocations(
  raw: string | null | undefined,
  legacyAddress?: string | null,
  legacyMap?: string | null
): GalleryLocation[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const locations = parsed
          .filter((l) => l && typeof l === 'object' && l.address)
          .map((l) => ({
            address: String(l.address).trim(),
            url: String(l.url || '').trim(),
            ...(l.coords ? { coords: String(l.coords).trim() } : {}),
            ...(l.auto_coords ? { auto_coords: String(l.auto_coords).trim() } : {}),
          }));
        if (locations.length > 0) return locations;
      }
    } catch {}
  }

  if (legacyAddress) {
    return [{ address: legacyAddress, url: legacyMap || '' }];
  }
  return [];
}

export interface SocialLink {
  label: string;
  url: string;
}

// Admin can add any number of social/messenger links (Telegram, Instagram,
// WhatsApp, Facebook, ...) stored as JSON in SiteSettings.social_links.
// Falls back to the older fixed telegram/instagram fields when that JSON
// hasn't been set yet, so nothing disappears for sites that predate it.
export function parseSocialLinks(
  raw: string | null | undefined,
  legacyTelegram?: string | null,
  legacyInstagram?: string | null
): SocialLink[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const links = parsed
          .filter((l) => l && typeof l === 'object' && l.url)
          .map((l) => ({
            label: String(l.label || '').trim() || 'Link',
            url: String(l.url).trim(),
          }));
        if (links.length > 0) return links;
      }
    } catch {}
  }

  const fallback: SocialLink[] = [];
  if (legacyTelegram) fallback.push({ label: 'Telegram', url: legacyTelegram });
  if (legacyInstagram) fallback.push({ label: 'Instagram', url: legacyInstagram });
  return fallback;
}

export function normalizeSocialUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

export function formatWorkingHours(
  rawWorkingHours: string | null | undefined,
  lang: Language
): string {
  if (!rawWorkingHours) {
    return lang === 'uz' ? 'Har kuni: 09:00 - 19:00' : lang === 'ru' ? 'Ежедневно: 09:00 - 19:00' : 'Daily: 09:00 - 19:00';
  }

  try {
    const schedule: DaySchedule[] = JSON.parse(rawWorkingHours);
    if (Array.isArray(schedule) && schedule.length === 7) {
      const activeDays = schedule.filter((d) => !d.isDayOff);
      if (activeDays.length === 0) {
        return lang === 'uz' ? 'Vaqtinchalik yopiq' : lang === 'ru' ? 'Временно закрыто' : 'Temporarily Closed';
      }

      const allSameHours = activeDays.every(
        (d) => d.open === activeDays[0].open && d.close === activeDays[0].close
      );

      if (allSameHours && activeDays.length === 7) {
        return lang === 'uz'
          ? `Har kuni: ${activeDays[0].open} – ${activeDays[0].close}`
          : lang === 'ru'
          ? `Ежедневно: ${activeDays[0].open} – ${activeDays[0].close}`
          : `Daily: ${activeDays[0].open} – ${activeDays[0].close}`;
      }

      if (allSameHours && activeDays.length === 6 && schedule[6].isDayOff) {
        return lang === 'uz'
          ? `Dsh - Sh: ${activeDays[0].open} – ${activeDays[0].close} (Yak: Dam olish)`
          : lang === 'ru'
          ? `Пн - Сб: ${activeDays[0].open} – ${activeDays[0].close} (Вс: Выходной)`
          : `Mon - Sat: ${activeDays[0].open} – ${activeDays[0].close} (Sun: Closed)`;
      }

      // Format Mon-Fri and Sat-Sun
      const monFri = schedule.slice(0, 5);
      const sat = schedule[5];
      const sun = schedule[6];

      const monFriSame = monFri.every(
        (d) => !d.isDayOff && d.open === monFri[0].open && d.close === monFri[0].close
      );

      if (monFriSame) {
        const mfPrefix = lang === 'uz' ? 'Dsh - Jum' : lang === 'ru' ? 'Пн - Пт' : 'Mon - Fri';
        const satLabel = lang === 'uz' ? 'Shanba' : lang === 'ru' ? 'Сб' : 'Sat';
        const sunLabel = lang === 'uz' ? 'Yakshanba' : lang === 'ru' ? 'Вс' : 'Sun';
        const offLabel = lang === 'uz' ? 'Dam olish' : lang === 'ru' ? 'Выходной' : 'Closed';

        const satStr = sat.isDayOff ? `${satLabel}: ${offLabel}` : `${satLabel}: ${sat.open}–${sat.close}`;
        const sunStr = sun.isDayOff ? `${sunLabel}: ${offLabel}` : `${sunLabel}: ${sun.open}–${sun.close}`;

        return `${mfPrefix}: ${monFri[0].open}–${monFri[0].close} | ${satStr} | ${sunStr}`;
      }
    }
  } catch {}

  return String(rawWorkingHours);
}
