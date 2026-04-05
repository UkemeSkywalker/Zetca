# Requirements Document: Publisher Agent Backend

## Introduction

The Publisher Agent Backend automates the publishing of scheduled social media posts to LinkedIn. It operates as a background process within the existing Python FastAPI service, periodically scanning the `scheduled-posts` DynamoDB table for posts whose scheduled date and time have passed and whose status is "scheduled". For each due post, the Publisher retrieves the user's LinkedIn access token from the users DynamoDB table, constructs the appropriate LinkedIn API request (text-only or with image), and publishes the post. Upon successful publication, the post status transitions from "scheduled" to "published". For image posts, the Publisher downloads the image from S3, uploads it to LinkedIn via the Images API to obtain an image URN, then creates the post referencing that URN. The system maintains a publish log in DynamoDB for auditing and debugging. Only LinkedIn is supported initially; other platforms will be added incrementally. The Publisher handles LinkedIn API errors (rate limiting, token expiry, validation errors) gracefully, with retry logic and structured error logging.

## Glossary

- **Publisher_Service**: The Python service layer responsible for orchestrating the publishing workflow: scanning for due posts, calling the LinkedIn API, updating post status, and logging results
- **Publish_Scanner**: The background process that periodically queries the Scheduled_Posts_Table for posts due to be published (status="scheduled", platform="linkedin", scheduledDate+scheduledTime in the past)
- **LinkedIn_Client**: A Python module that encapsulates all LinkedIn REST API interactions including post creation, image upload initialization, and image binary upload
- **Publish_Log**: A DynamoDB table that records the outcome of each publish attempt, including success/failure status, LinkedIn post ID, error details, and timestamps
- **Publish_Log_Record**: A single entry in the Publish_Log table representing one publish attempt for a specific scheduled post
- **Scheduled_Posts_Table**: The existing DynamoDB table (`scheduled-posts-{environment}`) storing all scheduled post records
- **Users_Table**: The existing DynamoDB table storing user records, including LinkedIn OAuth tokens (`linkedinAccessToken`) and LinkedIn person URN (`linkedinSub`)
- **LinkedIn_Posts_API**: The LinkedIn REST API endpoint (`POST https://api.linkedin.com/rest/posts`) used to create posts on LinkedIn
- **LinkedIn_Images_API**: The LinkedIn REST API endpoint (`POST https://api.linkedin.com/rest/images?action=initializeUpload`) used to initialize image uploads, followed by a PUT to the returned upload URL
- **Image_URN**: The LinkedIn identifier for an uploaded image (e.g., `urn:li:image:C4E10AQFoyyAjHPMQuQ`), used to attach images to posts
- **Person_URN**: The LinkedIn member identifier formatted as `urn:li:person:{linkedinSub}`, used as the `author` field when creating posts
- **Post_Status**: The lifecycle state of a scheduled post: "draft", "scheduled", or "published"
- **S3_Media_Bucket**: The existing S3 bucket (`zetca-post-media-{environment}`) storing uploaded media files referenced by scheduled posts
- **Media_Record**: The existing DynamoDB record in the `post-media-{environment}` table containing metadata about an uploaded media file, including its S3 key and content type
- **Python_Service**: The existing FastAPI application hosting strategy, copy, and scheduler agents

## Requirements

### Requirement 1: Scan for Due Scheduled Posts

**User Story:** As a platform operator, I want the system to automatically detect scheduled posts that are due for publishing, so that posts go live at the times users selected without manual intervention.

#### Acceptance Criteria

1. THE Publish_Scanner SHALL query the Scheduled_Posts_Table for posts where status equals "scheduled", platform equals "linkedin", and the combination of scheduledDate and scheduledTime is at or before the current UTC date and time
2. THE Publish_Scanner SHALL execute on a configurable interval, defaulting to every 60 seconds
3. WHEN the Publish_Scanner finds due posts, THE Publisher_Service SHALL process each post individually so that a failure on one post does not prevent other due posts from being published
4. THE Publish_Scanner SHALL use the UserIdIndex GSI to efficiently query posts grouped by user
5. WHILE the Publish_Scanner is processing a batch of due posts, THE Publish_Scanner SHALL skip posts that are already being processed by a concurrent scan cycle

### Requirement 2: Publish Text-Only Posts to LinkedIn

