import React from 'react';
import type { Metadata } from 'next';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import ContactClient from './ContactClient';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang } from '@/lib/i18n/routing';

const siteUrl = process.env.NEXTAUTH_URL || 'https://artqala.com';
const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: 'Contact', path: '/contact' }], siteUrl);

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('contact', isLang(lang) ? lang : 'en');
}

export default function ContactPage() {
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

