import { prisma } from './prisma';
import { slugify } from './storyMarkdown';

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface StoryInput {
  title_uz: string;
  title_en: string;
  title_ru: string;
  excerpt_uz: string | null;
  excerpt_en: string | null;
  excerpt_ru: string | null;
  body_uz: string;
  body_en: string;
  body_ru: string;
  cover: string | null;
  published: boolean;
}

export function parseStoryInput(b: Record<string, unknown>): { data: StoryInput } | { error: string } {
  const title_uz = text(b.title_uz, 200);
  const body_uz = text(b.body_uz, 50000);
  if (!title_uz) return { error: 'Sarlavhani kiriting' };
  if (!body_uz) return { error: 'Matnni kiriting' };
  return {
    data: {
      title_uz,
      title_en: text(b.title_en, 200) || title_uz,
      title_ru: text(b.title_ru, 200) || title_uz,
      excerpt_uz: text(b.excerpt_uz, 400) || null,
      excerpt_en: text(b.excerpt_en, 400) || null,
      excerpt_ru: text(b.excerpt_ru, 400) || null,
      body_uz,
      body_en: text(b.body_en, 50000) || body_uz,
      body_ru: text(b.body_ru, 50000) || body_uz,
      cover: text(b.cover, 1000) || null,
      published: b.published === true,
    },
  };
}

// A URL slug from the English title, unique among stories.
export async function uniqueSlug(title: string, exceptId?: string): Promise<string> {
  const base = slugify(title);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const hit = await prisma.story.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === exceptId) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}
