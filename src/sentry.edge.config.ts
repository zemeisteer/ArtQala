import * as Sentry from '@sentry/nextjs';
import { sentryBaseOptions } from '@/lib/sentry';

// Edge runtime (middleware) error monitoring.
Sentry.init(sentryBaseOptions);
