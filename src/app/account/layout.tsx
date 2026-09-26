import type { Metadata } from 'next';

// Private/utility page: its own title, and kept out of search results —
// otherwise it inherits the home page's title and canonical URL and looks
// to Google like a duplicate of the home page.
export const metadata: Metadata = {
  title: 'My Account',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
