// Cookie consent for Google Analytics, for visitors from the EU/EEA, the UK
// and Switzerland — where the law requires opt-in before analytics cookies.
// Everyone else is unaffected. The root layout sets a region-scoped
// "denied" default via Google Consent Mode; the CookieConsent banner asks
// and updates it. Visitor country comes from src/lib/visitorCountry.ts.

export const CONSENT_REGIONS = [
  // EU
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEA, UK, Switzerland
  'IS', 'LI', 'NO', 'GB', 'CH',
];

export const CONSENT_STORAGE_KEY = 'artqala_consent';
export type ConsentChoice = 'granted' | 'denied';

export function readConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function applyConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {}
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') {
    gtag('consent', 'update', { analytics_storage: choice });
  }
}