**User Story:** As a user, I want my scheduled text posts to be automatically published to LinkedIn when the scheduled time arrives, so that my content goes live without manual effort.

#### Acceptance Criteria

1. WHEN a due scheduled post has no media attachment (mediaId is null), THE Publisher_Service SHALL create a text-only post on LinkedIn using the LinkedIn_Posts_API
2. THE LinkedIn API request SHALL include the `author` field set to `urn:li:person:{linkedinSub}` retrieved from the Users_Table for the post's userId
3. THE LinkedIn API request SHALL include the `commentary` field set to the post content with hashtags appended
4. THE LinkedIn API request SHALL include `visibility` set to "PUBLIC", `lifecycleState` set to "PUBLISHED", and `distribution` with `feedDistribution` set to "MAIN_FEED"
5. THE LinkedIn API request SHALL include the headers `Authorization: Bearer {linkedinAccessToken}`, `Linkedin-Version: 202603`, `X-Restli-Protocol-Version: 2.0.0`, and `Content-Type: application/json`
6. WHEN LinkedIn returns a 201 status, THE Publisher_Service SHALL extract the LinkedIn post ID from the `x-restli-id` response header
7. WHEN LinkedIn returns a 201 status, THE Publisher_Service SHALL update the scheduled post status from "scheduled" to "published" in the Scheduled_Posts_Table

### Requirement 3: Publish Image Posts to LinkedIn

**User Story:** As a user, I want my scheduled posts with image attachments to be published to LinkedIn with the image included, so that my visual content appears alongside the post text.

#### Acceptance Criteria

1. WHEN a due scheduled post has a media attachment (mediaId is not null) with mediaType "image", THE Publisher_Service SHALL download the image from the S3_Media_Bucket using the s3Key from the Media_Record
2. WHEN the image is downloaded, THE Publisher_Service SHALL call the LinkedIn_Images_API to initialize an upload with the `owner` field set to `urn:li:person:{linkedinSub}`
3. WHEN LinkedIn returns the upload URL and Image_URN, THE Publisher_Service SHALL upload the image binary to the provided upload URL using an HTTP PUT request
4. WHEN the image upload completes, THE Publisher_Service SHALL create a post on LinkedIn using the LinkedIn_Posts_API with the `content.media.id` field set to the returned Image_URN
5. THE image post request SHALL include the same author, commentary, visibility, distribution, and header fields as a text-only post
6. IF the image download from S3 fails, THEN THE Publisher_Service SHALL log the error and skip the post without updating its status
7. IF the LinkedIn image upload initialization fails, THEN THE Publisher_Service SHALL log the error and skip the post without updating its status
8. IF the image binary upload to LinkedIn fails, THEN THE Publisher_Service SHALL log the error and skip the post without updating its status

### Requirement 4: Retrieve User LinkedIn Credentials

**User Story:** As a platform operator, I want the publisher to securely retrieve each user's LinkedIn credentials from the database, so that posts are published on behalf of the correct LinkedIn account.

#### Acceptance Criteria

1. WHEN the Publisher_Service processes a due post, THE Publisher_Service SHALL retrieve the user's `linkedinAccessToken` and `linkedinSub` from the Users_Table using the post's userId
2. IF the user record does not have a `linkedinAccessToken` (LinkedIn not connected), THEN THE Publisher_Service SHALL skip the post, log a warning, and create a Publish_Log_Record with status "skipped" and reason "linkedin_not_connected"
3. IF the user record does not have a `linkedinSub`, THEN THE Publisher_Service SHALL skip the post, log a warning, and create a Publish_Log_Record with status "skipped" and reason "linkedin_sub_missing"
4. THE Publisher_Service SHALL NOT cache LinkedIn access tokens beyond the scope of a single publish cycle

### Requirement 5: Handle LinkedIn API Errors

**User Story:** As a platform operator, I want the publisher to handle LinkedIn API errors gracefully, so that transient failures are retried and permanent failures are logged without disrupting other posts.

#### Acceptance Criteria

