'use client';

import React from 'react';
import NextLink from 'next/link';
import { useApp } from '@/context/AppContext';
import { localizePath } from '@/lib/i18n/routing';

type LinkProps = React.ComponentProps<typeof NextLink>;

// Drop-in replacement for next/link on the public site: an internal
// absolute href ("/gallery") gets the current language's prefix
// ("/ru/gallery"), so navigation stays in the visitor's language without a
// redirect. External links, /api and /admin are passed through unchanged.
export default function LocalizedLink({ href, ...rest }: LinkProps) {
  const { lang } = useApp();
  let localized = href;
  if (typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && !/^\/(api|admin)(\/|$)/.test(href)) {
    const [path, query = ''] = href.split(/(?=[?#])/);
    localized = `${localizePath(path, lang)}${query}`;
  }
  return <NextLink href={localized} {...rest} />;
}
