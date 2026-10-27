import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang } from '@/lib/i18n/routing';
import ExperiencesClient from './ExperiencesClient';

// Cached a day; Admin → Master-klasslar edits drop the cache at once
// (src/lib/publicCache.ts).
export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('workshops', isLang(lang) ? lang : 'en');
}

export default async function ExperiencesPage() {
  const workshops = await prisma.workshop
    .findMany({ where: { is_active: true }, orderBy: [{ sort: 'asc' }, { created_at: 'asc' }] })
    .catch(() => []);
  return <ExperiencesClient workshops={JSON.parse(JSON.stringify(workshops))} />;
}
