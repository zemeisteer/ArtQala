import type { Metadata } from 'next';
import Image from 'next/image';
import Link from '@/components/LocalizedLink';
import Breadcrumbs from '@/components/Breadcrumbs';
import { prisma } from '@/lib/prisma';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang } from '@/lib/i18n/routing';
import { dictionaryFor } from '@/lib/i18n/extra';
import { localizeContent, pick } from '@/lib/contentTranslations';
import { storyText } from '@/lib/storyMarkdown';

// Cached a day; publishing or editing a story drops the cache at once.
export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('stories', isLang(lang) ? lang : 'en');
}

const readingMinutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).length / 200));

export default async function StoriesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : 'en';
  const t = dictionaryFor(lang).stories;
  const stories = localizeContent(
    await prisma.story
      .findMany({ where: { published: true }, orderBy: { published_at: 'desc' } })
      .catch(() => []),
    lang
  );

  return (
    <div className="py-14 sm:py-16">
      <Breadcrumbs items={[{ label: t.navLabel }]} />
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        <div className="max-w-2xl mb-10 space-y-2">
          <span className="text-xs font-semibold tracking-[3px] text-[#347578] uppercase">{t.eyebrow}</span>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18]">{t.title}</h1>
          <p className="text-sm sm:text-base text-[#6E6057] leading-relaxed">{t.subtitle}</p>
        </div>
        {stories.length === 0 ? (
          <p className="text-sm text-[#6B5E55]">{t.empty}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {stories.map((s) => {
              const excerpt = pick(s, 'excerpt', lang) || storyText(pick(s, 'body', lang)).slice(0, 180);
              return (
                <Link key={s.id} href={`/stories/${s.slug}`} className="group bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] overflow-hidden flex flex-col hover:shadow-md transition">
                  <div className="relative aspect-[16/10] bg-[#F0E6DA]">
                    {s.cover && <Image src={s.cover} alt="" fill sizes="(max-width: 640px) 100vw, 400px" className="object-cover group-hover:scale-[1.02] transition-transform" />}
                  </div>
                  <div className="p-5 flex flex-col gap-2 flex-1">
                    <h2 className="font-serif text-xl font-semibold text-[#281C18] group-hover:text-[#BA4E25] leading-snug">{pick(s, 'title', lang)}</h2>
                    <p className="text-sm text-[#554740] leading-relaxed line-clamp-3">{excerpt}</p>
                    <span className="mt-auto pt-2 text-xs text-[#756962]">
                      {t.minRead.replace('{n}', String(readingMinutes(storyText(pick(s, 'body', lang)))))}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