1. IF LinkedIn returns a 401 (EMPTY_ACCESS_TOKEN) error, THEN THE Publisher_Service SHALL log the error, create a Publish_Log_Record with status "failed" and reason "token_expired", and skip the post without updating its status
2. IF LinkedIn returns a 403 (ACCESS_DENIED) error, THEN THE Publisher_Service SHALL log the error, create a Publish_Log_Record with status "failed" and reason "access_denied", and skip the post
3. IF LinkedIn returns a 429 (TOO_MANY_REQUESTS) error, THEN THE Publisher_Service SHALL log the error, create a Publish_Log_Record with status "failed" and reason "rate_limited", and skip the remaining posts for that user in the current cycle
4. IF LinkedIn returns a 400 error, THEN THE Publisher_Service SHALL log the error details including the LinkedIn error code, create a Publish_Log_Record with status "failed" and the specific error reason, and skip the post
5. IF LinkedIn returns a 500 or 503 error, THEN THE Publisher_Service SHALL log the error, create a Publish_Log_Record with status "failed" and reason "linkedin_server_error", and skip the post for retry in the next cycle
6. IF a network error occurs when calling the LinkedIn API, THEN THE Publisher_Service SHALL log the error, create a Publish_Log_Record with status "failed" and reason "network_error", and skip the post for retry in the next cycle
7. THE Publisher_Service SHALL set a request timeout of 30 seconds for all LinkedIn API calls

### Requirement 6: Maintain Publish Log

**User Story:** As a platform operator, I want a log of all publish attempts, so that I can audit publishing activity and debug failures.

#### Acceptance Criteria

1. THE system SHALL store Publish_Log_Records in a DynamoDB table named `publish-log-{environment}`
2. EACH Publish_Log_Record SHALL include: logId (unique identifier), postId (reference to the scheduled post), userId, platform, status ("published", "failed", "skipped"), linkedinPostId (when successful), errorCode (when failed), errorMessage (when failed), attemptedAt (ISO 8601 timestamp)
3. WHEN a post is successfully published, THE Publisher_Service SHALL create a Publish_Log_Record with status "published" and the LinkedIn post ID
4. WHEN a post fails to publish, THE Publisher_Service SHALL create a Publish_Log_Record with status "failed", the error code, and a descriptive error message
5. WHEN a post is skipped (e.g., LinkedIn not connected), THE Publisher_Service SHALL create a Publish_Log_Record with status "skipped" and the skip reason
6. THE Publish_Log table SHALL have a Global Secondary Index on postId to enable querying all attempts for a specific post
7. THE Publish_Log table SHALL have a Global Secondary Index on userId with attemptedAt as range key to enable querying a user's publish history in chronological order

### Requirement 7: Provide Publish Log API Endpoints

**User Story:** As a user, I want to view the publishing history for my scheduled posts, so that I can see which posts were published successfully and which failed.

#### Acceptance Criteria

1. THE Python_Service SHALL provide a GET endpoint at /api/publisher/logs that returns all Publish_Log_Records for the authenticated user, ordered by attemptedAt descending
2. THE Python_Service SHALL provide a GET endpoint at /api/publisher/logs/{postId} that returns all Publish_Log_Records for a specific post
3. WHEN a user requests logs for a post that belongs to a different user, THE API endpoint SHALL return a 403 error
4. WHEN accessing any publisher endpoint without valid JWT authentication, THE system SHALL return a 401 error
5. THE Python_Service SHALL register publisher routes alongside existing strategy, copy, and scheduler routes in the FastAPI application

### Requirement 8: Configure Publisher Infrastructure

**User Story:** As a developer, I want the publisher's DynamoDB table and configuration properly defined, so that the infrastructure is consistent across environments.

#### Acceptance Criteria

1. THE Terraform configuration SHALL provision a DynamoDB table named `publish-log-{environment}` with `logId` as the partition key
2. THE Publish_Log table SHALL have a Global Secondary Index named PostIdIndex with `postId` as hash key
3. THE Publish_Log table SHALL have a Global Secondary Index named UserIdIndex with `userId` as hash key and `attemptedAt` as range key
4. THE Publish_Log table SHALL use PAY_PER_REQUEST billing mode
5. THE Publish_Log table SHALL have point-in-time recovery enabled
6. THE Publish_Log table SHALL have server-side encryption enabled
7. THE Settings class in python/config.py SHALL include a `dynamodb_publish_log_table` field with a default value of "publish-log-dev"
8. THE Settings class in python/config.py SHALL include a `publisher_scan_interval_seconds` field with a default value of 60
9. THE Settings class in python/config.py SHALL include a `linkedin_api_timeout_seconds` field with a default value of 30


### Requirement 9: Build LinkedIn API Client Module

