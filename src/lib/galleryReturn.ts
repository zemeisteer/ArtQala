'use client';

import { useSyncExternalStore } from 'react';

// The gallery remembers its last filters (artist, category, search, page…)
// for this browser tab, so "← Back to Gallery" and the breadcrumb on a
// painting's page return to the SAME filtered view instead of the whole
// collection. (The browser's own Back button already keeps them — they live
// in the URL.)
const KEY = 'artqala_gallery_qs';

export function rememberGalleryQuery(queryString: string) {
  try {
    sessionStorage.setItem(KEY, queryString);
  } catch {
    // private mode etc. — the links just fall back to the plain gallery
  }
}

function read(): string {
  try {
    const qs = sessionStorage.getItem(KEY) || '';
    return qs.startsWith('?') ? qs : '';
  } catch {
    return '';
  }
}

const subscribe = () => () => {};

// "/gallery" on the server and during hydration, then the remembered
// filtered URL (e.g. "/gallery?artist=…&page=2").
export function useGalleryHref(): string {
  return useSyncExternalStore(subscribe, () => `/gallery${read()}`, () => '/gallery');
}
