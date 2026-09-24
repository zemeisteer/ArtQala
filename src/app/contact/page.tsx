import React from 'react';
import type { Metadata } from 'next';
import { buildBreadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import { safeJsonLdString } from '@/lib/jsonLd';
import ContactClient from './ContactClient';

const siteUrl = process.env.NEXTAUTH_URL || 'https://artqala.com';
const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: 'Contact', path: '/contact' }], siteUrl);

export const metadata: Metadata = {
  title: 'Contact Us & Gallery Location | Tashkent',
  description: 'Visit Art Qala Gallery at Barakhon Madrasah, Tashkent, Uzbekistan. Get in touch for original art consultations, bespoke commissions, and worldwide delivery.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Art Qala Gallery | Barakhon Madrasah, Tashkent',
    description: 'Visit our historical gallery in Tashkent or reach our curators for bespoke commissions and inquiries.',
  },
};

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

