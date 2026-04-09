# Implementation Plan: Publisher Agent Backend

## Overview

This plan implements the Publisher Agent Backend incrementally, starting with infrastructure and data models, then building the LinkedIn client, repositories, service layer, background scanner, and API endpoints. Each phase builds on the previous one and ends with a checkpoint. Property-based tests are placed close to the code they validate.

## Tasks

### Phase 1: Infrastructure and Configuration

- [x] 1. Provision publish-log DynamoDB table and update config
  - [x] 1.1 Create `terraform/publish-log-table.tf`
    - Define `aws_dynamodb_table` resource named `publish-log-${var.environment}`
    - Set `logId` as partition key (String)
    - Add `PostIdIndex` GSI with `postId` as hash key
    - Add `UserIdIndex` GSI with `userId` as hash key and `attemptedAt` as range key
    - Use PAY_PER_REQUEST billing mode
    - Enable point-in-time recovery and server-side encryption
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 1.2 Add publisher settings to `python/config.py`
    - Add `dynamodb_publish_log_table: str = "publish-log-dev"`
    - Add `publisher_scan_interval_seconds: int = 60`
    - Add `linkedin_api_timeout_seconds: int = 30`
    - Add `publisher_enabled: bool = True`
    - Add `s3_media_bucket: str = "zetca-post-media-dev"`
    - Add `dynamodb_media_table: str = "post-media-dev"`
    - _Requirements: 8.7, 8.8, 8.9, 15.5, 15.6_

### Phase 2: Pydantic Models

- [x] 2. Define publisher Pydantic models
  - [x] 2.1 Create `python/models/publisher.py`
    - Define `PublishLogRecord` with fields: log_id, post_id, user_id, platform, status, linkedin_post_id, error_code, error_message, attempted_at
    - Add `@field_validator` on status to accept only "published", "failed", "skipped"
    - Define `LinkedInPostRequest` with fields: author, commentary, visibility, distribution, lifecycle_state, is_reshare_disabled_by_author, content (Optional)
    - Define `LinkedInPostResponse` with fields: status_code, post_id, error_code, error_message
    - Define `LinkedInImageUploadResponse` with fields: upload_url, image_urn
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 2.2 Write property test: PublishLogRecord completeness and validation
    - **Property 11: Publish Log Record Completeness and Validation**
    - Generate random publish outcomes and verify all required fields are present
    - Generate random status strings and verify only "published", "failed", "skipped" pass validation
    - **Validates: Requirements 6.2, 10.5**

### Phase 3: LinkedIn Client

- [x] 3. Implement LinkedIn API client
  - [x] 3.1 Create `python/services/linkedin_client.py`
    - Implement `LinkedInClient` class with configurable timeout
    - Implement `_headers(access_token)` returning Authorization, Linkedin-Version, X-Restli-Protocol-Version, Content-Type headers
    - Implement `format_commentary(content, hashtags)` that appends hashtags prefixed with "#" to content, returns content unchanged when hashtags is empty
    - Implement `create_text_post(access_token, person_urn, commentary)` sending POST to LinkedIn Posts API, returning `LinkedInPostResponse` with post ID from `x-restli-id` header
    - Implement `initialize_image_upload(access_token, person_urn)` sending POST to LinkedIn Images API, returning `LinkedInImageUploadResponse`
    - Implement `upload_image_binary(upload_url, image_data, content_type)` sending PUT to upload URL
    - Implement `create_image_post(access_token, person_urn, commentary, image_urn)` sending POST with `content.media.id` field
    - Use `httpx.AsyncClient` with configured timeout for all requests
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.2, 3.3, 3.4, 3.5, 5.7_

  - [x] 3.2 Write property test: Commentary formatting with hashtags
    - **Property 4: Commentary Formatting with Hashtags**
    - Generate random content strings and hashtag lists
    - Verify: empty hashtags → content unchanged; non-empty → appended with "#" prefix; no double "#" prefix
    - **Validates: Requirements 12.1, 12.2, 12.3, 2.3, 9.8**

  - [x] 3.3 Write property test: LinkedIn request headers and author URN
    - **Property 5: LinkedIn Request Headers and Author URN**
    - Generate random access tokens and linkedinSub values
    - Verify headers contain correct Authorization, Linkedin-Version, X-Restli-Protocol-Version, Content-Type
    - Verify author field equals `urn:li:person:{linkedinSub}`
    - **Validates: Requirements 2.2, 2.5, 9.6, 9.7**

  - [x] 3.4 Write property test: Text vs image post routing
    - **Property 6: Text vs Image Post Routing**
    - Generate random posts with and without mediaId
    - Verify text-only path when mediaId is null, image path when mediaId is present
    - Verify both paths produce requests with identical base fields
    - **Validates: Requirements 2.1, 3.1, 3.4, 3.5**

  - [x] 3.5 Write property test: LinkedIn error code mapping
    - **Property 7: LinkedIn Error Code Mapping**
    - Generate random LinkedIn error status codes (400, 401, 403, 500, 503, network error)
    - Verify correct errorCode mapping: 401→token_expired, 403→access_denied, 400→validation_error, 500/503→linkedin_server_error, network→network_error
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5, 5.6**

