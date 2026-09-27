'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { parseSocialLinks } from '@/lib/settingsUtils';
import { trackEvent } from '@/lib/analytics';

// Floating "chat on WhatsApp" button on every public page. The number comes
// from the WhatsApp link in Admin → Settings (any social link pointing at
// wa.me / whatsapp.com); without one, nothing is shown. The chat opens
// with a message pre-filled in the visitor's language that includes the
// page they were on — so the gallery knows which painting they mean.
function whatsappNumber(url: string): string | null {
  const wa = url.match(/wa\.me\/(\+?\d{6,15})/i);
  if (wa) return wa[1].replace('+', '');
  const api = url.match(/whatsapp\.com\/.*phone=(\+?\d{6,15})/i);
  return api ? api[1].replace('+', '') : null;
}

export default function WhatsAppButton() {
  const { t, settings } = useApp();
  const pathname = usePathname();

  const link = parseSocialLinks(settings?.social_links, settings?.telegram, settings?.instagram).find((l) =>
    /wa\.me|whatsapp\.com/i.test(l.url)
  );
  const number = link ? whatsappNumber(link.url) : null;
  if (!number) return null;

  const open = () => {
    const pageUrl = `${window.location.origin}${pathname}`;
    const message = `${t.whatsapp.greeting}\n${pageUrl}`;
    trackEvent('contact_click', { method: 'whatsapp_float', page_path: pathname });
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      onClick={open}
      aria-label={t.whatsapp.label}
      title={t.whatsapp.label}
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[140] w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1EBE5A] text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
    >
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="currentColor" aria-hidden="true">
        <path d="M16.004 3C8.826 3 3 8.826 3 16.004c0 2.29.6 4.528 1.74 6.5L3 29l6.667-1.71a12.95 12.95 0 0 0 6.337 1.62h.005C23.183 28.91 29 23.084 29 15.906 29 8.73 23.183 3 16.004 3zm0 23.72h-.004a10.74 10.74 0 0 1-5.477-1.5l-.393-.233-3.958 1.016 1.057-3.86-.256-.396a10.72 10.72 0 0 1-1.648-5.743c0-5.93 4.826-10.756 10.762-10.756 5.93 0 10.673 4.73 10.673 10.66 0 5.93-4.826 10.812-10.756 10.812zm5.898-8.05c-.323-.162-1.912-.943-2.208-1.051-.296-.108-.512-.162-.727.162-.216.323-.835 1.051-1.023 1.267-.189.216-.377.243-.7.081-.323-.162-1.365-.503-2.6-1.605-.961-.857-1.61-1.916-1.798-2.24-.189-.323-.02-.498.141-.659.145-.145.323-.377.485-.566.162-.189.216-.323.323-.539.108-.216.054-.404-.027-.566-.081-.162-.727-1.753-.996-2.4-.262-.63-.529-.545-.727-.555-.189-.009-.404-.011-.62-.011a1.19 1.19 0 0 0-.862.404c-.296.323-1.131 1.105-1.131 2.695 0 1.59 1.158 3.126 1.32 3.342.162.216 2.28 3.482 5.524 4.883.772.333 1.374.532 1.844.681.775.246 1.48.211 2.038.128.622-.093 1.912-.781 2.182-1.536.27-.755.27-1.401.189-1.536-.081-.135-.296-.216-.62-.377z" />
      </svg>
    </button>
  );
}
