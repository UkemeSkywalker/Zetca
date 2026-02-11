 al# Implementation Plan: User Authentication

## Overview

This implementation plan follows a backend-first approach that progressively integrates with existing frontend components. Each task delivers tangible, testable results that you can verify immediately - either through API testing tools or by seeing the integration work in the browser with your existing UI.

**Existing Frontend**: Login, Signup, and Profile pages are already built with mock data. Tasks will connect these to real backend APIs incrementally.

## Tasks

- [x] 1. Set up Terraform infrastructure for DynamoDB
  - Create `terraform/` directory structure
  - Write `terraform/main.tf` with AWS provider configuration
  - Write `terraform/variables.tf` with environment and region variables
  - Write `terraform/dynamodb.tf` with users table definition including EmailIndex GSI
  - Write `terraform/outputs.tf` to export table name and ARN
  - Add `.terraform/` and `*.tfstate` to `.gitignore`
  - **Verification**: Run `terraform init` and `terraform plan` successfully. Optionally run `terraform apply` to create the table in AWS, then verify table exists in AWS Console
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 2. Set up project dependencies and configuration
  - Install required npm packages: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `jsonwebtoken`, `bcrypt`, `@types/jsonwebtoken`, `@types/bcrypt`
  - Create `lib/config.ts` with environment configuration (DynamoDB table name, AWS region, JWT secret, rate limiting settings)
  - Create `.env.local` with actual environment variables (JWT_SECRET, DYNAMODB_TABLE_NAME, AWS_REGION)
  - Update `.env.local.example` with required environment variables template
  - **Verification**: Run `npm install` successfully, import config in a test file and log values to verify configuration loads correctly
  - _Requirements: 5.1, 5.2, 4.4_

- [x] 3. Implement core authentication utilities
  - Create `lib/auth/password.ts` with `hashPassword()` and `verifyPassword()` functions using bcrypt
  - Create `lib/auth/jwt.ts` with `generateToken()`, `verifyToken()`, and `getTokenFromRequest()` functions (24-hour expiration)
  - Create `lib/validation.ts` with validation functions for email, password, name, and bio
  - Implement input sanitization to prevent injection attacks
  - **Verification**: Create a test script `scripts/test-auth-utils.ts` that hashes a password, verifies it, generates a JWT token, and validates inputs. Run with `npx tsx scripts/test-auth-utils.ts` and verify all functions work correctly
  - _Requirements: 5.1, 5.3, 5.4, 1.5, 4.1, 4.2, 4.4, 3.3, 3.4, 7.4_

- [x] 4. Implement DynamoDB repository layer
  - Create `lib/db/userRepository.ts` with `UserRepository` class
  - Implement `createUser()`, `getUserById()`, `getUserByEmail()`, `updateUser()`, `deleteUser()` methods
  - Use userId as primary key and EmailIndex GSI for email lookups
  - Include createdAt and lastModified timestamps on all records
  - **Verification**: Create test script `scripts/test-db.ts` that creates a test user, retrieves by ID and email, updates it, and deletes it. Run script and verify all operations work (requires DynamoDB table to exist)
  - _Requirements: 5.2, 5.5, 5.6_

- [ ] 5. Implement signup API endpoint
  - Create `app/api/auth/signup/route.ts`
  - Validate name, email, and password inputs
  - Check if email already exists in DynamoDB
  - Hash password with bcrypt
  - Create user in DynamoDB with timestamps
  - Generate JWT token
  - Set HTTP-only cookie with token
  - Return user data (excluding password hash)
  - **Verification**: Use Postman/curl to POST to `/api/auth/signup` with `{name, email, password}`. Verify: (1) User created in DynamoDB, (2) Token returned in response, (3) Cookie set in headers, (4) Password is hashed in DB
  - _Requirements: 5.1, 5.3, 5.4, 1.5, 1.6, 8.1_

