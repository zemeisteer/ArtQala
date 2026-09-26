import type { Metadata } from 'next';
import TermsClient from './TermsClient';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Art Qala Gallery in Tashkent, Uzbekistan. Information regarding original artwork purchases, authenticity certificates, and commissions.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <TermsClient />;
}
