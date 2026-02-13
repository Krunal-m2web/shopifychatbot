import * as Sentry from '@sentry/remix';

// Initialize Sentry for error tracking
export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        Sentry.captureConsoleIntegration({
          levels: ['error'],
        }),
      ],
    });
  }
}

export { Sentry };
