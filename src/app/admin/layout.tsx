import type { Metadata } from 'next';
import SiteDocument from '@/components/SiteDocument';
import { baseMetadata } from '@/lib/siteMetadata';
import AdminShell from './AdminShell';

// Never list the admin panel (or its login page) in search results.
export const metadata: Metadata = {
  ...baseMetadata,
  robots: { index: false, follow: false },
};

// Root layout of the admin panel (the public site has its own, per
// language, in app/[lang]/layout.tsx). The admin UI switches language in
// the browser only, so its document language stays "en".
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteDocument lang="en">
      <AdminShell>{children}</AdminShell>
    </SiteDocument>
  );
}
