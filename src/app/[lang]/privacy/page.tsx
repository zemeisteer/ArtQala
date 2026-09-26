import type { Metadata } from 'next';
import PrivacyClient from './PrivacyClient';
import { pageMetadata } from '@/lib/i18n/seo';
import { isLang } from '@/lib/i18n/routing';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata('privacy', isLang(lang) ? lang : 'en');
}

export default function PrivacyPage() {
  return <PrivacyClient />;
}
