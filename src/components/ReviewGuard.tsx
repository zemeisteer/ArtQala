'use client';

import { useCallback, useEffect, useState } from 'react';
import type { translations } from '@/lib/i18n/translations';

type Translations = (typeof translations)['en'];

// Client half of the review forms' bot checks (src/lib/reviewGuard.ts):
// fetches the signed "form opened at" token while the form is shown, and
// renders the honeypot field people never see.

export function useReviewFormToken(active: boolean) {
  const [token, setToken] = useState<string | null>(null);
  const refresh = useCallback(() => {
    fetch('/api/reviews/token', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setToken(d.token || null))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (active) refresh();
  }, [active, refresh]);
  return { token, refresh };
}

export function ReviewHoneypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

// The guard fields to add to a review POST body.
export function reviewGuardFields(form: HTMLFormElement, token: string | null) {
  const honeypot = form.elements.namedItem('website') as HTMLInputElement | null;
  return { form_token: token, website: honeypot?.value || '' };
}

export function reviewErrorText(code: string | undefined, t: Translations): string {
  const r = t.reviews;
  switch (code) {
    case 'too_fast':
      return r.errTooFast;
    case 'expired':
      return r.errExpired;
    case 'links':
      return r.errLinks;
    case 'rate_limited':
      return r.errRateLimited;
    case 'invalid':
      return r.errInvalid;
    default:
      return r.submitError;
  }
}