- [ ] 6. Connect signup form to real API
  - Update `components/auth/SignupForm.tsx` to call `/api/auth/signup` instead of mock
  - Handle API errors (email already exists, validation errors)
  - Store token from response (handled by cookie)
  - Keep existing redirect to dashboard on success
  - **Verification**: Open `/signup` in browser, create a new account with real data, verify: (1) Account created in DynamoDB, (2) Redirected to dashboard, (3) Cookie set in browser DevTools
  - _Requirements: 1.1, 1.5, 1.6, 8.4, 8.5_

- [ ] 7. Implement login API endpoint with rate limiting
  - Create `lib/middleware/withRateLimit.ts` using in-memory store (5 requests per 15 minutes)
  - Create `app/api/auth/login/route.ts`
  - Apply rate limiting middleware
  - Validate email and password inputs
  - Query user by email from DynamoDB
  - Verify password hash with bcrypt
  - Generate JWT token
  - Set HTTP-only cookie with token
  - Return user data (excluding password hash)
  - Return generic error for invalid credentials (don't reveal if email/password was wrong)
  - **Verification**: Use Postman to POST to `/api/auth/login` with valid credentials, verify token returned and cookie set. Try invalid credentials, verify generic error. Make 6+ rapid requests, verify rate limiting (429 status)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 7.2, 7.3_

- [ ] 8. Connect login form to real API
  - Update `components/auth/LoginForm.tsx` to call `/api/auth/login` instead of mock
  - Handle API errors (invalid credentials, rate limiting, validation errors)
  - Display appropriate error messages
  - Keep existing redirect to dashboard on success
  - **Verification**: Open `/login` in browser, login with account created in task 6, verify: (1) Successful login, (2) Redirected to dashboard, (3) Cookie set. Try wrong password, verify error message. Try 6+ rapid attempts, verify rate limit message
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.4, 8.5_

- [ ] 9. Implement authentication middleware and context
  - Create `lib/middleware/withAuth.ts` that validates JWT tokens from cookies and extracts userId
  - Handle missing, invalid, and expired tokens with appropriate errors
  - Create `contexts/AuthContext.tsx` with React Context for managing auth state
  - Provide `useAuth()` hook for accessing current user and auth status
  - Validate token on app load and fetch user data
  - Handle automatic redirect to login for expired/invalid tokens
  - **Verification**: Add `useAuth()` to a test component, verify it returns null when not logged in. Login via `/login`, verify `useAuth()` returns user data. Clear cookie, verify redirect to login
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 10. Implement logout API endpoint
  - Create `app/api/auth/logout/route.ts`
  - Clear authentication cookie
  - Return success response
  - **Verification**: Use Postman with valid auth cookie to POST to `/api/auth/logout`, verify cookie is cleared in response headers
  - _Requirements: 2.1, 2.2_

- [ ] 11. Add logout functionality to dashboard
  - Create `components/auth/LogoutButton.tsx` that calls `/api/auth/logout`
  - Clear client-side auth state in AuthContext
  - Redirect to login page after logout
  - Update `app/dashboard/layout.tsx` to add LogoutButton to navigation
  - **Verification**: Login via browser, navigate to dashboard, click logout button, verify: (1) Cookie cleared in DevTools, (2) Redirected to login, (3) Cannot access dashboard without logging in again
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.2_

- [ ] 12. Protect dashboard routes with authentication
  - Update `app/dashboard/layout.tsx` to use `useAuth()` hook
  - Check for authenticated user before rendering dashboard
  - Redirect unauthenticated users to `/login`
  - Show loading state while checking authentication
  - **Verification**: Try accessing `/dashboard` without logging in, verify redirect to login. Login and verify access granted. Logout and verify redirect again
  - _Requirements: 3.6, 4.2, 4.3_

- [ ] 13. Implement profile GET API endpoint
  - Create `app/api/profile/route.ts` with GET handler
  - Apply `withAuth` middleware to validate token
  - Extract userId from validated token
  - Query user profile from DynamoDB by userId
  - Return user data (excluding password hash)
  - **Verification**: Use Postman with valid auth cookie to GET `/api/profile`, verify user data returned. Try without cookie, verify 401 error
  - _Requirements: 3.1, 3.6_

- [ ] 14. Implement profile UPDATE API endpoint
  - Add PUT handler to `app/api/profile/route.ts`
  - Apply `withAuth` middleware
  - Validate input data (email format, name length, bio length)
  - Update user record in DynamoDB
  - Update lastModified timestamp
  - Return updated user data
  - **Verification**: Use Postman with valid auth cookie to PUT `/api/profile` with `{name, email, bio}`, verify: (1) Data updated in DynamoDB, (2) lastModified timestamp updated, (3) Updated data returned. Try invalid email, verify validation error
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [ ] 15. Connect profile form to real API
  - Update `components/dashboard/ProfileForm.tsx` to fetch from GET `/api/profile` on mount
  - Update save handlers to call PUT `/api/profile` with changed data
  - Display real user data from API instead of mock data
  - Handle API errors and display validation messages
  - Keep existing success messages and UI behavior
  - Remove mock account connection logic (will be implemented separately)
  - **Verification**: Login and navigate to `/dashboard/profile`, verify: (1) Real user data loads from API, (2) Can update name/email/bio, (3) Changes persist after page refresh, (4) Validation errors display correctly
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.3, 8.4, 8.5, 8.6_

- [ ] 16. Add user data to dashboard navigation
  - Update `app/dashboard/layout.tsx` to display logged-in user's name from AuthContext
  - Show user email or name in navigation bar
  - Add link to profile page
  - **Verification**: Login and navigate to dashboard, verify user name displays in navigation. Click profile link, verify navigation to profile page
  - _Requirements: 3.1, 8.3_

- [ ] 17. Implement session persistence and token refresh
  - Update AuthContext to check token expiration on app load
  - Implement token refresh logic (optional: create refresh token endpoint)
  - Handle token expiration gracefully with redirect to login
  - Maintain session across browser tabs
  - **Verification**: Login, close browser, reopen and navigate to dashboard, verify still logged in (if token not expired). Wait for token to expire (or manually set short expiration for testing), verify automatic redirect to login
  - _Requirements: 4.1, 4.4, 4.5_

- [ ] 18. Add comprehensive error handling
  - Create centralized error handler `lib/errors.ts` with `AuthError` class
  - Update all API routes to use consistent error responses
  - Add error boundaries to catch React errors
  - Display user-friendly error messages
  - Log errors server-side for debugging
  - **Verification**: Test various error scenarios: (1) Network errors, (2) Invalid tokens, (3) Validation errors, (4) Database errors. Verify appropriate error messages display and errors are logged
  - _Requirements: 7.6_

- [ ] 19. End-to-end testing and verification
  - Test complete user flow: signup → login → dashboard → update profile → logout
  - Verify all form validations work correctly
  - Test rate limiting on login (make 6+ rapid requests)
  - Test token expiration handling
  - Verify password hashing (check DynamoDB, ensure no plain text)
  - Test error scenarios (wrong password, duplicate email, invalid data)
  - Verify all timestamps are set correctly in DynamoDB
  - **Verification**: Complete full user journey multiple times with different scenarios, verify everything works as expected with no errors
  - _Requirements: All_

- [ ] 20. Documentation and deployment preparation
  - Update README with authentication setup instructions
  - Document all environment variables in `.env.local.example`
  - Create `docs/AUTHENTICATION.md` with architecture overview
  - Document Terraform deployment steps
  - Add instructions for DynamoDB Local setup for development
  - Document how to create first admin user (if needed)
  - Add API endpoint documentation
  - **Verification**: Follow documentation to set up project from scratch on a new machine, verify all steps work correctly
  - _Requirements: 6.6_

## Notes

- Each task includes a **Verification** section with concrete steps to test the functionality
- Tasks are ordered to deliver working UI features early, then connect them to real backend
- You can see and test features in the browser after each task
- Start with mock data to get UI working, then replace with real API calls
- DynamoDB Local should be used for development to avoid AWS costs
- JWT secret must be set in production environment variables
- Each task builds on the previous one to create a complete, working authentication system
