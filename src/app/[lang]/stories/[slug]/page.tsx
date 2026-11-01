import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from '@/components/LocalizedLink';
import { prisma } from '@/lib/prisma';
import { isLang, languageAlternates, localizePath, OG_LOCALE } from '@/lib/i18n/routing';
import type { Language } from '@/lib/i18n/translations';
import { dictionaryFor } from '@/lib/i18n/extra';
import { localizeContent, pick } from '@/lib/contentTranslations';
import { storyHtml, storyText } from '@/lib/storyMarkdown';
import { safeJsonLdString } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/siteUrl';

export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ lang: string; slug: string }> };

async function load(slug: string, lang: Language) {
  const story = await prisma.story.findUnique({ where: { slug } }).catch(() => null);
  return story && story.published ? localizeContent(story, lang) : null;
}

const absolute = (src: string) => (src.startsWith('/') ? `${SITE_URL}${src}` : src);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw, slug } = await params;
  const lang = isLang(raw) ? raw : 'en';
  const s = await load(slug, lang);
  if (!s) return {};
  const title = pick(s, 'title', lang);
  const description = (pick(s, 'excerpt', lang) || storyText(pick(s, 'body', lang))).slice(0, 160);
  const alternates = languageAlternates(`/stories/${slug}`, lang);
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: 'article',
      title,
      description,
      url: alternates.canonical,
      locale: OG_LOCALE[lang],
      ...(s.cover && { images: [absolute(s.cover)] }),
    },
  };
}

export default async function StoryPage({ params }: Props) {
  const { lang: raw, slug } = await params;
  const lang = isLang(raw) ? raw : 'en';
  const s = await load(slug, lang);
  if (!s) notFound();
  const t = dictionaryFor(lang).stories;
  const title = pick(s, 'title', lang);
  const body = pick(s, 'body', lang);
  const words = storyText(body).split(/\s+/).length;
  const others = localizeContent(
    await prisma.story.findMany({
      where: { published: true, id: { not: s.id } },
      orderBy: { published_at: 'desc' },
      take: 3,
    }),
    lang
  );
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: pick(s, 'excerpt', lang) || undefined,
    inLanguage: lang,
    ...(s.cover && { image: absolute(s.cover) }),
    datePublished: (s.published_at || s.created_at).toISOString(),
    dateModified: s.updated_at.toISOString(),
    author: { '@type': 'Organization', name: 'Art Qala Gallery', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Art Qala Gallery', logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
    mainEntityOfPage: `${SITE_URL}${localizePath(`/stories/${slug}`, lang)}`,
  };

  return (
    <article className="py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdString(articleJsonLd) }} />
      <div className="max-w-[760px] mx-auto px-6">
        <Link href="/stories" className="text-xs font-semibold text-[#BA4E25] hover:underline">
          {t.back}
        </Link>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18] leading-tight mt-4">{title}</h1>
        <p className="text-xs text-[#756962] mt-3">
          {(s.published_at || s.created_at).toLocaleDateString(lang === 'uz' ? 'en-GB' : lang, { day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}
          {t.minRead.replace('{n}', String(Math.max(1, Math.round(words / 200))))}
        </p>
        {s.cover && (
          <div className="relative aspect-[16/9] mt-6 rounded-[4px] overflow-hidden bg-[#F0E6DA]">
            <Image src={s.cover} alt="" fill priority sizes="(max-width: 800px) 100vw, 760px" className="object-cover" />
          </div>
        )}
        <div className="story-body mt-8" dangerouslySetInnerHTML={{ __html: storyHtml(body) }} />
      </div>
      {others.length > 0 && (
        <div className="max-w-[1100px] mx-auto px-6 mt-16 pt-10 border-t border-[#E7E0D8]">
          <h2 className="font-serif text-2xl font-semibold text-[#281C18] mb-5">{t.moreStories}</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {others.map((o) => (
              <Link key={o.id} href={`/stories/${o.slug}`} className="group">
                <div className="relative aspect-[16/10] rounded-[3px] overflow-hidden bg-[#F0E6DA]">
                  {o.cover && <Image src={o.cover} alt="" fill sizes="350px" className="object-cover" />}
                </div>
                <div className="font-serif text-lg font-semibold text-[#281C18] mt-2 group-hover:text-[#BA4E25]">{pick(o, 'title', lang)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
