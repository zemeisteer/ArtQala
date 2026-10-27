import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang } from '@/lib/i18n/routing';
import GiftCardClient from './GiftCardClient';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('gift', isLang(lang) ? lang : 'en');
}

export default function GiftCardPage() {
  return <GiftCardClient />;
}
