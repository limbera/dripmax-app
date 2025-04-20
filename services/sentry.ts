import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Get environment variables
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

// Enum for severity levels since Sentry.Severity is not exported
export enum SeverityLevel {
  Fatal = 'fatal',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Debug = 'debug'
}

/**
 * Initialize Sentry with your project's DSN
 */
export const initSentry = () => {
  if (!DSN) {
    console.warn('Sentry DSN not found. Error reporting will be disabled.');
    return;
  }

  Sentry.init({
    dsn: DSN,
    debug: ENVIRONMENT === 'development',
    environment: ENVIRONMENT,
    release: APP_VERSION,
    // Auto session tracking to measure crash-free users and sessions
    enableAutoSessionTracking: true,
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    // We recommend adjusting this value in production
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0,
    // Capture uncaught exceptions
    enableNativeCrashHandling: true,
    // Navigation integration
    integrations: [
      // We'll add specific integrations in the future if needed
    ],
  });

  console.log(`Sentry initialized (${ENVIRONMENT} environment)`);
};

/**
 * Set user context when user is identified
 */
export const setUserContext = (userId: string, email?: string) => {
  Sentry.setUser({
    id: userId,
    email,
  });
};

/**
 * Clear user context on logout
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
};

/**
 * Capture an exception with Sentry
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a message with Sentry
 */
export const captureMessage = (message: string, level?: SeverityLevel, context?: Record<string, any>) => {
  Sentry.captureMessage(message, {
    level: level || SeverityLevel.Info,
    extra: context,
  });
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addBreadcrumb = (
  category: string,
  message: string,
  level: SeverityLevel = SeverityLevel.Info,
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
  });
};

/**
 * Start a performance transaction
 */
export const startTransaction = (name: string, op: string) => {
  // Using withProfiler is a more reliable way to track performance in React Native
  // We'll implement basic profiling and spans for now
  return {
    finish: () => {}, // Placeholder finish method
    startChild: (options: { op: string, description: string }) => ({
      finish: () => {} // Placeholder for span finish
    })
  };
};

/**
 * Create a child span of a transaction
 */
export const startChildSpan = (
  transaction: any,
  name: string,
  op: string
) => {
  return transaction.startChild({
    op,
    description: name,
  });
};

// Export Sentry directly for advanced usage
export { Sentry }; 