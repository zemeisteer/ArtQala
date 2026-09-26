import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import KhorezmScrollTrack from '@/components/patterns/KhorezmScrollTrack';
import RouteLangProvider from '@/components/RouteLangProvider';
import { LANGS, OG_LOCALE, isLang } from '@/lib/i18n/routing';

// One statically generated copy of every public page per language. (No
// `dynamicParams = false` here — it would also apply to nested dynamic
// segments like /gallery/[id] and 404 every painting not prebuilt; an
// unknown language is rejected below instead.)
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return {
    openGraph: {
      locale: OG_LOCALE[lang],
      alternateLocale: LANGS.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <RouteLangProvider lang={lang}>
      <Header />
      <main className="flex-grow">{children}</main>
      <KhorezmScrollTrack />
      <Footer />
    </RouteLangProvider>
  );
}
