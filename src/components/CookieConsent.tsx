'use client';

import React, { useEffect, useState } from 'react';
import Link from '@/components/LocalizedLink';
import { useApp } from '@/context/AppContext';
import { getVisitorCountry } from '@/lib/visitorCountry';
import { CONSENT_REGIONS, applyConsent, readConsent } from '@/lib/consent';

// Small bottom bar asking EU/EEA/UK/Swiss visitors whether analytics may
// use cookies (see src/lib/consent.ts). Shown once; the answer is kept in
// localStorage and re-applied on every visit.
export default function CookieConsent() {
  const { t } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = readConsent();
    if (saved) {
      applyConsent(saved);
      return;
    }
    const country = getVisitorCountry();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (country && CONSENT_REGIONS.includes(country)) setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (choice: 'granted' | 'denied') => {
    applyConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t.cookieConsent.title}
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[150] bg-[#281C18] text-[#FAF4EC] rounded-md shadow-2xl border border-[#3D2C26] p-5 space-y-3"
    >
      <p className="text-sm font-semibold">{t.cookieConsent.title}</p>
      <p className="text-xs leading-relaxed text-[#C5B7AD]">
        {t.cookieConsent.body}{' '}
        <Link href="/privacy" className="underline hover:text-[#FAF4EC]">
          {t.cookieConsent.learnMore}
        </Link>
      </p>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => choose('granted')}
          className="flex-1 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold py-2.5 rounded-[3px] transition-colors cursor-pointer"
        >
          {t.cookieConsent.accept}
        </button>
        <button
          type="button"
          onClick={() => choose('denied')}
          className="flex-1 border border-[#5C4A42] hover:border-[#FAF4EC] text-[#FAF4EC] text-xs font-semibold py-2.5 rounded-[3px] transition-colors cursor-pointer"
        >
          {t.cookieConsent.decline}
        </button>
      </div>
    </div>
  );
}