**User Story:** As a developer, I want a dedicated LinkedIn API client module, so that all LinkedIn API interactions are encapsulated in one place with proper versioning, headers, and error handling.

#### Acceptance Criteria

1. THE LinkedIn_Client SHALL be a Python module at `python/services/linkedin_client.py`
2. THE LinkedIn_Client SHALL include a method to create a text-only post that sends a POST request to `https://api.linkedin.com/rest/posts` with the required headers and body
3. THE LinkedIn_Client SHALL include a method to initialize an image upload that sends a POST request to `https://api.linkedin.com/rest/images?action=initializeUpload`
4. THE LinkedIn_Client SHALL include a method to upload image binary data to a provided upload URL using an HTTP PUT request
5. THE LinkedIn_Client SHALL include a method to create an image post that includes the `content.media.id` field with the Image_URN
6. THE LinkedIn_Client SHALL include the `Linkedin-Version: 202603` header on all API requests
7. THE LinkedIn_Client SHALL include the `X-Restli-Protocol-Version: 2.0.0` header on all API requests
8. THE LinkedIn_Client SHALL format hashtags from the post's hashtags list into the commentary text (e.g., appending `#coding #tech` to the post content)
9. THE LinkedIn_Client SHALL return structured response objects containing the HTTP status code, LinkedIn post ID (on success), and error details (on failure)

### Requirement 10: Define Pydantic Models for Publisher Data

**User Story:** As a developer, I want well-defined Pydantic models for publisher data, so that input validation, output serialization, and type safety are enforced throughout the publishing system.

#### Acceptance Criteria

1. THE system SHALL define a PublishLogRecord Pydantic model with fields: log_id (str), post_id (str), user_id (str), platform (str), status (str: "published", "failed", "skipped"), linkedin_post_id (Optional[str]), error_code (Optional[str]), error_message (Optional[str]), attempted_at (datetime)
2. THE system SHALL define a LinkedInPostRequest Pydantic model with fields: author (str), commentary (str), visibility (str), distribution (dict), lifecycle_state (str), is_reshare_disabled_by_author (bool), content (Optional[dict] for image posts)
3. THE system SHALL define a LinkedInPostResponse Pydantic model with fields: status_code (int), post_id (Optional[str]), error_code (Optional[str]), error_message (Optional[str])
4. THE system SHALL define a LinkedInImageUploadResponse Pydantic model with fields: upload_url (str), image_urn (str)
5. THE PublishLogRecord status field SHALL be validated to accept only "published", "failed", or "skipped"

### Requirement 11: Enforce User Isolation for Publish Logs

**User Story:** As a user, I want my publish logs to be private and inaccessible to other users, so that my publishing history remains secure.

#### Acceptance Criteria

1. WHEN User A requests Publish_Log_Records, THE system SHALL return only records where the userId matches User A
2. WHEN User A requests Publish_Log_Records for a post belonging to User B, THE system SHALL return a 403 error
3. THE system SHALL enforce user isolation by verifying userId on all publish log read operations

### Requirement 12: Construct LinkedIn Post Commentary with Hashtags

**User Story:** As a user, I want my hashtags included in the published LinkedIn post, so that my content reaches the intended audience through hashtag discovery.

#### Acceptance Criteria

1. WHEN a scheduled post has a non-empty hashtags list, THE LinkedIn_Client SHALL append the hashtags to the commentary text separated by spaces
2. WHEN a scheduled post has an empty hashtags list, THE LinkedIn_Client SHALL use the content field as the commentary without modification
3. EACH hashtag in the list SHALL be prefixed with "#" if not already prefixed
4. THE combined commentary (content plus hashtags) SHALL be used as the `commentary` field in the LinkedIn API request

### Requirement 13: Access User Records from Python Service

**User Story:** As a developer, I want the Python service to read user records from the existing users DynamoDB table, so that the publisher can retrieve LinkedIn credentials for each user.

#### Acceptance Criteria

1. THE system SHALL create a UserRepository class in `python/repositories/user_repository.py` that reads from the Users_Table
2. THE UserRepository SHALL provide a method to retrieve a user record by userId, returning the linkedinAccessToken, linkedinSub, and linkedinName fields
3. THE UserRepository SHALL use the `dynamodb_users_table` setting from the Settings class for the table name
4. THE UserRepository SHALL NOT provide write methods for user records (user management remains in the Next.js service)

### Requirement 14: Register Publisher as Background Task

