# Requirements Document: LinkedIn OAuth 2.0 Integration

## Introduction

This document specifies the requirements for integrating LinkedIn OAuth 2.0 into the Zetca platform. The integration enables users to connect their LinkedIn accounts using the "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn" products. Once connected, users can see their LinkedIn profile (name and photo) on the dashboard, and the platform stores the necessary tokens for future LinkedIn publishing capabilities.

The integration uses LinkedIn's OpenID Connect flow with the following scopes: `openid`, `profile`, `email`, and `w_member_social`. Authentication credentials are provided via a registered LinkedIn App (Client ID and Client Secret stored in environment variables).

## Glossary

- **OAuth_Flow**: The LinkedIn OAuth 2.0 authorization code flow used to authenticate and authorize users
- **LinkedIn_App**: The registered LinkedIn application with Client ID and Client Secret for Zetca
- **Access_Token**: The token returned by LinkedIn after successful OAuth, used to call LinkedIn APIs
- **ID_Token**: A JWT returned by LinkedIn containing the user's profile claims (OpenID Connect)
- **Authorization_Code**: A temporary code returned by LinkedIn after user consent, exchanged for tokens
- **State_Parameter**: A CSRF protection value sent with the authorization request and validated on callback
- **Connected_Account**: A record linking a Zetca user to their LinkedIn profile with stored tokens
- **Person_URN**: LinkedIn's unique identifier for a member (e.g., `urn:li:person:xxxx`), needed for sharing content
- **UserInfo_Endpoint**: LinkedIn's API endpoint (`https://api.linkedin.com/v2/userinfo`) that returns member profile details
- **Callback_URL**: The redirect URI registered with LinkedIn where the authorization code is sent after user consent

## Requirements

### Requirement 1: Initiate LinkedIn OAuth Flow

**User Story:** As a user, I want to click a "Connect" button on my profile page to start the LinkedIn authorization process, so that I can link my LinkedIn account to Zetca.

#### Acceptance Criteria

1. WHEN a user clicks the LinkedIn "Connect" button on the profile page, THE system SHALL redirect the user to LinkedIn's authorization endpoint (`https://www.linkedin.com/oauth/v2/authorization`)
2. THE authorization request SHALL include the following query parameters: `response_type=code`, `client_id`, `redirect_uri`, `state`, and `scope=openid profile email w_member_social`
3. THE system SHALL generate a cryptographically random `state` parameter and store it in the user's session (HTTP-only cookie) before redirecting
4. THE `redirect_uri` SHALL point to the application's LinkedIn callback endpoint (`/api/auth/linkedin/callback`)
5. WHEN the user is already connected to LinkedIn, THE "Connect" button SHALL change to "Disconnect"

### Requirement 2: Handle LinkedIn OAuth Callback

**User Story:** As a user, after I authorize Zetca on LinkedIn, I want to be redirected back to my profile page with my LinkedIn account connected, so that I can see the connection was successful.

#### Acceptance Criteria

1. WHEN LinkedIn redirects to the callback URL with an authorization code, THE system SHALL validate the `state` parameter matches the one stored in the session
2. IF the `state` parameter does not match, THE system SHALL reject the request and redirect to the profile page with an error message
3. THE system SHALL exchange the authorization code for an access token by calling LinkedIn's token endpoint (`https://www.linkedin.com/oauth/v2/accessToken`) with `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, and `client_secret`
4. WHEN the token exchange is successful, THE system SHALL call LinkedIn's UserInfo endpoint (`https://api.linkedin.com/v2/userinfo`) to retrieve the member's profile (name, picture, email, sub)
5. THE system SHALL store the LinkedIn access token, LinkedIn `sub` (Person URN), display name, profile picture URL, and email in the user's record in DynamoDB
6. WHEN the callback processing is complete, THE system SHALL redirect the user to the profile page with a success indicator
7. IF LinkedIn returns an error during the OAuth flow (e.g., user denies consent), THE system SHALL redirect to the profile page with an appropriate error message

