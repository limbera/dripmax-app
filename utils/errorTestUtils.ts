import { captureException, captureMessage, SeverityLevel } from '../services/sentry';
import { logger } from './logger';

/**
 * Utility functions to test Sentry error reporting
 */

/**
 * Generate a test error to verify Sentry is capturing exceptions
 */
export const generateTestError = () => {
  try {
    // Intentionally throw an error
    throw new Error('This is a test error for Sentry');
  } catch (error) {
    logger.error('Generated test error for Sentry', error);
    captureException(error as Error, { 
      context: 'testing',
      metadata: {
        timestamp: new Date().toISOString(),
        testCase: 'manual_error_generation'
      }
    });
    return 'Test error generated and sent to Sentry';
  }
};

/**
 * Generate a test message to verify Sentry is capturing messages
 */
export const generateTestMessage = (level: 'info' | 'warning' | 'error' = 'info') => {
  const sentryLevel = level === 'info' 
    ? SeverityLevel.Info 
    : level === 'warning' 
      ? SeverityLevel.Warning 
      : SeverityLevel.Error;
  
  const message = `This is a test ${level} message for Sentry`;
  
  if (level === 'info') {
    logger.info(message);
  } else if (level === 'warning') {
    logger.warn(message);
  } else {
    logger.error(message);
  }
  
  captureMessage(message, sentryLevel, {
    context: 'testing',
    metadata: {
      timestamp: new Date().toISOString(),
      testCase: 'manual_message_generation',
      level
    }
  });
  
  return `Test ${level} message sent to Sentry`;
};

/**
 * Simulate a runtime JS error
 */
export const simulateRuntimeError = () => {
  // This will create a real JavaScript error
  const badFunction = null;
  try {
    // @ts-ignore - intentional error
    badFunction();
  } catch (error) {
    logger.error('Simulated runtime error', error);
    captureException(error as Error, { 
      context: 'testing',
      testCase: 'runtime_error_simulation'
    });
    return 'Runtime error simulated and sent to Sentry';
  }
};

/**
 * Simulate an API error
 */
export const simulateApiError = async () => {
  try {
    // Make a request to a non-existent API endpoint
    const response = await fetch('https://nonexistent-domain-for-testing-12345.xyz/api/test');
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Simulated API error', error);
    captureException(error as Error, { 
      context: 'testing',
      testCase: 'api_error_simulation'
    });
    return 'API error simulated and sent to Sentry';
  }
}; 