# Implementation Plan: LinkedIn OAuth 2.0 Integration

## Overview

This implementation plan follows an incremental, full-stack approach where backend and frontend are developed together. Each phase delivers a working, verifiable feature that can be tested in the browser immediately. This ensures we can see results at every step and catch integration issues early.

The implementation follows this sequence:
1. **Phase 1: Foundation + Profile UI** - Env vars, types, config, and update ProfileForm to show LinkedIn connect button (testable: see the button on profile page)
2. **Phase 2: OAuth Flow + Connect Experience** - Build initiate + callback routes, wire up the Connect button (testable: click Connect, authorize on LinkedIn, see it connected on profile)
3. **Phase 3: Profile Display** - Update profile API to return LinkedIn data, show name + photo on profile page (testable: see LinkedIn name and avatar on profile)
4. **Phase 4: Dashboard Display** - Show connected LinkedIn account in dashboard header (testable: see LinkedIn avatar in dashboard header)
5. **Phase 5: Disconnect + Polish** - Disconnect flow, error handling, edge cases (testable: disconnect and verify cleanup)

Each phase ends with a verification checkpoint where you can see the feature working in the browser.

## Tasks

## Phase 1: Foundation + Profile UI (See the Connect Button)

- [ ] 1. Add LinkedIn environment variables and config
  - Add `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI=http://localhost:3000/api/auth/linkedin/callback` to `.env.local` (use the credentials from the LinkedIn Developer Portal)
  - Add the same variables to `.env.local.example` with placeholder values and comments explaining LinkedIn App setup
  - Update `lib/config.ts` to read and export the new LinkedIn env vars (`linkedinClientId`, `linkedinClientSecret`, `linkedinRedirectUri`)
  - _Requirements: 6.1, 6.6_

- [ ] 2. Update TypeScript types for LinkedIn data
  - Update `ConnectedAccount` interface in `types/user.ts` to add optional `profilePictureUrl` field
  - Add `LinkedInProfile` interface to `types/user.ts` with fields: `isConnected: boolean`, `name?: string`, `pictureUrl?: string`, `email?: string`, `connectedAt?: string`
  - _Requirements: 3.6, 7.4_

- [ ] 3. Update ProfileForm LinkedIn connect button to trigger OAuth
  - Update `components/dashboard/ProfileForm.tsx`:
  - For the LinkedIn account entry specifically, change the "Connect" button's `onClick` to navigate to `/api/auth/linkedin` using `window.location.href` (full page redirect to start OAuth)
  - Keep other platforms (Instagram, Twitter, Facebook) with the existing "coming soon" behavior
  - Read `linkedin` and `linkedin_error` query params from the URL on mount (using `useSearchParams` from `next/navigation`) to show success/error toast messages (e.g., "LinkedIn connected successfully!" or "LinkedIn authorization was denied")
  - _Requirements: 1.1, 1.5_

