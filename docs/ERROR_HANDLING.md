# Error Handling Documentation

## Overview

The authentication system implements comprehensive error handling with centralized error management, consistent error responses, React error boundaries, and server-side logging.

## Architecture

### Centralized Error System (`lib/errors.ts`)

The error handling system is built around the `AuthError` class and predefined error types.

#### AuthError Class

```typescript
class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public field?: string,
    public code?: string
  )
}
```

Properties:
- `message`: Human-readable error message
- `statusCode`: HTTP status code (400, 401, 409, 429, 500)
- `field`: Optional field name for validation errors
- `code`: Machine-readable error code for client handling

#### Predefined Error Types

```typescript
AuthErrors.INVALID_EMAIL()           // 400 - Invalid email format
AuthErrors.INVALID_PASSWORD()        // 400 - Password validation failed
AuthErrors.INVALID_NAME()            // 400 - Name validation failed
AuthErrors.INVALID_BIO()             // 400 - Bio too long
AuthErrors.MISSING_FIELD(fieldName)  // 400 - Required field missing
AuthErrors.INVALID_CREDENTIALS()     // 401 - Wrong email/password
AuthErrors.INVALID_TOKEN()           // 401 - Invalid or expired token
AuthErrors.TOKEN_EXPIRED()           // 401 - Session expired
AuthErrors.MISSING_TOKEN()           // 401 - No authentication token
AuthErrors.EMAIL_EXISTS()            // 409 - Email already registered
AuthErrors.RATE_LIMIT_EXCEEDED()     // 429 - Too many requests
AuthErrors.DATABASE_ERROR()          // 500 - Database operation failed
AuthErrors.INTERNAL_ERROR()          // 500 - Unexpected error
```

## API Error Responses

All API endpoints return consistent error responses:

```typescript
{
  error: string,      // Human-readable error message
  code: string,       // Machine-readable error code
  field?: string      // Optional field name for validation errors
}
```

### Example Error Responses

**Validation Error (400)**
```json
{
  "error": "Invalid email format",
  "code": "INVALID_EMAIL",
  "field": "email"
}
```

**Authentication Error (401)**
```json
{
  "error": "Invalid credentials",
  "code": "INVALID_CREDENTIALS"
}
```

**Rate Limit Error (429)**
```json
{
  "error": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

Headers: `Retry-After: 900` (seconds)

**Server Error (500)**
```json
{
  "error": "An error occurred, please try again",
  "code": "INTERNAL_ERROR"
}
```

## Server-Side Error Logging

All errors are logged server-side with context:

```typescript
logError(error, {
  endpoint: '/api/auth/login',
  method: 'POST',
  userId: 'user-123',
});
```

Log format:
```json
{
  "timestamp": "2026-02-13T17:06:27.367Z",
  "name": "AuthError",
  "message": "Invalid credentials",
  "stack": "...",
  "statusCode": 401,
  "code": "INVALID_CREDENTIALS",
  "endpoint": "/api/auth/login",
  "method": "POST",
  "userId": "user-123"
}
```

## React Error Boundaries

### ErrorBoundary Component

Generic error boundary for catching React errors:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

Features:
- Catches React rendering errors
- Displays user-friendly fallback UI
- Shows error details in development mode
- Provides "Try Again" and "Go Home" buttons
- Logs errors to console

### AuthErrorBoundary Component

Specialized error boundary for authentication errors:

```tsx
import { AuthErrorBoundary } from '@/components/auth/AuthErrorBoundary';

<AuthErrorBoundary>
  <AuthenticatedComponent />
</AuthErrorBoundary>
```

Features:
- Custom fallback UI for auth errors
- "Try Again" and "Go to Login" buttons
- Automatic error recovery

### Higher-Order Component

Wrap components with error boundary:

```tsx
import { withErrorBoundary } from '@/components/ErrorBoundary';

