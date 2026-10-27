import React from 'react';
import type { Metadata } from 'next';
import {
  AlertTriangle,
  Coins,
  CreditCard,
  FileCheck,
  MapPin,
  Package,
  Plane,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import Link from '@/components/LocalizedLink';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang } from '@/lib/i18n/routing';
import { SITE_URL } from '@/lib/siteUrl';
import { DELIVERY, type DeliveryIcon } from '@/lib/deliveryInfo';
import { dictionaryFor } from '@/lib/i18n/extra';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('delivery', isLang(lang) ? lang : 'en');
}

const ICONS: Record<DeliveryIcon, React.ComponentType<{ className?: string }>> = {
  card: CreditCard,
  coins: Coins,
  store: Store,
  truck: Truck,
  map: MapPin,
  plane: Plane,
  package: Package,
  shield: ShieldCheck,
  file: FileCheck,
  alert: AlertTriangle,
};

// Payment & delivery terms (src/lib/deliveryInfo.ts), with the same answers
// as FAQ structured data for search engines and AI assistants.
export default async function DeliveryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params;
  const lang = isLang(rawLang) ? rawLang : 'en';
  const c = DELIVERY[lang];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: c.title, path: '/delivery' }], SITE_URL, lang);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdString(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdString(breadcrumbJsonLd) }} />
      <div className="py-16 sm:py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="space-y-3 text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">{c.eyebrow}</span>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18]">{c.title}</h1>
            <p className="text-sm text-[#5F534C] leading-relaxed">{c.intro}</p>
          </div>

          {/* The four steps of a purchase */}
          <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 sm:p-8">
            <h2 className="font-serif text-2xl font-semibold text-[#281C18] mb-5">{c.stepsHeading}</h2>
            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {c.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-8 h-8 shrink-0 rounded-full bg-[#BA4E25] text-white font-semibold text-sm flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm text-[#4D3F38] leading-snug">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {c.sections.map((s) => {
              const Icon = ICONS[s.icon];
              return (
                <section key={s.heading} className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-3">
                  <h2 className="flex items-center gap-2.5 font-serif text-xl font-semibold text-[#281C18]">
                    <span className="w-9 h-9 rounded-full bg-[#BA4E25]/10 text-[#BA4E25] flex items-center justify-center shrink-0">
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    {s.heading}
                  </h2>
                  <ul className="space-y-1.5 text-sm text-[#4D3F38] leading-relaxed list-disc pl-5 marker:text-[#BA4E25]">
                    {s.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className="text-center space-y-3">
            <p className="text-sm text-[#5F534C]">{c.questions}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-sm font-semibold px-5 py-2.5 rounded-[3px]"
              >
                {dictionaryFor(lang).nav.contact}
              </Link>
              <Link
                href="/terms"
                className="inline-flex items-center border border-[#E7E0D8] bg-white text-[#281C18] text-sm font-semibold px-5 py-2.5 rounded-[3px] hover:border-[#BA4E25]"
              >
                {dictionaryFor(lang).footer.terms}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