- [x] 4. Checkpoint - Verify models and LinkedIn client
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: Repositories

- [x] 5. Create user and media repositories
  - [x] 5.1 Create `python/repositories/user_repository.py`
    - Implement `UserRepository` class with read-only access to users DynamoDB table
    - Implement `get_user_linkedin_credentials(user_id)` returning linkedinAccessToken, linkedinSub, linkedinName
    - Use `dynamodb_users_table` setting for table name
    - No write methods (user management stays in Next.js)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 5.2 Create `python/repositories/media_repository.py`
    - Implement `MediaRepository` class with read-only access to post-media DynamoDB table
    - Implement `get_media_by_id(media_id)` returning s3Key, contentType, mediaType
    - Use `dynamodb_media_table` setting for table name
    - _Requirements: 15.1_

- [x] 6. Create publisher repository
  - [x] 6.1 Create `python/repositories/publisher_repository.py`
    - Implement `PublisherRepository` class for publish-log DynamoDB table
    - Implement `create_log(record)` to store a PublishLogRecord
    - Implement `list_logs_by_user(user_id)` querying UserIdIndex, sorted by attemptedAt descending
    - Implement `list_logs_by_post(post_id)` querying PostIdIndex
    - Implement `get_post_owner(post_id)` to retrieve userId from scheduled-posts table for access control
    - Implement `_record_to_item()` and `_item_to_record()` conversion helpers
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 6.2 Write property test: User isolation on publish logs
    - **Property 12: User Isolation on Publish Logs**
    - Generate log records for multiple users
    - Verify querying for User A returns only User A's records
    - Verify querying a post owned by User B as User A results in 403
    - **Validates: Requirements 7.1, 7.3, 11.1, 11.2**

### Phase 5: Publisher Service

- [ ] 7. Implement publisher service
  - [ ] 7.1 Create `python/services/publisher_service.py`
    - Implement `PublisherService` class with injected dependencies: LinkedInClient, PublisherRepository, SchedulerRepository, UserRepository, MediaRepository, S3 client
    - Implement `get_due_posts()` querying scheduled-posts table for posts where status="scheduled", platform="linkedin", scheduledDate+scheduledTime <= now UTC
    - Implement `publish_post(post, user_credentials)` orchestrating the full publish flow:
      - Format commentary with hashtags via LinkedInClient
      - If mediaId present: retrieve media record, download from S3, upload to LinkedIn, create image post
      - If no mediaId: create text-only post
      - On 201: update post status to "published", create success log with LinkedIn post ID from x-restli-id
      - On error: create failure log with mapped error code, leave post status unchanged
      - On media record not found: log warning, publish as text-only
      - On S3 download failure: log error, skip post
    - Implement `run_scan_cycle(processing_post_ids)`:
      - Query due posts, filter out already-processing IDs
      - Group by userId, process sequentially per user
      - Fetch LinkedIn credentials per user; skip all user posts if missing
      - On 429: skip remaining posts for that user
      - Remove processed IDs from processing set
    - Implement `_download_from_s3(s3_key)` returning bytes or None
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.3, 6.4, 6.5, 15.1, 15.2, 15.3, 15.4_

  - [ ]* 7.2 Write property test: Due post filter correctness
    - **Property 1: Due Post Filter Correctness**
    - Generate random lists of posts with varying statuses, platforms, and times
    - Verify filter returns exactly posts where status="scheduled", platform="linkedin", time <= now
    - **Validates: Requirements 1.1**

  - [ ]* 7.3 Write property test: Fault isolation across posts
    - **Property 2: Fault Isolation Across Posts**
    - Generate lists of posts with random success/failure outcomes
    - Verify successful posts are published regardless of other failures
    - **Validates: Requirements 1.3**

  - [ ]* 7.4 Write property test: Concurrency guard skips in-progress posts
    - **Property 3: Concurrency Guard Skips In-Progress Posts**
    - Generate sets of due post IDs and processing post IDs
    - Verify attempted set is disjoint from processing set
    - **Validates: Requirements 1.5**

  - [ ]* 7.5 Write property test: Rate limit skips remaining user posts
    - **Property 8: Rate Limit Skips Remaining User Posts**
    - Generate lists of posts per user with a 429 at a random position
    - Verify subsequent posts for that user are skipped, other users unaffected
    - **Validates: Requirements 5.3**

  - [ ]* 7.6 Write property test: Missing credentials produces skipped log
    - **Property 9: Missing Credentials Produces Skipped Log**
    - Generate user records with missing LinkedIn fields
    - Verify correct skip reason: linkedin_not_connected or linkedin_sub_missing
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 7.7 Write property test: Successful publish transitions status and creates log
    - **Property 10: Successful Publish Transitions Status and Creates Log**
    - Generate successful publish scenarios
    - Verify post status → "published" and log contains linkedinPostId
    - **Validates: Requirements 2.6, 2.7, 6.3**