const SafeComponent = withErrorBoundary(MyComponent);
```

## Usage in API Routes

### Basic Pattern

```typescript
import { AuthError, AuthErrors, logError, formatErrorResponse } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    // Validation
    if (!email) {
      throw AuthErrors.MISSING_FIELD('email');
    }
    
    // Business logic
    const user = await getUserByEmail(email);
    if (!user) {
      throw AuthErrors.INVALID_CREDENTIALS();
    }
    
    // Success response
    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    // Log error with context
    logError(error as Error, {
      endpoint: '/api/auth/login',
      method: 'POST',
    });

    // Handle AuthError instances
    if (error instanceof AuthError) {
      return NextResponse.json(
        formatErrorResponse(error),
        { status: error.statusCode }
      );
    }

    // Generic error for unexpected errors
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
```

## Client-Side Error Handling

### Handling API Errors

```typescript
try {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle specific error codes
    switch (data.code) {
      case 'INVALID_CREDENTIALS':
        setError('Invalid email or password');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        setError('Too many attempts. Please try again later.');
        break;
      default:
        setError(data.error || 'An error occurred');
    }
    return;
  }

  // Success handling
  handleSuccess(data);
  
} catch (error) {
  // Network error
  setError('Network error. Please check your connection.');
}
```

### Retryable Errors

Use `isRetryableError()` to determine if an error should be retried:

```typescript
import { isRetryableError } from '@/lib/errors';

if (error instanceof AuthError && isRetryableError(error)) {
  // Implement retry logic with exponential backoff
  setTimeout(() => retryRequest(), 1000);
}
```

Retryable errors:
- 500+ status codes (server errors)
- 429 status code (rate limiting)

## Testing Error Handling

### Unit Tests

Test error creation and formatting:

```bash
npx tsx scripts/test-error-handling.ts
```

### Integration Tests

Test API error responses (requires dev server):

```bash
# Terminal 1
npm run dev

# Terminal 2
npx tsx scripts/test-api-error-scenarios.ts
```

### Manual Testing Scenarios

1. **Validation Errors**: Submit forms with invalid data
2. **Invalid Credentials**: Login with wrong password
3. **Missing Token**: Access protected routes without auth
4. **Invalid Token**: Manually corrupt auth cookie
5. **Rate Limiting**: Make 6+ rapid login attempts
6. **Network Errors**: Disconnect network during API call
7. **Database Errors**: Stop DynamoDB Local during operation

## Security Considerations

### Error Message Safety

- Never reveal whether an email exists in the database
- Use generic "Invalid credentials" for login failures
- Don't expose internal error details to clients
- Log detailed errors server-side only

### Example: Secure Error Handling

```typescript
// ✗ BAD - Reveals if email exists
if (!user) {
  throw new AuthError('Email not found', 404);
}

// ✓ GOOD - Generic message
if (!user) {
  throw AuthErrors.INVALID_CREDENTIALS();
}
```

## Best Practices

1. **Always use AuthError for expected errors**
   - Provides consistent error structure
   - Enables proper error handling on client

2. **Log all errors with context**
   - Include endpoint, method, userId
   - Helps with debugging and monitoring

3. **Use error boundaries in React**
   - Prevents entire app from crashing
   - Provides better user experience

4. **Handle errors at the right level**
   - API routes: Return appropriate HTTP status
   - Components: Display user-friendly messages
   - Context: Handle auth state changes

5. **Test error scenarios**
   - Write tests for error cases
   - Verify error messages are user-friendly
   - Check that errors are logged correctly

## Monitoring and Debugging

### Development

- Errors logged to console with full details
- Error boundaries show error messages
- Stack traces available in browser DevTools

### Production

- Errors logged to server console (integrate with logging service)
- Generic error messages shown to users
- Stack traces hidden from clients
- Monitor error rates and patterns

### Recommended Logging Services

- AWS CloudWatch Logs
- Datadog
- Sentry
- LogRocket
- New Relic

## Future Enhancements

1. **Error tracking service integration**
   - Send errors to Sentry or similar
   - Track error rates and patterns

2. **User-facing error IDs**
   - Generate unique error IDs
   - Help support team debug issues

3. **Retry logic with exponential backoff**
   - Automatic retry for transient errors
   - Configurable retry policies

4. **Error analytics**
   - Track most common errors
   - Identify problematic endpoints

5. **Custom error pages**
   - Branded error pages
   - Helpful recovery suggestions
