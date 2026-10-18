// An artist's awards & certificates, stored as a JSON array in
// Artist.achievements (title in three languages, optional year, optional
// uploaded image/PDF of the certificate itself).
export interface Achievement {
  title_uz: string;
  title_en: string;
  title_ru: string;
  year?: string;
  file?: string;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function clean(value: unknown): Achievement[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => {
      const o = (v || {}) as Record<string, unknown>;
      const title_uz = str(o.title_uz, 300);
      const title_en = str(o.title_en, 300);
      const title_ru = str(o.title_ru, 300);
      const year = str(o.year, 4).replace(/\D/g, '');
      const file = str(o.file, 1000);
      return {
        title_uz: title_uz || title_en || title_ru,
        title_en: title_en || title_uz || title_ru,
        title_ru: title_ru || title_uz || title_en,
        ...(year && { year }),
        // Only our own uploads or a plain https link.
        ...(file && /^(\/|https:\/\/)/.test(file) && { file }),
      };
    })
    .filter((a) => a.title_uz)
    .slice(0, 50);
}

export function parseAchievements(raw: string | null | undefined): Achievement[] {
  if (!raw) return [];
  try {
    return clean(JSON.parse(raw));
  } catch {
    return [];
  }
}

// What the admin form sent -> the column value (null when empty).
export function serializeAchievements(value: unknown): string | null {
  const list = clean(value);
  return list.length ? JSON.stringify(list) : null;
}

export const achievementTitle = (a: Achievement, lang: string) =>
  (lang === 'ru' ? a.title_ru : lang === 'uz' ? a.title_uz : a.title_en) || a.title_en;

export const isPdfFile = (url: string) => /\.pdf($|\?)/i.test(url);
