'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

// Reports clicks on direct-contact links (WhatsApp, Telegram, phone, email,
// Instagram, map) wherever they appear — footer, contact page, anywhere —
// as a GA "contact_click" event, since a lot of customers reach the gallery
// that way instead of through a form. One document-level listener instead
// of wiring every link by hand.
const METHODS: [RegExp, string][] = [
  [/^https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//i, 'whatsapp'],
  [/^https?:\/\/(t\.me|telegram\.me)\//i, 'telegram'],
  [/^tel:/i, 'phone'],
  [/^mailto:/i, 'email'],
  [/^https?:\/\/(www\.)?instagram\.com\//i, 'instagram'],
  [/^https?:\/\/(maps\.app\.goo\.gl|(www\.)?google\.[a-z.]+\/maps|goo\.gl\/maps)/i, 'map'],
];

export default function ContactClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const method = METHODS.find(([re]) => re.test(href))?.[1];
      if (method) trackEvent('contact_click', { method, page_path: window.location.pathname });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}
