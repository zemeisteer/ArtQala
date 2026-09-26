// Shared Sentry settings (error monitoring, EU data region). The DSN is a
// public identifier, not a secret — it only allows *sending* events.
// Personal data is not collected: no IPs, cookies, headers or request
// bodies (sendDefaultPii: false), only the technical error.
export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  'https://f13aac0bcfce735ccd444a9ba805158d@o4512152282726400.ingest.de.sentry.io/4512152287576144';

export const sentryBaseOptions = {
  dsn: SENTRY_DSN,
  // Only the live site reports — local dev errors would just be noise.
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || 'production',
  sendDefaultPii: false,
  // A small sample of page-load/API timings for performance insight,
  // kept low to stay well inside the free plan.
  tracesSampleRate: 0.1,
};
