// Google Analytics 4 events (gtag is loaded in src/app/layout.tsx when
// NEXT_PUBLIC_GA_MEASUREMENT_ID is set). Page views are tracked
// automatically; these mark the moments that matter for sales, so GA can
// show which paintings, pages and traffic sources lead to real inquiries.
// A no-op when GA isn't loaded (local dev, blocked by an ad blocker).

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

export function trackEvent(name: string, params: Record<string, string | number | undefined> = {}) {
  if (typeof window === 'undefined') return;
  const gtag = (window as GtagWindow).gtag;
  if (typeof gtag !== 'function') return;
  try {
    gtag('event', name, params);
  } catch {
    // analytics must never break the page
  }
}

// GA4's recommended "lead" event — one per submitted inquiry/request/message.
export function trackLead(formType: 'painting_inquiry' | 'wishlist_inquiry' | 'service_request' | 'contact_message', params: Record<string, string | number | undefined> = {}) {
  trackEvent('generate_lead', { form_type: formType, currency: 'USD', ...params });
}