### Requirement 3: Display LinkedIn Connection Status on Profile

**User Story:** As a user, I want to see my LinkedIn connection status on my profile page, so that I know whether my LinkedIn account is linked to Zetca.

#### Acceptance Criteria

1. WHEN a user views the profile page, THE system SHALL fetch the user's LinkedIn connection status from the database
2. IF the user has a connected LinkedIn account, THE profile page SHALL display the LinkedIn account as "Connected" with a green status badge
3. IF the user has a connected LinkedIn account, THE profile page SHALL display the user's LinkedIn display name
4. IF the user has a connected LinkedIn account, THE profile page SHALL display the user's LinkedIn profile picture
5. IF the user does not have a connected LinkedIn account, THE profile page SHALL display the LinkedIn account as "Not connected" with a "Connect" button
6. THE connected account information SHALL be returned as part of the `/api/profile` GET response

### Requirement 4: Display Connected LinkedIn Account on Dashboard

**User Story:** As a user, I want to see my connected LinkedIn account on the dashboard, so that I have a quick overview of my linked social media accounts.

#### Acceptance Criteria

1. WHEN a user views the dashboard and has a connected LinkedIn account, THE dashboard layout SHALL display the user's LinkedIn name and profile photo in the header area
2. THE LinkedIn profile photo SHALL be displayed as a small avatar alongside the user's Zetca account info
3. IF the user does not have a connected LinkedIn account, THE dashboard SHALL not display any LinkedIn account information in the header
4. THE dashboard SHALL fetch connected account data from the existing `/api/profile` endpoint

### Requirement 5: Disconnect LinkedIn Account

**User Story:** As a user, I want to be able to disconnect my LinkedIn account from Zetca, so that I can revoke the connection if needed.

#### Acceptance Criteria

1. WHEN a user clicks the "Disconnect" button next to their connected LinkedIn account, THE system SHALL remove the LinkedIn tokens and profile data from the user's record in DynamoDB
2. AFTER disconnection, THE profile page SHALL update to show LinkedIn as "Not connected" with a "Connect" button
3. AFTER disconnection, THE dashboard SHALL no longer display the LinkedIn profile information
4. THE disconnect action SHALL require the user to be authenticated

### Requirement 6: Secure Token Storage and Environment Configuration

**User Story:** As a developer, I want LinkedIn credentials and tokens stored securely, so that user data and API keys are protected.

#### Acceptance Criteria

1. THE LinkedIn Client ID and Client Secret SHALL be stored as environment variables (`LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`), never hardcoded in source code
2. THE LinkedIn access tokens stored in DynamoDB SHALL be treated as sensitive data
3. THE OAuth callback endpoint SHALL be rate-limited to prevent abuse
4. THE system SHALL validate all data received from LinkedIn before storing it in the database
5. THE `state` parameter SHALL be validated to prevent CSRF attacks
6. THE LinkedIn callback redirect URI SHALL be configured as an environment variable (`LINKEDIN_REDIRECT_URI`) for flexibility across environments

### Requirement 7: Database Schema Updates for LinkedIn Data

**User Story:** As a developer, I want the user record to support LinkedIn connection data, so that the platform can persist and retrieve LinkedIn account information.

#### Acceptance Criteria

1. THE user record in DynamoDB SHALL support the following optional LinkedIn fields: `linkedinSub`, `linkedinAccessToken`, `linkedinName`, `linkedinPictureUrl`, `linkedinEmail`, `linkedinConnectedAt`
2. THE UserRepository SHALL provide a method to update LinkedIn-specific fields on a user record
3. THE UserRepository SHALL provide a method to clear LinkedIn-specific fields (for disconnect)
4. THE `/api/profile` GET endpoint SHALL include LinkedIn connection data in its response (excluding the access token)
5. THE LinkedIn access token SHALL NOT be exposed in any API response to the frontend
