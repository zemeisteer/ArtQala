import * as Sentry from '@sentry/nextjs';
import { sentryBaseOptions } from '@/lib/sentry';

// Browser-side error monitoring (errors in visitors' browsers).
Sentry.init({
  ...sentryBaseOptions,
  // Noise from browser extensions / flaky networks, not the site itself.
  ignoreErrors: ['ResizeObserver loop limit exceeded', 'ResizeObserver loop completed with undelivered notifications', 'Non-Error promise rejection captured'],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
