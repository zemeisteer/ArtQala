// Direct-contact clicks counted in the admin dashboard (ContactClick).

export const CONTACT_METHODS = ['whatsapp', 'telegram', 'phone', 'email', 'instagram', 'map'] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

// Fire-and-forget from the browser; survives the page being left for wa.me.
export function recordContactClick(method: ContactMethod) {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({ method, path: window.location.pathname });
  try {
    if (navigator.sendBeacon?.('/api/stats/click', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    // fall through
  }
  fetch('/api/stats/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(
    () => {}
  );
}
