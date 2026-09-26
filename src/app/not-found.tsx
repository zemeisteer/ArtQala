'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NotFoundBody from '@/components/NotFoundBody';

// Unknown URLs are rendered by the root layout, outside the public site's
// [lang] layout, so this page brings its own header and footer.
export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <NotFoundBody />
      <Footer />
    </div>
  );
}
