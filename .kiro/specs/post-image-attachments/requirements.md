# Requirements Document

## Introduction

This feature adds media attachment capabilities (images and videos) to scheduled posts in the Zetca platform. Users will be able to upload images and videos when composing posts in the CaptionEditor and SchedulingModal components. Media files are stored as objects in an S3 bucket, with metadata tracked in DynamoDB. The system uses presigned URLs for secure, direct browser-to-S3 uploads and time-limited download access. File size limits and presigned URL expiration times differ by media type to accommodate larger video files. The media API is implemented as Next.js API route handlers under `app/api/media/`, using the AWS SDK for JavaScript (v3) for S3 and DynamoDB interactions, consistent with the existing Next.js API route patterns used for auth and profile endpoints.

## Glossary

- **Media_Service**: The Next.js API route handlers under `app/api/media/` responsible for generating presigned URLs, validating media metadata, and managing media records in DynamoDB. These handlers use the `withAuth` middleware from `lib/middleware/withAuth.ts` for JWT authentication and the AWS SDK for JavaScript (v3) for S3 and DynamoDB operations.
- **Media_Uploader**: The frontend component that allows users to select, preview, and upload image or video files from their device.
- **S3_Bucket**: The AWS S3 bucket provisioned via Terraform that stores uploaded media objects, organized by user ID prefix.
- **Presigned_Upload_URL**: A time-limited, pre-authenticated S3 URL that allows the browser to upload a file directly to S3 without exposing AWS credentials.
- **Presigned_Download_URL**: A time-limited, pre-authenticated S3 URL that allows the browser to fetch a stored media file for display without exposing AWS credentials.
- **Media_Record**: A DynamoDB item that stores metadata about an uploaded media file, including its S3 key, content type, file size, media type (image or video), dimensions, and association to a user.
- **Scheduled_Post_Record**: The existing DynamoDB record for a scheduled post, extended with an optional media attachment reference.
- **CaptionEditor**: The existing React component (`components/dashboard/CaptionEditor.tsx`) used for copy generation and refinement, which will gain media upload capability.
- **SchedulingModal**: The existing React component (`components/dashboard/SchedulingModal.tsx`) used for scheduling posts, which will gain media upload capability.
- **Calendar**: The existing React component (`components/dashboard/Calendar.tsx`) that displays scheduled posts by date.
- **Media_Client**: The TypeScript API client module that communicates with the Media_Service by calling Next.js API routes at `/api/media/...` (same-origin requests) for presigned URL requests and media metadata operations.
- **Media_Type**: A classification field on the Media_Record with allowed values `image` or `video`, used to determine file size limits, presigned URL expiration, and UI preview behavior.

## Requirements

### Requirement 1: S3 Bucket Infrastructure

**User Story:** As a platform operator, I want an S3 bucket provisioned for media storage, so that uploaded images and videos have a secure, scalable storage backend.

#### Acceptance Criteria

1. THE Terraform configuration SHALL provision an S3_Bucket with a name following the pattern `zetca-post-media-{environment}`
2. THE S3_Bucket SHALL have server-side encryption enabled using AES-256
3. THE S3_Bucket SHALL have public access blocked via the `aws_s3_bucket_public_access_block` resource
4. THE S3_Bucket SHALL have a lifecycle rule that transitions objects to Infrequent Access storage after 90 days
5. THE Terraform configuration SHALL output the S3_Bucket name for use by the application configuration

### Requirement 2: Media Metadata Storage

**User Story:** As a platform operator, I want media metadata stored in DynamoDB, so that the system can track uploaded images and videos and their associations.

#### Acceptance Criteria

1. THE Terraform configuration SHALL provision a DynamoDB table named `post-media-{environment}` with `mediaId` as the hash key
2. THE DynamoDB table SHALL have a Global Secondary Index on `userId` with `createdAt` as the range key
3. THE Media_Record SHALL contain fields: mediaId, userId, s3Key, contentType, fileSize, mediaType, width, height, originalFilename, createdAt
4. THE Media_Record `mediaType` field SHALL accept only the values `image` or `video`
5. THE `getConfig()` function in `lib/config.ts` SHALL include configuration fields for the S3_Bucket name and the DynamoDB post-media table name, sourced from environment variables in `.env.local`

### Requirement 3: Presigned URL Generation for Upload