**User Story:** As a developer, I want the publisher scanner to start automatically when the FastAPI service starts, so that publishing runs continuously without manual intervention.

#### Acceptance Criteria

1. WHEN the FastAPI application starts, THE system SHALL start the Publish_Scanner as a background asyncio task
2. THE Publish_Scanner background task SHALL run continuously, sleeping for the configured interval between scan cycles
3. IF the Publish_Scanner encounters an unhandled exception during a scan cycle, THEN THE system SHALL log the error and continue to the next cycle without crashing the application
4. WHEN the FastAPI application shuts down, THE system SHALL gracefully stop the Publish_Scanner background task
5. THE system SHALL provide a configuration flag `publisher_enabled` (default true) to enable or disable the Publish_Scanner at startup

### Requirement 15: Download Media from S3 for Image Posts

**User Story:** As a developer, I want the publisher to download media files from S3, so that images can be uploaded to LinkedIn before creating image posts.

#### Acceptance Criteria

1. WHEN a due post has a mediaId, THE Publisher_Service SHALL retrieve the Media_Record from the post-media DynamoDB table to obtain the s3Key and contentType
2. THE Publisher_Service SHALL download the image binary from the S3_Media_Bucket using the s3Key
3. IF the Media_Record does not exist for the given mediaId, THEN THE Publisher_Service SHALL log a warning and publish the post as text-only
4. IF the S3 download fails, THEN THE Publisher_Service SHALL log the error and skip the post without updating its status
5. THE Settings class in python/config.py SHALL include a `s3_media_bucket` field with a default value of "zetca-post-media-dev"
6. THE Settings class in python/config.py SHALL include a `dynamodb_media_table` field with a default value of "post-media-dev"

### Requirement 16: On-Demand Manual Publish via API

**User Story:** As a user, I want to click a "Publish" button on the Content Publisher page to immediately publish a scheduled or draft post to LinkedIn, so that I don't have to wait for the automatic scanner.

#### Acceptance Criteria

1. THE Python_Service SHALL provide a POST endpoint at /api/publisher/publish/{postId} that immediately publishes a specific post to LinkedIn
2. WHEN a user triggers manual publish, THE Publisher_Service SHALL verify the post exists and belongs to the authenticated user
3. WHEN a user triggers manual publish, THE Publisher_Service SHALL verify the post's platform is "linkedin"
4. IF the post does not exist, THEN THE API endpoint SHALL return a 404 error
5. IF the post belongs to a different user, THEN THE API endpoint SHALL return a 403 error
6. IF the post's platform is not "linkedin", THEN THE API endpoint SHALL return a 400 error with a message indicating only LinkedIn is supported
7. IF the post status is "published", THEN THE API endpoint SHALL return a 400 error indicating the post is already published
8. WHEN manual publish succeeds, THE Publisher_Service SHALL update the post status to "published" and create a Publish_Log_Record with status "published"
9. WHEN manual publish fails, THE Publisher_Service SHALL create a Publish_Log_Record with status "failed" and return the error details to the user
10. THE manual publish endpoint SHALL require valid JWT authentication

### Requirement 17: Integrate Publisher Page with Backend API

**User Story:** As a user, I want the Content Publisher page to load real posts from the backend and the Publish button to trigger actual LinkedIn publishing, so that the page reflects my real content pipeline.

#### Acceptance Criteria

1. THE PostsTable component SHALL fetch posts from the scheduler API (`schedulerClient.listPosts()`) on mount instead of loading mock data
2. THE PostsTable component SHALL display all posts (draft, scheduled, published) with their real status from the API
3. WHEN a user clicks the "Publish" button on a scheduled or draft post, THE PostsTable SHALL call the publisher API endpoint (`POST /api/publisher/publish/{postId}`) to publish the post to LinkedIn
4. WHILE a publish operation is in progress, THE PostsTable SHALL show a loading state on the Publish button and disable it
5. WHEN a publish operation succeeds, THE PostsTable SHALL update the post's status to "published" in the UI
6. IF a publish operation fails, THE PostsTable SHALL display an error message to the user
7. THE PostsTable SHALL create a `publisherClient.ts` API client in `lib/api/` following the same patterns as `schedulerClient.ts`
8. THE publisherClient SHALL export functions for: `publishPost(postId)`, `listLogs()`, and `listLogsByPost(postId)`