- [ ] 8. Checkpoint - Verify publisher service logic
  - Ensure all tests pass, ask the user if questions arise.

### Phase 6: Background Scanner

- [ ] 9. Implement publish scanner background task
  - [ ] 9.1 Create `python/services/publish_scanner.py`
    - Implement `PublishScanner` class with injected `PublisherService`
    - Use configurable interval from `publisher_scan_interval_seconds` setting
    - Implement `start()` creating an asyncio background task
    - Implement `stop()` gracefully cancelling the task
    - Implement `_run_loop()` that calls `run_scan_cycle()`, catches unhandled exceptions (logs and continues), then sleeps for the configured interval
    - Maintain a `_processing_post_ids` set for concurrency guard
    - _Requirements: 1.2, 1.5, 14.1, 14.2, 14.3, 14.4_

  - [ ] 9.2 Register scanner in `python/main.py`
    - Import publisher routes and include router
    - Add startup event handler: if `publisher_enabled`, instantiate LinkedInClient, all repositories, PublisherService, PublishScanner, and call `scanner.start()`
    - Add shutdown event handler: call `scanner.stop()`
    - _Requirements: 7.5, 14.1, 14.4, 14.5_

### Phase 7: API Endpoints and Manual Publish

- [ ] 10. Implement publisher API routes
  - [ ] 10.1 Create `python/routes/publisher.py`
    - Create FastAPI router with prefix `/api/publisher`
    - Implement `GET /logs` returning all PublishLogRecords for authenticated user, ordered by attemptedAt descending
    - Implement `GET /logs/{post_id}` returning all PublishLogRecords for a specific post
    - Implement `POST /publish/{post_id}` for on-demand manual publishing:
      - Verify post exists and belongs to authenticated user (404/403)
      - Verify post platform is "linkedin" (400 if not)
      - Verify post is not already published (400 if already published)
      - Fetch user LinkedIn credentials, publish via PublisherService.publish_post()
      - Return the PublishLogRecord
    - Enforce JWT authentication via `auth_middleware.get_current_user` dependency
    - Return 403 when user requests logs for a post belonging to a different user
    - Return 401 when no valid JWT is provided
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 11.1, 11.2, 11.3, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_

- [ ] 11. Checkpoint - Verify API endpoints and manual publish
  - Ensure all tests pass, ask the user if questions arise.

### Phase 8: Frontend Integration

- [ ] 12. Create publisher API client and wire PostsTable to backend
  - [ ] 12.1 Create `lib/api/publisherClient.ts`
    - Export `PublisherAPIError` class for typed error handling
    - Export `publishPost(postId)` calling `POST /api/publisher/publish/{postId}`
    - Export `listLogs()` calling `GET /api/publisher/logs`
    - Export `listLogsByPost(postId)` calling `GET /api/publisher/logs/{postId}`
    - Follow same patterns as `schedulerClient.ts` (getAuthToken, createAuthHeaders, handleAuthError)
    - Handle 401 by clearing token and redirecting to login
    - _Requirements: 17.7, 17.8_

  - [ ] 12.2 Update `components/dashboard/PostsTable.tsx` to use real API data
    - Replace `mockPostsData` import with `schedulerClient.listPosts()` API call on mount
    - Replace local `handlePublish` with `publisherClient.publishPost(postId)` API call
    - Add loading/disabled state on the Publish button during API call
    - Show error message if publish fails
    - Refresh post list after successful publish to reflect updated status
    - Show Publish button for "scheduled" and "draft" posts with platform "linkedin"
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

- [ ] 13. Final checkpoint - Full system verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The design uses Python (FastAPI, httpx, Pydantic, boto3) throughout
- All property tests go in `python/tests/test_publisher_properties.py` using `hypothesis` with `@settings(max_examples=100)`
