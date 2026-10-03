import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteDocument from '@/components/SiteDocument';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import KhorezmScrollTrack from '@/components/patterns/KhorezmScrollTrack';
import RouteLangProvider from '@/components/RouteLangProvider';
import CookieConsent from '@/components/CookieConsent';
import WhatsAppButton from '@/components/WhatsAppButton';
import AssistantChat from '@/components/AssistantChat';
import { LANGS, OG_LOCALE, isLang } from '@/lib/i18n/routing';
import { baseMetadata } from '@/lib/siteMetadata';
import { getOrganizationJsonLd } from '@/lib/organizationJsonLd';

// This is the public site's ROOT layout (there is no app/layout.tsx): it
// owns <html>, so the document language can follow the URL — /ru pages are
// <html lang="ru">, /uz pages <html lang="uz"> — while every page stays
// statically generated.

// getOrganizationJsonLd() below queries SiteSettings — without a cache
// window that would be a DB round-trip on every page render site-wide.
export const revalidate = 60;

// One statically generated copy of every public page per language. (No
// `dynamicParams = false` here — it would also apply to nested dynamic
// segments like /gallery/[id] and 404 every painting not prebuilt; an
// unknown language is rejected below instead.)
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return baseMetadata;
  return {
    ...baseMetadata,
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

  const orgJsonLd = await getOrganizationJsonLd();

  return (
    <SiteDocument lang={lang} jsonLd={orgJsonLd}>
      <RouteLangProvider lang={lang}>
        <Header />
        <main className="flex-grow">{children}</main>
        <KhorezmScrollTrack />
        <Footer />
        {/* Only once its Gemini key is configured in Vercel */}
        {process.env.GEMINI_ASSISTANT_API_KEY && <AssistantChat />}
        <WhatsAppButton />
        <CookieConsent />
      </RouteLangProvider>
    </SiteDocument>
  );
}