**User Story:** As a user, I want to upload images and videos directly to S3 from my browser, so that uploads are fast and do not burden the application server.

#### Acceptance Criteria

1. WHEN an authenticated user requests an upload URL for an image, THE Media_Service SHALL return a Presigned_Upload_URL valid for 5 minutes
2. WHEN an authenticated user requests an upload URL for a video, THE Media_Service SHALL return a Presigned_Upload_URL valid for 15 minutes
3. WHEN an authenticated user requests an upload URL, THE Media_Service SHALL generate an S3 key using the pattern `{userId}/{mediaId}/{originalFilename}`
4. THE Media_Service SHALL accept the content type and original filename as input parameters for the upload URL request
5. THE Media_Service SHALL validate that the content type is one of: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/quicktime`, `video/webm`
6. THE Media_Service SHALL determine the Media_Type (`image` or `video`) from the content type prefix
7. IF the content type is not in the allowed list, THEN THE Media_Service SHALL return a 400 error with a descriptive message
8. THE Media_Service SHALL create a Media_Record in DynamoDB with the determined `mediaType` when generating the Presigned_Upload_URL

### Requirement 4: Presigned URL Generation for Download

**User Story:** As a user, I want to view attached media in the UI, so that I can see what images and videos are associated with my posts.

#### Acceptance Criteria

1. WHEN an authenticated user requests a download URL for a media file, THE Media_Service SHALL return a Presigned_Download_URL valid for 60 minutes
2. IF the requested media file does not exist, THEN THE Media_Service SHALL return a 404 error
3. IF the requested media file belongs to a different user, THEN THE Media_Service SHALL return a 403 error
4. WHEN a user retrieves a Scheduled_Post_Record that has an attached media file, THE Media_Service SHALL provide a Presigned_Download_URL for the attached media

### Requirement 5: Media File Validation

**User Story:** As a platform operator, I want uploaded media files validated for size and type, so that storage costs are controlled and only valid formats are accepted.

#### Acceptance Criteria

1. THE Media_Service SHALL reject upload requests for image files larger than 10 MB by returning a 400 error
2. THE Media_Service SHALL reject upload requests for video files larger than 100 MB by returning a 400 error
3. THE Media_Service SHALL determine the applicable file size limit based on the Media_Type derived from the content type
4. THE Media_Service SHALL validate that the file size parameter is a positive integer
5. THE Media_Uploader SHALL validate file size on the client side before requesting a Presigned_Upload_URL, applying the correct limit based on Media_Type
6. THE Media_Uploader SHALL validate file type on the client side before requesting a Presigned_Upload_URL

### Requirement 6: Attach Media to Scheduled Post

**User Story:** As a user, I want to attach an image or video to a scheduled post, so that my social media posts include visual content.

#### Acceptance Criteria

1. THE Scheduled_Post_Record model SHALL include an optional `media_id` field referencing a Media_Record, in both the Python Pydantic `ScheduledPostRecord` model (used by the scheduler service) and the TypeScript types
2. THE Python Pydantic `ManualScheduleInput` model SHALL include an optional `media_id` field (used by the scheduler service which remains in Python)
3. WHEN a user schedules a post with a `media_id`, THE Media_Service SHALL verify the media file exists and belongs to the user
4. IF the referenced media file does not exist or belongs to a different user, THEN THE Media_Service SHALL return a 400 error
5. THE Python Pydantic `ScheduledPostUpdate` model SHALL include an optional `media_id` field to allow adding or removing media from existing posts (used by the scheduler service which remains in Python)
6. WHEN a user updates a post to remove media (setting `media_id` to null), THE Scheduled_Post_Record SHALL clear the media association

### Requirement 7: Media Upload in CaptionEditor

**User Story:** As a user, I want to attach an image or video while composing a post in the CaptionEditor, so that I can include visuals with my generated copy.

#### Acceptance Criteria

1. THE CaptionEditor SHALL display a Media_Uploader component in the toolbar area
2. WHEN a user selects an image file, THE Media_Uploader SHALL display a thumbnail preview of the selected image
3. WHEN a user selects a video file, THE Media_Uploader SHALL display a video thumbnail or a video player preview of the selected video
4. WHEN a user clicks the Publish button with a media file selected, THE CaptionEditor SHALL upload the file to S3 using a Presigned_Upload_URL before scheduling the post
5. WHILE a media upload is in progress, THE CaptionEditor SHALL display a progress indicator and disable the Publish button
6. IF a media upload fails, THEN THE CaptionEditor SHALL display an error message and allow the user to retry
7. THE Media_Uploader SHALL provide a button to remove a selected media file before publishing

### Requirement 8: Media Upload in SchedulingModal

**User Story:** As a user, I want to attach an image or video when scheduling a post from the calendar modal, so that I can add visuals to posts scheduled directly from the calendar.

#### Acceptance Criteria

1. THE SchedulingModal SHALL display a Media_Uploader component within the scheduling form
2. WHEN a user selects an image file in the SchedulingModal, THE Media_Uploader SHALL display a thumbnail preview
3. WHEN a user selects a video file in the SchedulingModal, THE Media_Uploader SHALL display a video thumbnail or video player preview
4. WHEN the SchedulingModal receives a pre-filled media file from the CaptionEditor, THE SchedulingModal SHALL display the pre-filled media preview
5. WHILE a media upload is in progress, THE SchedulingModal SHALL disable the Schedule button
6. IF a media upload fails, THEN THE SchedulingModal SHALL display an error message and allow the user to retry

### Requirement 9: Media Preview in Calendar

**User Story:** As a user, I want to see media indicators on calendar post cards, so that I can visually identify posts with attachments at a glance.

#### Acceptance Criteria

1. WHEN a scheduled post has an attached image, THE Calendar SHALL display an image indicator icon on the post card
2. WHEN a scheduled post has an attached video, THE Calendar SHALL display a video indicator icon on the post card
3. WHEN a user clicks on a date with media-attached posts, THE date details view SHALL display image thumbnails or video thumbnails alongside post content
4. THE Calendar SHALL load media Presigned_Download_URLs only for posts visible in the current month view

### Requirement 10: Media Deletion

**User Story:** As a user, I want to delete uploaded media files, so that I can manage my storage and remove unwanted images or videos.

#### Acceptance Criteria

1. WHEN a user requests deletion of a media file, THE Media_Service SHALL remove the Media_Record from DynamoDB
2. WHEN a user requests deletion of a media file, THE Media_Service SHALL remove the object from the S3_Bucket
3. IF the media file is currently attached to a Scheduled_Post_Record, THEN THE Media_Service SHALL clear the media reference from the post before deleting the media
4. IF the media file does not exist, THEN THE Media_Service SHALL return a 404 error
5. IF the media file belongs to a different user, THEN THE Media_Service SHALL return a 403 error

### Requirement 11: Media API Client

**User Story:** As a frontend developer, I want a TypeScript API client for media operations, so that frontend components can interact with the Media_Service consistently.

#### Acceptance Criteria

1. THE Media_Client SHALL provide a function to request a Presigned_Upload_URL with content type and filename parameters by calling `/api/media/upload-url`
2. THE Media_Client SHALL provide a function to upload a file directly to S3 using a Presigned_Upload_URL
3. THE Media_Client SHALL provide a function to request a Presigned_Download_URL for a given media ID by calling `/api/media/[mediaId]/download-url`
4. THE Media_Client SHALL provide a function to delete a media file by ID by calling `/api/media/[mediaId]`
5. THE Media_Client SHALL include JWT authentication headers on all requests to the Media_Service
6. IF an API request returns a 401 status, THEN THE Media_Client SHALL clear the stored token and redirect to the login page

### Requirement 12: Scheduled Post Type Updates

**User Story:** As a frontend developer, I want the TypeScript types updated to include media fields, so that the frontend can properly handle media data in scheduled posts.

#### Acceptance Criteria

1. THE ScheduledPost TypeScript interface SHALL include an optional `mediaId` field of type string
2. THE ScheduledPost TypeScript interface SHALL include an optional `mediaUrl` field of type string for the resolved Presigned_Download_URL
3. THE ScheduledPost TypeScript interface SHALL include an optional `mediaType` field of type `'image' | 'video'`
4. THE ManualScheduleInput TypeScript interface SHALL include an optional `mediaId` field of type string
5. THE `convertScheduledPost` function in schedulerClient.ts SHALL map the `media_id` field from the API response to `mediaId`
6. THE `convertScheduledPost` function in schedulerClient.ts SHALL map the `media_type` field from the API response to `mediaType`
