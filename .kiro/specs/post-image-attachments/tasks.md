# Implementation Plan: Post Image Attachments

## Overview

Add media attachment capabilities (images and videos) to scheduled posts. The implementation follows a bottom-up approach: infrastructure → types/validation → repository → API routes → API client → frontend components → integration → type updates for existing models.

## Tasks

- [x] 1. Install dependencies and provision infrastructure
  - [x] 1.1 Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` npm packages
    - Run `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
    - _Requirements: 3.1, 3.2, 4.1_

  - [x] 1.2 Create S3 bucket Terraform configuration
    - Create `terraform/post-media-bucket.tf`
    - Provision S3 bucket named `zetca-post-media-{environment}` with AES-256 encryption
    - Add `aws_s3_bucket_public_access_block` to block all public access
    - Add lifecycle rule to transition objects to Infrequent Access after 90 days
    - Add CORS configuration for browser PUT uploads
    - Output the bucket name
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.3 Create DynamoDB media table Terraform configuration
    - Create `terraform/post-media-table.tf`
    - Provision DynamoDB table `post-media-{environment}` with `mediaId` (S) as hash key
    - Add GSI `UserIdIndex` with `userId` (S) hash key and `createdAt` (S) range key
    - PAY_PER_REQUEST billing, point-in-time recovery enabled
    - _Requirements: 2.1, 2.2_

- [ ] 2. Define types, constants, and shared validation
  - [ ] 2.1 Create `types/media.ts` with MediaRecord interface and constants
    - Define `MediaRecord` interface with all fields: mediaId, userId, s3Key, contentType, fileSize, mediaType, width, height, originalFilename, createdAt
    - Define `AllowedContentType` union type and `ALLOWED_CONTENT_TYPES` array
    - Define `MAX_IMAGE_SIZE` (10 MB), `MAX_VIDEO_SIZE` (100 MB)
    - Define `UPLOAD_URL_EXPIRY_IMAGE` (300s), `UPLOAD_URL_EXPIRY_VIDEO` (900s), `DOWNLOAD_URL_EXPIRY` (3600s)
    - _Requirements: 2.3, 2.4, 3.5, 5.1, 5.2_

  - [ ] 2.2 Create `lib/media/validation.ts` with shared validation functions
    - Implement `isAllowedContentType(contentType: string): boolean`
    - Implement `getMediaType(contentType: string): 'image' | 'video'`
    - Implement `getMaxFileSize(mediaType: 'image' | 'video'): number`
    - Implement `validateFileSize(fileSize: number, mediaType: 'image' | 'video'): boolean`
    - Implement `generateS3Key(userId: string, mediaId: string, filename: string): string`
    - _Requirements: 3.3, 3.5, 3.6, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 2.3 Write property tests for content type validation
    - **Property 1: Content type validation**
    - **Validates: Requirements 3.5, 3.7**

  - [ ]* 2.4 Write property tests for media type derivation
    - **Property 2: Media type derivation from content type prefix**
    - **Validates: Requirements 2.4, 3.6**

  - [ ]* 2.5 Write property tests for presigned URL expiry values
    - **Property 3: Presigned URL expiry matches media type**
    - **Validates: Requirements 3.1, 3.2, 4.1**

  - [ ]* 2.6 Write property tests for S3 key format
    - **Property 4: S3 key format**
    - **Validates: Requirements 3.3**

  - [ ]* 2.7 Write property tests for file size validation
    - **Property 5: File size validation by media type**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [ ]* 2.8 Write property tests for client-server validation consistency
    - **Property 6: Client-server validation consistency**
    - **Validates: Requirements 5.5, 5.6**

