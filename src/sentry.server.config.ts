import * as Sentry from '@sentry/nextjs';
import { sentryBaseOptions } from '@/lib/sentry';

// Server-side error monitoring (API routes, server-rendered pages).
Sentry.init(sentryBaseOptions);
