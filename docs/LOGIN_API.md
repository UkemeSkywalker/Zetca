# Login API Endpoint Documentation

## Overview

The login API endpoint provides secure user authentication with rate limiting protection. It validates credentials, generates JWT tokens, and sets secure HTTP-only cookies for session management.

## Endpoint

```
POST /api/auth/login
```

## Request

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "email": "user@example.com",
  "password": "UserPassword123"
}
```

### Validation Rules
- **Email**: Required, must be valid email format
- **Password**: Required, must meet password requirements (min 8 characters)

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "bio": "User bio (optional)",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastModified": "2024-01-01T00:00:00.000Z"
  }
}
```

**Cookies Set:**
- `auth-token`: JWT token (HTTP-only, 24-hour expiration)

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "error": "Email is required"
}
```

```json
{
  "error": "Password is required"
}
```

```json
{
  "error": "Invalid email format"
}
```

#### 401 Unauthorized - Invalid Credentials
```json
{
  "error": "Invalid credentials"
}
```

**Note**: The error message is intentionally generic and does not reveal whether the email or password was incorrect. This prevents attackers from enumerating valid email addresses.

#### 429 Too Many Requests - Rate Limit Exceeded
```json
{
  "error": "Too many requests, please try again later"
}
```

**Headers:**
- `Retry-After`: Number of seconds until rate limit resets

#### 500 Internal Server Error
```json
{
  "error": "An error occurred during login"
}
```

## Rate Limiting

The login endpoint implements rate limiting to prevent brute force attacks:

- **Limit**: 5 requests per 15 minutes per IP address
- **Tracking**: Based on client IP address (supports X-Forwarded-For header)
- **Storage**: In-memory store (resets on server restart)
- **Response**: HTTP 429 with Retry-After header

### Rate Limit Behavior

1. First 5 requests within 15 minutes: Processed normally
2. 6th request onwards: Rejected with 429 status
3. After 15 minutes: Counter resets automatically

## Security Features

### Password Security
- Passwords are verified using bcrypt
- Password hashes are never exposed in responses
- Failed login attempts don't reveal which credential was wrong

### Token Security
- JWT tokens with 24-hour expiration
- Tokens stored in HTTP-only cookies (not accessible via JavaScript)
- Secure flag enabled in production (HTTPS only)
- SameSite=Lax to prevent CSRF attacks

### Input Validation
- Email format validation
- Password strength validation
- Input sanitization to prevent injection attacks

### Error Handling
- Generic error messages for authentication failures
- Detailed errors logged server-side only
- No sensitive information exposed to clients

## Implementation Details

### Rate Limiting Middleware

Location: `lib/middleware/withRateLimit.ts`

```typescript
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000
)
```

Features:
- In-memory store with automatic cleanup
- Configurable request limit and time window
- IP-based tracking with proxy support
- Retry-After header in rate limit responses

### Login Handler

Location: `app/api/auth/login/route.ts`

Flow:
1. Parse and validate request body
2. Validate email and password format
3. Query user from DynamoDB by email
4. Verify password hash with bcrypt
5. Generate JWT token
6. Set HTTP-only cookie
7. Return user data (excluding password hash)

## Testing

### Manual Testing with curl

```bash
# Successful login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}' \
  -i

# Invalid credentials
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"WrongPassword"}' \
  -i

# Test rate limiting (run 6 times rapidly)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"TestPassword123"}' \
    -w "\nHTTP Status: %{http_code}\n"
done
```

### Automated Testing

Run the test script:
```bash
npx tsx scripts/test-login.ts
```

Or use the shell script:
```bash
./scripts/test-login-curl.sh
```

### Postman Testing

1. Create a POST request to `http://localhost:3000/api/auth/login`
2. Set header: `Content-Type: application/json`
3. Set body (raw JSON):
   ```json
   {
     "email": "test@example.com",
     "password": "TestPassword123"
   }
   ```
4. Send request and verify:
   - Status code is 200
   - Response contains token and user data
   - Cookies tab shows `auth-token` cookie

## Usage in Frontend

### Example: Login Form

```typescript
async function handleLogin(email: string, password: string) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Token is automatically stored in HTTP-only cookie
    // Redirect to dashboard or update UI
    router.push('/dashboard');
  } catch (error) {
    // Handle error (show message to user)
    setError(error.message);
  }
}
```

## Related Endpoints

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/logout` - End user session
- `GET /api/profile` - Get user profile (requires authentication)
- `PUT /api/profile` - Update user profile (requires authentication)

## Requirements Satisfied

This implementation satisfies the following requirements:

- **1.1**: Valid credentials create authenticated sessions
- **1.2**: Invalid credentials are rejected with error message
- **1.3**: Empty email field prevents login with validation error
- **1.4**: Empty password field prevents login with validation error
- **1.5**: Successful login generates secure JWT token
- **1.6**: Token is stored securely in HTTP-only cookie
- **1.7**: Generic error message doesn't reveal which credential was wrong
- **7.2**: Rate limiting protects against brute force attacks
- **7.3**: Account lockout via rate limiting (5 requests per 15 minutes)

## Troubleshooting

### Issue: "Invalid credentials" for valid user

**Possible causes:**
1. User doesn't exist in DynamoDB
2. Password hash doesn't match
3. DynamoDB table not accessible

**Solution:**
- Verify user exists: Check DynamoDB table
- Test password hashing: Use `scripts/test-auth-utils.ts`
- Check AWS credentials and region configuration

### Issue: Rate limiting not working

**Possible causes:**
1. Multiple server instances (in-memory store is per-instance)
2. Proxy/load balancer not forwarding IP headers

**Solution:**
- For production, use Redis or DynamoDB for rate limit storage
- Ensure X-Forwarded-For header is set correctly

### Issue: Cookie not being set

**Possible causes:**
1. HTTPS required in production but not available
2. SameSite cookie restrictions
3. Browser blocking third-party cookies

**Solution:**
- Ensure HTTPS in production
- Check browser console for cookie warnings
- Verify domain matches between frontend and API

## Future Enhancements

- [ ] Persistent rate limiting with Redis/DynamoDB
- [ ] Account lockout after multiple failed attempts
- [ ] Two-factor authentication (2FA)
- [ ] Remember me functionality
- [ ] Login activity logging
- [ ] Suspicious login detection
- [ ] Email notifications for new logins
