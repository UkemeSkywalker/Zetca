/**
 * Centralized error handling for authentication system
 */

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthError';
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

/**
 * Predefined error types for common authentication scenarios
 */
export const AuthErrors = {
  // Validation errors (400)
  INVALID_EMAIL: (field = 'email') => 
    new AuthError('Invalid email format', 400, field, 'INVALID_EMAIL'),
  
  INVALID_PASSWORD: (field = 'password') => 
    new AuthError('Password must be at least 8 characters', 400, field, 'INVALID_PASSWORD'),
  
  INVALID_NAME: (field = 'name') => 
    new AuthError('Name is required', 400, field, 'INVALID_NAME'),
  
  INVALID_BIO: (field = 'bio') => 
    new AuthError('Bio must be 500 characters or less', 400, field, 'INVALID_BIO'),
  
  MISSING_FIELD: (fieldName: string) => 
    new AuthError(`${fieldName} is required`, 400, fieldName, 'MISSING_FIELD'),
  
  // Authentication errors (401)
  INVALID_CREDENTIALS: () => 
    new AuthError('Invalid credentials', 401, undefined, 'INVALID_CREDENTIALS'),
  
  INVALID_TOKEN: () => 
    new AuthError('Invalid or expired token', 401, undefined, 'INVALID_TOKEN'),
  
  TOKEN_EXPIRED: () => 
    new AuthError('Session expired, please log in again', 401, undefined, 'TOKEN_EXPIRED'),
  
  MISSING_TOKEN: () => 
    new AuthError('Authentication required', 401, undefined, 'MISSING_TOKEN'),
  
  // Conflict errors (409)
  EMAIL_EXISTS: () => 
    new AuthError('Email already exists', 409, 'email', 'EMAIL_EXISTS'),
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: () => 
    new AuthError('Too many requests, please try again later', 429, undefined, 'RATE_LIMIT_EXCEEDED'),
  
  // Server errors (500)
  DATABASE_ERROR: () => 
    new AuthError('An error occurred, please try again', 500, undefined, 'DATABASE_ERROR'),
  
  INTERNAL_ERROR: () => 
    new AuthError('An error occurred, please try again', 500, undefined, 'INTERNAL_ERROR'),
};

/**
 * Logs error details server-side for debugging
 */
export function logError(error: Error | AuthError, context?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error instanceof AuthError && {
      statusCode: error.statusCode,
      field: error.field,
      code: error.code,
    }),
    ...context,
  };
  
  // Log to console (in production, this would go to a logging service)
  console.error('[AUTH ERROR]', JSON.stringify(errorDetails, null, 2));
}

/**
 * Formats error response for API endpoints
 */
export function formatErrorResponse(error: Error | AuthError) {
  if (error instanceof AuthError) {
    return {
      error: error.message,
      code: error.code,
      field: error.field,
    };
  }
  
  // For unexpected errors, return generic message
  return {
    error: 'An error occurred, please try again',
    code: 'INTERNAL_ERROR',
  };
}

/**
 * Determines if an error should be retried by the client
 */
export function isRetryableError(error: AuthError): boolean {
  return error.statusCode >= 500 || error.statusCode === 429;
}
