# Session Persistence and Token Refresh Verification Guide

This guide provides step-by-step instructions to verify the session persistence and token refresh functionality implemented in Task 17.

## Features Implemented

1. **Token Expiration Check on App Load**: The AuthContext now decodes the JWT token and checks if it's expired before making API calls
2. **Periodic Token Expiration Monitoring**: Every minute, the system checks if the token has expired and automatically logs out the user
3. **Graceful Token Expiration Handling**: When a token expires, the user is automatically redirected to the login page
4. **Cross-Tab Session Synchronization**: Login and logout events are synchronized across browser tabs using localStorage events

## Verification Steps

### Test 1: Session Persistence Across Browser Restarts

1. **Login to the application**
   - Navigate to `/login`
   - Enter valid credentials
   - Click "Log In"
   - Verify you're redirected to `/dashboard`

2. **Close the browser completely**
   - Close all browser windows
   - Wait a few seconds

3. **Reopen the browser and navigate to the dashboard**
   - Open a new browser window
   - Navigate directly to `/dashboard`
   - **Expected Result**: You should still be logged in (no redirect to login)
   - **Reason**: The auth_token cookie persists and is validated on app load

### Test 2: Token Expiration Handling

#### Option A: Wait for Natural Expiration (24 hours)
1. Login to the application
2. Wait 24 hours
3. Try to access `/dashboard`
4. **Expected Result**: Automatic redirect to `/login`

#### Option B: Test with Short-Lived Token (Recommended)

1. **Temporarily modify token expiration for testing**
   - Open `lib/config.ts`
   - Change `jwtExpirationHours: 24` to `jwtExpirationHours: 0.01` (36 seconds)
   - Save the file

2. **Restart the development server**
   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   npm run dev
   ```

3. **Login to the application**
   - Navigate to `/login`
   - Enter valid credentials
   - Login successfully

4. **Wait for token to expire**
   - Stay on the dashboard
   - Wait approximately 1 minute (36 seconds for expiration + up to 60 seconds for the periodic check)
   - **Expected Result**: You should be automatically redirected to `/login`

5. **Try to access dashboard after expiration**
   - Navigate to `/dashboard`
   - **Expected Result**: Immediate redirect to `/login` (token is checked on app load)

6. **Restore normal token expiration**
   - Change `jwtExpirationHours` back to `24` in `lib/config.ts`
   - Restart the development server

### Test 3: Cross-Tab Session Synchronization

1. **Open two browser tabs**
   - Tab 1: Navigate to `/login`
   - Tab 2: Navigate to `/login`

2. **Login in Tab 1**
   - Enter credentials in Tab 1
   - Click "Log In"
   - Verify redirect to `/dashboard` in Tab 1

3. **Check Tab 2**
   - Switch to Tab 2
   - Navigate to `/dashboard`
   - **Expected Result**: You should be logged in (session synchronized)

4. **Logout in Tab 1**
   - Switch to Tab 1
   - Click the "Logout" button
   - Verify redirect to `/login` in Tab 1

5. **Check Tab 2**
   - Switch to Tab 2
   - **Expected Result**: Tab 2 should automatically redirect to `/login` (logout synchronized)

### Test 4: Token Validation on Protected Routes

1. **Clear cookies manually**
   - Open browser DevTools (F12)
   - Go to Application/Storage tab
   - Find and delete the `auth_token` cookie

2. **Try to access dashboard**
   - Navigate to `/dashboard`
   - **Expected Result**: Immediate redirect to `/login`

3. **Login again**
   - Enter valid credentials
   - **Expected Result**: Successful login and access to dashboard

## Implementation Details

### Key Changes in AuthContext

1. **Token Decoding Function**
   ```typescript
   function decodeToken(token: string): { exp: number } | null
   ```
   - Decodes JWT token on the client side
   - Extracts expiration timestamp

2. **Token Expiration Check on Load**
   - Checks if token exists in cookie
   - Decodes token and verifies expiration before making API call
   - Clears expired tokens immediately

3. **Periodic Expiration Monitoring**
   - Runs every 60 seconds when user is authenticated
   - Checks token expiration and logs out if expired
   - Cleans up interval on unmount

4. **Cross-Tab Synchronization**
   - Uses localStorage events to communicate between tabs
   - `auth_login` event: Notifies other tabs of login
   - `auth_logout` event: Notifies other tabs of logout

## Technical Notes

- **Token Expiration**: Default is 24 hours (configurable in `lib/config.ts`)
- **Periodic Check Interval**: 60 seconds (runs only when authenticated)
- **Cookie Settings**: HTTP-only, secure in production, SameSite=lax
- **Client-Side Token Decoding**: Used only for expiration checking, not for authentication
- **Server-Side Validation**: All API routes still validate tokens server-side

## Troubleshooting

### Session not persisting after browser restart
- Check if cookies are enabled in your browser
- Verify the `auth_token` cookie exists in DevTools
- Check if the cookie has the correct `maxAge` setting

### Not redirected after token expiration
- Verify the token expiration time in the JWT payload
- Check browser console for any errors
- Ensure the periodic check interval is running (check for console logs)

### Cross-tab sync not working
- Verify localStorage is enabled in your browser
- Check if both tabs are on the same domain
- Look for storage events in browser DevTools

## Automated Test

Run the token expiration test script:
```bash
npx tsx scripts/test-session-persistence.ts
```

This script verifies:
- Token generation with correct expiration
- Token verification
- Expired token rejection
- Expiration time calculations
