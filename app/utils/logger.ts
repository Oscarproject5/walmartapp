/**
 * Logger utility for consistent logging across the application
 * - Development logs: only shown in development environment
 * - Error/warning logs: shown in all environments
 * 
 * This implementation works with Turbopack and doesn't require Babel plugins.
 */

// Check environment once at initialization
const isProduction = process.env.NODE_ENV === 'production';

const logger = {
  log: (...args: any[]) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors in any environment
    console.error(...args);
  },
  warn: (...args: any[]) => {
    // Always log warnings
    console.warn(...args);
  },
  info: (...args: any[]) => {
    if (!isProduction) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (!isProduction) {
      console.debug(...args);
    }
  }
};

export default logger; 