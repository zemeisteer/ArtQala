import React from 'react';
import type { Metadata } from 'next';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import ContactClient from './ContactClient';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang } from '@/lib/i18n/routing';
import { SITE_URL } from '@/lib/siteUrl';

const siteUrl = SITE_URL;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('contact', isLang(lang) ? lang : 'en');
}

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [{ name: 'Contact', path: '/contact' }],
    siteUrl,
    isLang(rawLang) ? rawLang : 'en'
  );
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(breadcrumbJsonLd) }}
      />
      <ContactClient />
    </>
  );
}

