import type { Metadata } from 'next';
import PrivacyClient from './PrivacyClient';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy of Art Qala Gallery in Tashkent, Uzbekistan. Learn how we handle your personal information, inquiries, and artwork transactions.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
