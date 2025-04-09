import logger from '../app/utils/logger';

/**
 * Example showing how to use the logger utility
 * 
 * This demonstrates the different log levels and how they behave
 * in development vs production environments.
 * 
 * This implementation is compatible with Turbopack and doesn't require Babel plugins.
 */

// Example function for demo purposes
const someFunction = () => {
  return { status: 'success', data: [1, 2, 3] };
};

// DEV ONLY LOGS - These won't appear in production
logger.log('Regular log message - only visible in development');
logger.info('Info message - only visible in development');
logger.debug('Debug message - only visible in development');

// ALWAYS VISIBLE LOGS - These appear in all environments
logger.error('Error message - visible in all environments');
logger.warn('Warning message - visible in all environments');

// EXAMPLE USAGE WITH OBJECTS
const userData = {
  id: '123',
  name: 'John Doe',
  role: 'admin'
};

// Development only
logger.log('User data:', userData);

// Always visible (even in production)
if (!userData.name) {
  logger.error('Missing user name', userData);
}

// USAGE WITH TRY/CATCH
try {
  // Some risky operation
  const result = someFunction();
  logger.log('Operation successful:', result);
} catch (error) {
  // Errors should always be logged
  logger.error('Operation failed:', error);
} 