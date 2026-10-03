import React from 'react';
import { Cormorant_Garamond, Work_Sans } from 'next/font/google';
import Script from 'next/script';
import '@/app/globals.css';
import { AppProvider } from '@/context/AppContext';
import { safeJsonLdString } from '@/lib/jsonLd';
import VisitTracker from '@/components/analytics/VisitTracker';
import ContactClickTracker from '@/components/ContactClickTracker';
import { CONSENT_REGIONS } from '@/lib/consent';

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const workSans = Work_Sans({
  variable: '--font-work-sans',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// The <html>/<body> shell shared by the app's two root layouts —
// app/[lang]/layout.tsx (public site, `lang` = the page's language) and
// app/admin/layout.tsx. There is deliberately no app/layout.tsx: a single
// root layout can't know the route's language without reading the request,
// which would turn every statically generated page dynamic.
export default function SiteDocument({
  lang,
  jsonLd,
  children,
}: {
  lang: string;
  jsonLd?: object | null;
  children: React.ReactNode;
}) {
  return (
    <html
      lang={lang}
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${workSans.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF4EC] text-[#281C18] selection:bg-[#BA4E25] selection:text-white">
        {jsonLd && (
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: safeJsonLdString(jsonLd) }}
          />
        )}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                // EU/EEA/UK/CH: no analytics cookies until the visitor
                // accepts (CookieConsent banner); elsewhere unchanged.
                gtag('consent', 'default', {
                  analytics_storage: 'denied',
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied',
                  region: ${JSON.stringify(CONSENT_REGIONS)},
                  wait_for_update: 500
                });
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
        <AppProvider>
          {GA_MEASUREMENT_ID && <ContactClickTracker />}
          <VisitTracker />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
