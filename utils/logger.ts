/**
 * Logger utility for standardized logging across the application
 * 
 * This utility provides different log levels and categories to help
 * organize and filter logs based on importance and context.
 */

import { captureException, captureMessage, addBreadcrumb, SeverityLevel } from '../services/sentry';

// Log levels in order of severity
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

// Map LogLevel to Sentry SeverityLevel
const logLevelToSentryLevel = {
  [LogLevel.ERROR]: SeverityLevel.Error,
  [LogLevel.WARN]: SeverityLevel.Warning,
  [LogLevel.INFO]: SeverityLevel.Info,
  [LogLevel.DEBUG]: SeverityLevel.Debug,
};

// Log categories to organize logs by feature area
export enum LogCategory {
  AUTH = 'AUTH',
  NAVIGATION = 'NAVIGATION',
  SUPABASE = 'SUPABASE',
  UI = 'UI',
  GENERAL = 'GENERAL',
  OUTFIT = 'OUTFIT',
}

// Configuration for the logger
interface LoggerConfig {
  // The minimum level to log (e.g., if set to WARN, DEBUG and INFO logs will be ignored)
  minLevel: LogLevel;
  // Whether to include timestamps in logs
  includeTimestamp: boolean;
  // Whether to enable logging at all
  enabled: boolean;
  // Categories to enable (if empty, all categories are enabled)
  enabledCategories: LogCategory[];
  // Whether to send logs to Sentry
  sendToSentry: boolean;
  // The minimum level to send to Sentry
  minSentryLevel: LogLevel;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  minLevel: LogLevel.INFO, // Reset to INFO
  includeTimestamp: true,
  enabled: true,
  enabledCategories: [], // Empty means all categories are enabled
  sendToSentry: true,
  minSentryLevel: LogLevel.WARN, // Only send WARN and above to Sentry
};

// Current configuration (can be updated at runtime)
let config: LoggerConfig = { ...defaultConfig };

/**
 * Configure the logger
 * @param newConfig Partial configuration to merge with current config
 */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Internal logging function
 */
function logInternal(
  level: LogLevel,
  category: LogCategory,
  message: string,
  data?: any
): void {
  // Check if logging is enabled
  if (!config.enabled) return;

  // Check if the log level is high enough
  const levels = Object.values(LogLevel);
  if (levels.indexOf(level) > levels.indexOf(config.minLevel)) return;

  // Check if the category is enabled
  if (
    config.enabledCategories.length > 0 &&
    !config.enabledCategories.includes(category)
  ) {
    return;
  }

  // Format the log message
  const timestamp = config.includeTimestamp ? new Date().toISOString() : '';
  const prefix = timestamp ? `[${category} ${level} ${timestamp}]` : `[${category} ${level}]`;
  
  // Log to console
  console.log(`${prefix} ${message}`);
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2));
  }

  // Send to Sentry if enabled and level is high enough
  if (config.sendToSentry && levels.indexOf(level) <= levels.indexOf(config.minSentryLevel)) {
    const sentryLevel = logLevelToSentryLevel[level];
    
    // Add as breadcrumb for all logged events
    addBreadcrumb(
      category,
      message,
      sentryLevel,
      data
    );
    
    // For errors and warnings, also capture as events
    if (level === LogLevel.ERROR) {
      if (data instanceof Error) {
        captureException(data, { message, category });
      } else {
        captureMessage(message, sentryLevel, { ...data, category });
      }
    } else if (level === LogLevel.WARN) {
      captureMessage(message, sentryLevel, { ...data, category });
    }
  }
}

/**
 * Create a logger for a specific category
 * @param category The category for this logger
 * @returns An object with methods for each log level
 */
export function createLogger(category: LogCategory) {
  return {
    error: (message: string, data?: any) => 
      logInternal(LogLevel.ERROR, category, message, data),
    warn: (message: string, data?: any) => 
      logInternal(LogLevel.WARN, category, message, data),
    info: (message: string, data?: any) => 
      logInternal(LogLevel.INFO, category, message, data),
    debug: (message: string, data?: any) => 
      logInternal(LogLevel.DEBUG, category, message, data),
  };
}

// Export pre-configured loggers for common categories
export const authLogger = createLogger(LogCategory.AUTH);
export const navigationLogger = createLogger(LogCategory.NAVIGATION);
export const supabaseLogger = createLogger(LogCategory.SUPABASE);
export const uiLogger = createLogger(LogCategory.UI);
export const logger = createLogger(LogCategory.GENERAL);
export const outfitLogger = createLogger(LogCategory.OUTFIT); 