- [ ] 4. **CHECKPOINT: Verify Connect button is wired up**
  - Start Next.js dev server: `npm run dev`
  - Log in and navigate to `/dashboard/profile`
  - Verify LinkedIn row shows "Not connected" with a "Connect" button
  - Click "Connect" on LinkedIn — it should attempt to navigate to `/api/auth/linkedin` (will 404 for now, that's expected)
  - Verify other platforms still show "coming soon" toast
  - **This proves the frontend is ready for the OAuth flow!**

## Phase 2: OAuth Flow + Connect Experience (Click Connect → Authorize → See Connected)

- [ ] 5. Update UserRecord and UserRepository with LinkedIn fields
  - Update `UserRecord` interface in `lib/db/userRepository.ts` to add optional fields: `linkedinSub?: string`, `linkedinAccessToken?: string`, `linkedinName?: string`, `linkedinPictureUrl?: string`, `linkedinEmail?: string`, `linkedinConnectedAt?: string`
  - Add `connectLinkedIn(userId: string, linkedinData: { linkedinSub: string, linkedinAccessToken: string, linkedinName: string, linkedinPictureUrl?: string, linkedinEmail?: string })` method to `UserRepository` — uses DynamoDB `UpdateCommand` to set all LinkedIn fields plus `linkedinConnectedAt` to current ISO timestamp
  - Add `disconnectLinkedIn(userId: string)` method to `UserRepository` — uses DynamoDB `UpdateCommand` with `REMOVE` action to clear all LinkedIn fields
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 6. Create OAuth initiation endpoint
  - Create `app/api/auth/linkedin/route.ts` with GET handler
  - Protect with `withAuth` middleware to ensure user is authenticated
  - Generate 32-byte cryptographically random state using `crypto.randomBytes(32).toString('hex')`
  - Set state in HTTP-only cookie (`linkedin_oauth_state`) with 10-minute expiry, SameSite=Lax, Secure in production, Path=/
  - Build LinkedIn authorization URL: `https://www.linkedin.com/oauth/v2/authorization` with query params: `response_type=code`, `client_id` from env, `redirect_uri` from env, `state`, `scope=openid profile email w_member_social`
  - Return `NextResponse.redirect()` to the LinkedIn URL
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.5_

- [ ] 7. Create OAuth callback endpoint
  - Create `app/api/auth/linkedin/callback/route.ts` with GET handler
  - Protect with `withAuth` middleware
  - Extract `code`, `state`, `error`, `error_description` from URL search params
  - If `error` param exists, redirect to `/dashboard/profile?linkedin_error=denied`
  - Validate `state` matches the `linkedin_oauth_state` cookie value; if mismatch, redirect to `/dashboard/profile?linkedin_error=state_mismatch`
  - Exchange authorization code for tokens: POST to `https://www.linkedin.com/oauth/v2/accessToken` with `Content-Type: application/x-www-form-urlencoded` body containing `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`
  - Parse token response to extract `access_token`
  - Call LinkedIn UserInfo endpoint: GET `https://api.linkedin.com/v2/userinfo` with `Authorization: Bearer <access_token>` header
  - Parse UserInfo response to extract `sub`, `name`, `picture`, `email`
  - Call `userRepository.connectLinkedIn(userId, { linkedinSub: sub, linkedinAccessToken: access_token, linkedinName: name, linkedinPictureUrl: picture, linkedinEmail: email })`
  - Clear the `linkedin_oauth_state` cookie
  - Redirect to `/dashboard/profile?linkedin=connected`
  - Wrap all external API calls in try-catch; on failure redirect to `/dashboard/profile?linkedin_error=exchange_failed`
  - Apply `withRateLimit` to prevent abuse
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.3, 6.4, 6.5_

- [ ] 8. **CHECKPOINT: Verify full OAuth connect flow works**
  - Start Next.js dev server
  - Log in and navigate to `/dashboard/profile`
  - Click "Connect" on LinkedIn
  - Verify redirect to LinkedIn authorization page with correct params
  - Authorize the app on LinkedIn
  - Verify redirect back to `/dashboard/profile?linkedin=connected`
  - Verify success toast message appears
  - Check DynamoDB to verify LinkedIn fields are stored on the user record (linkedinSub, linkedinName, linkedinPictureUrl, linkedinAccessToken, linkedinConnectedAt)
  - **This proves the OAuth flow works end-to-end!**

## Phase 3: Profile Display (See LinkedIn Name + Photo on Profile)

- [ ] 9. Update profile API to include LinkedIn data in response
  - Update GET handler in `app/api/profile/route.ts` to include a `linkedin` object in the user response
  - If `user.linkedinSub` exists: `{ isConnected: true, name: user.linkedinName, pictureUrl: user.linkedinPictureUrl, email: user.linkedinEmail, connectedAt: user.linkedinConnectedAt }`
  - If `user.linkedinSub` does not exist: `{ isConnected: false }`
  - NEVER include `linkedinAccessToken` in the response
  - _Requirements: 3.1, 3.6, 7.4, 7.5_

- [ ] 10. Update ProfileForm to display LinkedIn connection status from API
  - Update `components/dashboard/ProfileForm.tsx`:
  - Fetch LinkedIn connection data from the profile API response (the `linkedin` object added in task 9)
  - Replace the hardcoded `accounts` state for LinkedIn with real data from the API
  - When `linkedin.isConnected` is true: show the LinkedIn profile picture (using `<img>` tag with the LinkedIn picture URL), the LinkedIn display name, a green "Connected" status badge, and a "Disconnect" button (disconnect wired up in Phase 5)
  - When `linkedin.isConnected` is false: show "Not connected" with the "Connect" button (already wired from Phase 1)
  - Keep Instagram, Twitter, Facebook as hardcoded "not connected" with "coming soon" behavior
  - _Requirements: 1.5, 3.2, 3.3, 3.4, 3.5, 5.2_

- [ ] 11. Update next.config.ts for LinkedIn profile images
  - Add LinkedIn image domains to `images.remotePatterns` in `next.config.ts`:
    - `media.licdn-ei.com` with protocol `https` and pathname `/**`
    - `media.licdn.com` with protocol `https` and pathname `/**`
  - _Requirements: 3.4, 4.2_

- [ ] 12. **CHECKPOINT: Verify LinkedIn profile data shows on profile page**
  - Log in with the LinkedIn-connected account from Phase 2
  - Navigate to `/dashboard/profile`
  - Verify LinkedIn shows as "Connected" with green badge
  - Verify LinkedIn display name is shown
  - Verify LinkedIn profile picture is displayed
  - Verify other platforms still show "Not connected"
  - **This proves the profile display works with real LinkedIn data!**

## Phase 4: Dashboard Display (See LinkedIn Avatar in Dashboard Header)

- [ ] 13. Update AuthContext to include LinkedIn data
  - Update the `User` interface in `context/AuthContext.tsx` to add optional field: `linkedin?: { isConnected: boolean; name?: string; pictureUrl?: string }`
  - Update the `validateSession` function to map the LinkedIn data from the profile API response into the user state
  - Update the `login` function to also accept LinkedIn data if present
  - _Requirements: 4.1, 4.4_

- [ ] 14. Update dashboard layout header to show connected LinkedIn account
  - Update `app/dashboard/layout.tsx` header section (the top bar area near the user menu):
  - If `user.linkedin?.isConnected` is true, display a compact LinkedIn badge: small circular avatar (28x28) showing the LinkedIn profile picture, with the LinkedIn name next to it, and a small LinkedIn icon indicator
  - Style it to fit naturally in the header bar near the notification/message icons area
  - If not connected, don't render anything LinkedIn-related in the header
  - Use `<img>` tag with proper alt text for the LinkedIn avatar
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 15. **CHECKPOINT: Verify LinkedIn info shows on dashboard**
  - Log in with the LinkedIn-connected account
  - Navigate to `/dashboard`
  - Verify LinkedIn avatar and name appear in the header bar
  - Navigate to different dashboard pages (strategist, copywriter, etc.)
  - Verify LinkedIn info persists in header across all dashboard pages
  - **This proves the dashboard display works!**

## Phase 5: Disconnect + Polish (Full Round-Trip)

- [ ] 16. Create disconnect endpoint and wire up frontend
  - Create `app/api/auth/linkedin/disconnect/route.ts` with POST handler
  - Protect with `withAuth` middleware
  - Call `userRepository.disconnectLinkedIn(userId)`
  - Return JSON response `{ success: true }`
  - On error, return 500 with `{ success: false, error: 'Failed to disconnect LinkedIn' }`
  - Update `components/dashboard/ProfileForm.tsx`: wire the "Disconnect" button to call `POST /api/auth/linkedin/disconnect`, then refresh the profile data on success (re-fetch from `/api/profile`) so the UI updates to show "Not connected"
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 17. Add error handling for edge cases
  - Handle expired LinkedIn access tokens gracefully (if UserInfo call fails with 401 during callback, redirect with appropriate error)
  - Handle network errors during token exchange (catch and redirect with `linkedin_error=exchange_failed`)
  - Handle malformed LinkedIn responses (missing `sub` or `name` fields — redirect with error)
  - Validate LinkedIn picture URL is a valid HTTPS URL before storing (fallback to undefined if invalid)
  - Sanitize LinkedIn name and email before storing in DynamoDB (trim whitespace, limit length)
  - _Requirements: 2.7, 6.4_

- [ ] 18. **FINAL CHECKPOINT: Complete end-to-end verification**
  - Test complete round-trip flow:
    1. Log in to Zetca
    2. Navigate to Profile page → verify LinkedIn shows "Not connected"
    3. Click "Connect" → authorize on LinkedIn
    4. Verify redirect back with success message
    5. Verify LinkedIn name and picture shown on profile page
    6. Navigate to dashboard → verify LinkedIn avatar and name in header
    7. Return to profile → click "Disconnect"
    8. Verify LinkedIn removed from profile page (shows "Not connected" again)
    9. Navigate to dashboard → verify LinkedIn info gone from header
  - Test error scenarios:
    1. Deny consent on LinkedIn → verify error message on profile
    2. Tamper with state parameter → verify rejection
    3. Access `/api/auth/linkedin` without being logged in → verify redirect to login
  - **This proves the entire LinkedIn integration works end-to-end!**