- [ ] 3. Update application config and create media repository
  - [ ] 3.1 Add `s3MediaBucket` and `dynamoDbMediaTableName` to `lib/config.ts`
    - Add `s3MediaBucket` field reading from `S3_MEDIA_BUCKET` env var
    - Add `dynamoDbMediaTableName` field reading from `DYNAMODB_MEDIA_TABLE_NAME` env var
    - Update the `Config` interface accordingly
    - _Requirements: 2.5_

  - [ ] 3.2 Create `lib/db/mediaRepository.ts` following `userRepository.ts` pattern
    - Implement `MediaRepository` class with DynamoDBDocumentClient
    - Implement `createMedia(record: MediaRecord): Promise<MediaRecord>`
    - Implement `getMediaById(mediaId: string): Promise<MediaRecord | null>`
    - Implement `getMediaByUser(userId: string): Promise<MediaRecord[]>`
    - Implement `deleteMedia(mediaId: string): Promise<void>`
    - _Requirements: 2.3, 3.8, 10.1_

  - [ ]* 3.3 Write property test for media record completeness
    - **Property 8: Media record completeness**
    - **Validates: Requirements 2.3, 3.8**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement media API routes
  - [ ] 5.1 Create `app/api/media/upload-url/route.ts` (POST)
    - Use `withAuth` middleware for JWT authentication
    - Accept `contentType`, `filename`, `fileSize` in request body
    - Validate content type against allowed list, return 400 if invalid
    - Derive `mediaType` from content type prefix
    - Validate file size against media-type-specific limit, return 400 if too large
    - Validate file size is a positive integer, return 400 if invalid
    - Generate S3 key as `{userId}/{mediaId}/{filename}`
    - Create MediaRecord in DynamoDB via MediaRepository
    - Generate presigned PUT URL with correct expiry (5 min images, 15 min videos)
    - Return `{ uploadUrl, mediaId, s3Key }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 5.1, 5.2, 5.3, 5.4_

  - [ ] 5.2 Create `app/api/media/[mediaId]/download-url/route.ts` (GET)
    - Use `withAuth` middleware
    - Look up MediaRecord by mediaId, return 404 if not found
    - Verify ownership (userId matches), return 403 if not owner
    - Generate presigned GET URL valid for 60 minutes
    - Return `{ downloadUrl, mediaId, contentType, mediaType }`
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 5.3 Create `app/api/media/[mediaId]/route.ts` (DELETE)
    - Use `withAuth` middleware
    - Look up MediaRecord, return 404 if not found, 403 if not owner
    - Clear `media_id` from any ScheduledPostRecords referencing this media
    - Delete S3 object using DeleteObjectCommand
    - Delete MediaRecord from DynamoDB
    - Return `{ success: true }`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 5.4 Create `app/api/media/[mediaId]/validate/route.ts` (POST)
    - Use `withAuth` middleware
    - Look up MediaRecord, return 400 if not found or not owned by user
    - Return `{ valid: true, mediaId, mediaType }`
    - _Requirements: 6.3, 6.4_

  - [ ]* 5.5 Write property test for user isolation
    - **Property 7: User isolation for media access**
    - **Validates: Requirements 4.3, 6.3, 10.5**

  - [ ]* 5.6 Write property test for media deletion
    - **Property 9: Media deletion removes record and object**
    - **Validates: Requirements 10.1, 10.2**

  - [ ]* 5.7 Write property test for cascading delete
    - **Property 10: Cascading delete clears post references**
    - **Validates: Requirements 10.3**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Create API client and frontend component
  - [ ] 7.1 Create `lib/api/mediaClient.ts` following `copyClient.ts` pattern
    - Implement `requestUploadUrl(contentType, filename, fileSize)` calling POST `/api/media/upload-url`
    - Implement `uploadFileToS3(uploadUrl, file)` using fetch PUT with file body
    - Implement `getDownloadUrl(mediaId)` calling GET `/api/media/[mediaId]/download-url`
    - Implement `deleteMedia(mediaId)` calling DELETE `/api/media/[mediaId]`
    - Implement `validateMedia(mediaId)` calling POST `/api/media/[mediaId]/validate`
    - Use `getAuthToken()`, `createAuthHeaders()`, `handleAuthError()` pattern
    - On 401, clear token and redirect to `/login`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ] 7.2 Create `components/dashboard/MediaUploader.tsx`
    - Accept props: `onMediaAttached`, `onMediaRemoved`, `initialMediaId?`, `initialMediaType?`, `initialMediaUrl?`, `disabled?`
    - File input accepting `image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm`
    - Client-side validation: file type and size (10 MB images, 100 MB videos)
    - Show image thumbnail preview or video player preview after selection
    - Display upload progress indicator during S3 upload
    - Provide remove button to clear selected media
    - Call `onMediaAttached(mediaId, mediaType)` after successful upload
    - Call `onMediaRemoved()` when user removes media
    - Display inline error messages for validation failures and upload errors with retry
    - _Requirements: 5.5, 5.6, 7.2, 7.3, 7.5, 7.6, 7.7, 8.2, 8.3, 8.5, 8.6_

- [ ] 8. Integrate MediaUploader into CaptionEditor and SchedulingModal
  - [ ] 8.1 Add MediaUploader to CaptionEditor toolbar
    - Import and render `MediaUploader` in the toolbar area of `CaptionEditor`
    - Track `mediaId` and `mediaType` state in CaptionEditor
    - On Publish click with media selected, upload file to S3 via presigned URL before scheduling
    - Disable Publish button while upload is in progress
    - Pass `mediaId` to `manualSchedule` call
    - _Requirements: 7.1, 7.4, 7.5_

  - [ ] 8.2 Add MediaUploader to SchedulingModal form
    - Import and render `MediaUploader` within the SchedulingModal form
    - Accept optional `prefillMediaId`, `prefillMediaType`, `prefillMediaUrl` props for CaptionEditor flow
    - Track `mediaId` state, include in `onSchedulePost` call
    - Disable Schedule button while upload is in progress
    - _Requirements: 8.1, 8.4, 8.5_

- [ ] 9. Update Calendar for media indicators
  - [ ] 9.1 Add media indicator icons to Calendar post cards
    - Show image icon when `post.mediaType === 'image'`
    - Show video icon when `post.mediaType === 'video'`
    - In DateDetailsModal, display image thumbnails or video thumbnails alongside post content
    - Fetch presigned download URLs only for posts visible in the current month view
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 10. Update Python models and TypeScript types for media fields
  - [ ] 10.1 Add `media_id` to Python Pydantic models in `python/models/scheduler.py`
    - Add `media_id: Optional[str] = None` to `ManualScheduleInput`
    - Add `media_id: Optional[str] = None` to `ScheduledPostRecord`
    - Add `media_id: Optional[str] = None` to `ScheduledPostUpdate`
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ] 10.2 Add media fields to TypeScript types in `types/scheduler.ts`
    - Add `mediaId?: string`, `mediaUrl?: string`, `mediaType?: 'image' | 'video'` to `ScheduledPost`
    - Add `mediaId?: string` to `ManualScheduleInput`
    - Add `mediaId?: string | null` to `ScheduledPostUpdate`
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 10.3 Update `convertScheduledPost` in `lib/api/schedulerClient.ts`
    - Map `media_id` → `mediaId` and `media_type` → `mediaType` from API response
    - Include `mediaId` in `manualSchedule` and `updatePost` request bodies
    - _Requirements: 12.5, 12.6_

  - [ ]* 10.4 Write property test for convertScheduledPost media field mapping
    - **Property 12: convertScheduledPost maps media fields correctly**
    - **Validates: Requirements 12.5, 12.6**

  - [ ]* 10.5 Write property test for remove media from post
    - **Property 11: Remove media from post clears association**
    - **Validates: Requirements 6.6**

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use `fast-check` in `__tests__/media-properties.test.ts`
- Checkpoints ensure incremental validation
- All API routes use the existing `withAuth` middleware pattern
- MediaRepository follows the `UserRepository` pattern from `lib/db/userRepository.ts`
- mediaClient follows the `copyClient.ts` / `schedulerClient.ts` pattern
