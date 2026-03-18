# Requirements Document: Scheduler Agent Backend

## Introduction

The Scheduler Agent Backend extends the Zetca Python FastAPI service with AI-powered social media post scheduling, and integrates the scheduling functionality into the Next.js frontend. The Scheduler Agent consumes posting schedule data from the Strategist Agent and copy content from the Copywriter Agent, then intelligently distributes posts across a calendar. Users can auto-schedule all copies from a strategy in bulk (using AI to pick optimal dates and times) or manually schedule individual posts via the "Publish" button in the CaptionEditor. The scheduler supports multiple strategies and accounts simultaneously, with visual differentiation (icons, colors) so users can identify which strategy each post belongs to. The service has its own DynamoDB table for scheduled posts and provides full CRUD operations. The frontend integration includes a TypeScript API client, updated Calendar/Scheduler components backed by the API instead of local state, the Publish button wired to manual scheduling, and an auto-schedule action on the Scheduler page. It follows the same architectural patterns as the existing Strategist and Copywriter Agent backends: FastAPI routes, Pydantic models, DynamoDB repository, Strands Agents SDK with Amazon Bedrock, JWT authentication, and mock agent support.

## Glossary

- **Scheduler_Agent**: The AI agent built with Strands Agents Python SDK that analyzes a strategy's posting schedule and copies to determine optimal scheduling dates and times for each post
- **Scheduled_Post**: A database entity representing a single social media post placed on the calendar with a specific date, time, platform, status, and content
- **Scheduled_Posts_Table**: DynamoDB table storing all Scheduled_Post records
- **Auto_Schedule_Input**: Data sent to the Scheduler Agent containing a strategyId; the agent fetches the associated strategy and copies to produce a bulk schedule
- **Auto_Schedule_Output**: The structured output from the Scheduler Agent containing a list of post assignments with dates, times, and copy references
- **Manual_Schedule_Input**: Data sent by the user to manually schedule a single copy to a specific date and time
- **Post_Status**: The lifecycle state of a Scheduled_Post: "draft", "scheduled", or "published"
- **Strategy_Record**: An existing strategy created by the Strategist Agent, referenced by strategyId
- **Copy_Record**: An existing copy created by the Copywriter Agent, referenced by copyId
- **User_Context**: The authenticated user's identity derived from JWT token
- **Python_Service**: The existing FastAPI service that hosts the Strategist, Copywriter, and Scheduler agents
- **API_Endpoint**: REST API route exposed by the Python_Service for scheduler operations
- **Scheduler_Client**: TypeScript API client (lib/api/schedulerClient.ts) that communicates with the Python scheduler endpoints from the Next.js frontend
- **Scheduler_Component**: The existing React component (components/dashboard/Scheduler.tsx) that manages the calendar/list views and scheduling modals
- **Calendar_Component**: The existing React component (components/dashboard/Calendar.tsx) that renders the monthly calendar grid with post indicators
- **CaptionEditor_Component**: The existing React component (components/dashboard/CaptionEditor.tsx) that contains the Publish button for manual scheduling

## Requirements

### Requirement 1: Auto-Schedule Copies Using AI Agent

**User Story:** As a user, I want to auto-schedule all copies from a strategy onto the calendar using AI, so that the agent picks optimal dates and times based on my posting schedule without manual effort.

#### Acceptance Criteria

1. WHEN a user submits an Auto_Schedule_Input with a valid strategyId, THE Scheduler_Agent SHALL retrieve the associated Strategy_Record and all Copy_Records for that strategy
2. WHEN the Strategy_Record and Copy_Records are retrieved, THE Scheduler_Agent SHALL analyze the posting_schedule, platform_recommendations, and content_themes to determine optimal dates and times for each copy
3. THE Scheduler_Agent SHALL distribute copies across the calendar avoiding duplicate posts on the same platform at the same date and time
4. WHEN the Scheduler_Agent completes scheduling, THE system SHALL return a structured Auto_Schedule_Output validated by a Pydantic model
5. WHEN the Auto_Schedule_Output is produced, THE system SHALL create a Scheduled_Post record for each post assignment with status "scheduled"
6. IF the provided strategyId does not exist, THEN THE API_Endpoint SHALL return a 404 error with a descriptive message
7. IF the provided strategyId belongs to a different user, THEN THE API_Endpoint SHALL return a 403 error
8. IF no Copy_Records exist for the given strategyId, THEN THE API_Endpoint SHALL return a 400 error indicating no copies are available to schedule

### Requirement 2: Manually Schedule a Single Post

**User Story:** As a user, I want to manually schedule a single copy to a specific date and time via the Publish button in the CaptionEditor, so that I have full control over when individual posts go live.

#### Acceptance Criteria

1. WHEN a user submits a Manual_Schedule_Input with a valid copyId, date, time, and platform, THE system SHALL create a Scheduled_Post record with the provided scheduling details
2. THE Scheduled_Post created from manual scheduling SHALL have status "scheduled"
3. WHEN a Manual_Schedule_Input is received, THE system SHALL verify that the referenced Copy_Record exists and belongs to the authenticated user
4. IF the provided copyId does not exist, THEN THE API_Endpoint SHALL return a 404 error
5. IF the provided copyId belongs to a different user, THEN THE API_Endpoint SHALL return a 403 error
6. WHEN a user submits a Manual_Schedule_Input without a date or time, THE API_Endpoint SHALL return a 400 error with descriptive validation messages

### Requirement 3: Store Scheduled Posts with Strategy and Copy Association

**User Story:** As a user, I want my scheduled posts to be saved with references to the originating strategy and copy, so that I can track which strategy and content each post belongs to.

#### Acceptance Criteria

1. EACH Scheduled_Post SHALL include a unique postId as the partition key
2. EACH Scheduled_Post SHALL include the strategyId linking it to the originating Strategy_Record
3. EACH Scheduled_Post SHALL include the copyId linking it to the originating Copy_Record
4. EACH Scheduled_Post SHALL include the userId from the User_Context
5. EACH Scheduled_Post SHALL include the content field containing the post text
6. EACH Scheduled_Post SHALL include the platform field indicating the target social media platform
7. EACH Scheduled_Post SHALL include the hashtags field containing a list of relevant hashtags
8. EACH Scheduled_Post SHALL include the scheduledDate field as an ISO 8601 date string
9. EACH Scheduled_Post SHALL include the scheduledTime field as a time string in HH:MM format
10. EACH Scheduled_Post SHALL include the status field with a value of "draft", "scheduled", or "published"
11. EACH Scheduled_Post SHALL include a createdAt timestamp
12. EACH Scheduled_Post SHALL include an updatedAt timestamp that reflects the last modification time

### Requirement 4: Full CRUD Operations for Scheduled Posts

**User Story:** As a user, I want to create, read, update, and delete scheduled posts on the calendar, so that I have complete control over my posting schedule.

#### Acceptance Criteria

1. THE API_Endpoint SHALL provide a method to create a new Scheduled_Post with status "draft"
2. THE API_Endpoint SHALL provide a method to retrieve a single Scheduled_Post by postId
3. THE API_Endpoint SHALL provide a method to update a Scheduled_Post's scheduledDate, scheduledTime, content, platform, hashtags, and status fields
4. THE API_Endpoint SHALL provide a method to delete a Scheduled_Post by postId
5. WHEN updating a Scheduled_Post, THE system SHALL update the updatedAt timestamp
6. WHEN a Scheduled_Post is updated, THE system SHALL validate that the new status is one of "draft", "scheduled", or "published"
7. IF a Scheduled_Post with the given postId does not exist for update or delete, THEN THE API_Endpoint SHALL return a 404 error

### Requirement 5: Retrieve Scheduled Posts by User and by Strategy

**User Story:** As a user, I want to retrieve all my scheduled posts or filter them by strategy, so that I can view my full calendar or focus on a specific campaign.

#### Acceptance Criteria

1. THE API_Endpoint SHALL provide a method to retrieve all Scheduled_Posts for the authenticated user
2. THE API_Endpoint SHALL provide a method to retrieve all Scheduled_Posts for a given strategyId
3. WHEN retrieving Scheduled_Posts by strategyId, THE system SHALL verify that the strategy belongs to the authenticated user
4. WHEN retrieving Scheduled_Posts, THE system SHALL return results ordered by scheduledDate and scheduledTime in ascending order
5. WHEN no Scheduled_Posts exist for a user or strategy, THE system SHALL return an empty array
6. IF the strategyId does not exist when filtering by strategy, THEN THE API_Endpoint SHALL return a 404 error
7. IF the strategyId belongs to a different user when filtering by strategy, THEN THE API_Endpoint SHALL return a 403 error

### Requirement 6: Multi-Strategy Support with Visual Differentiation

**User Story:** As a user, I want to see posts from multiple strategies on the same calendar with visual indicators showing which strategy each post belongs to, so that I can manage multiple campaigns simultaneously.

#### Acceptance Criteria

1. WHEN retrieving all Scheduled_Posts for a user, THE system SHALL include the strategyId and strategy brandName in each post response
2. THE API_Endpoint SHALL support an optional query parameter to filter Scheduled_Posts by one or more strategyIds
3. EACH Scheduled_Post response SHALL include a strategyColor field derived from a consistent color assignment per strategyId
4. EACH Scheduled_Post response SHALL include a strategyLabel field containing the strategy brandName for display purposes
5. WHEN a user clicks on a Scheduled_Post, THE system SHALL return the full post details including the associated strategyId and copyId

### Requirement 7: Provide RESTful API Endpoints for Scheduler Operations

**User Story:** As a frontend developer, I want well-defined API endpoints for scheduling, retrieval, and management, so that I can integrate the Scheduler Agent into the user interface.

#### Acceptance Criteria

1. THE Python_Service SHALL provide a POST endpoint at /api/scheduler/auto-schedule that accepts a strategyId and returns the auto-scheduled posts
2. THE Python_Service SHALL provide a POST endpoint at /api/scheduler/manual-schedule that accepts a Manual_Schedule_Input and returns the created Scheduled_Post
3. THE Python_Service SHALL provide a GET endpoint at /api/scheduler/posts that returns all Scheduled_Posts for the authenticated user
4. THE Python_Service SHALL provide a GET endpoint at /api/scheduler/posts/strategy/{strategyId} that returns Scheduled_Posts filtered by strategy
5. THE Python_Service SHALL provide a GET endpoint at /api/scheduler/posts/{postId} that returns a specific Scheduled_Post by ID
6. THE Python_Service SHALL provide a PUT endpoint at /api/scheduler/posts/{postId} that updates a Scheduled_Post
7. THE Python_Service SHALL provide a DELETE endpoint at /api/scheduler/posts/{postId} that deletes a Scheduled_Post
8. WHEN accessing any scheduler endpoint without valid JWT authentication, THE system SHALL return a 401 error
9. THE Python_Service SHALL register scheduler routes alongside existing strategy and copy routes in the FastAPI application

### Requirement 8: Enforce User Isolation for Scheduled Posts

**User Story:** As a user, I want my scheduled posts to be private and inaccessible to other users, so that my content calendar remains secure.

#### Acceptance Criteria

1. WHEN User A requests Scheduled_Posts, THE system SHALL return only Scheduled_Post records where the userId matches User A
2. WHEN User A attempts to access a Scheduled_Post belonging to User B, THE system SHALL return a 403 error
3. WHEN User A attempts to update a Scheduled_Post belonging to User B, THE system SHALL return a 403 error
4. WHEN User A attempts to delete a Scheduled_Post belonging to User B, THE system SHALL return a 403 error
5. THE system SHALL enforce user isolation at the repository level by verifying userId on all read and write operations

### Requirement 9: Handle Scheduler Agent Errors Gracefully

**User Story:** As a user, I want to receive clear error messages when auto-scheduling fails, so that I understand what went wrong and can retry.

#### Acceptance Criteria

1. IF the Bedrock provider fails to respond during auto-scheduling, THEN THE system SHALL return a 503 error with a message indicating service unavailability
2. IF the Scheduler_Agent throws an error during auto-scheduling, THEN THE system SHALL log the error details and return a 500 error with a user-friendly message
3. IF auto-scheduling takes longer than 60 seconds, THEN THE system SHALL timeout and return a 504 error
4. WHEN any error occurs during auto-scheduling, THE system SHALL NOT store incomplete Scheduled_Post records in the database
5. WHEN an error occurs, THE system SHALL log sufficient details for debugging without exposing sensitive information to the user

### Requirement 10: Configure Scheduled Posts DynamoDB Table

**User Story:** As a developer, I want a proper DynamoDB table schema for storing scheduled posts, so that data is organized and efficiently queryable.

#### Acceptance Criteria

1. THE Scheduled_Posts_Table SHALL use postId as the partition key
2. THE Scheduled_Posts_Table SHALL have a Global Secondary Index named UserIdIndex with userId as hash key and scheduledDate as range key
3. THE Scheduled_Posts_Table SHALL have a Global Secondary Index named StrategyIdIndex with strategyId as hash key and scheduledDate as range key
4. THE Scheduled_Posts_Table SHALL have a Global Secondary Index named CopyIdIndex with copyId as hash key
5. THE Scheduled_Posts_Table SHALL use PAY_PER_REQUEST billing mode
6. THE Scheduled_Posts_Table SHALL have point-in-time recovery enabled
7. THE Scheduled_Posts_Table SHALL have server-side encryption enabled
8. THE Scheduled_Posts_Table name SHALL be configurable via the dynamodb_scheduled_posts_table setting, defaulting to "scheduled-posts-{environment}"

### Requirement 11: Support Mock Agent for Development

**User Story:** As a developer, I want a mock Scheduler Agent that returns realistic sample scheduling data without calling AWS services, so that I can develop and test without cloud dependencies.

#### Acceptance Criteria

1. WHEN the USE_MOCK_AGENT environment variable is set to true, THE system SHALL use a MockSchedulerAgent instead of the real Scheduler_Agent
2. THE MockSchedulerAgent SHALL return realistic scheduling assignments with dates spread across the upcoming weeks
3. THE MockSchedulerAgent SHALL simulate a processing delay to mimic real agent behavior
4. THE MockSchedulerAgent SHALL support the same auto-schedule interface as the real Scheduler_Agent
5. THE MockSchedulerAgent SHALL generate scheduling assignments that reference the provided copies and strategy data for realistic output

### Requirement 12: Define Pydantic Models for Scheduler Data

**User Story:** As a developer, I want well-defined Pydantic models for scheduler data, so that input validation, output serialization, and type safety are enforced throughout the system.

#### Acceptance Criteria

1. THE system SHALL define an AutoScheduleInput Pydantic model with a required strategyId field (non-empty string)
2. THE system SHALL define a ManualScheduleInput Pydantic model with required fields: copyId (non-empty string), scheduledDate (ISO 8601 date string), scheduledTime (HH:MM format string), and platform (non-empty string)
3. THE system SHALL define a PostAssignment Pydantic model with fields: copyId (str), scheduledDate (str), scheduledTime (str), platform (str)
4. THE system SHALL define an AutoScheduleOutput Pydantic model with a posts field (List[PostAssignment]) as the structured agent output
5. THE system SHALL define a ScheduledPostRecord Pydantic model with fields: id, strategyId, copyId, userId, content, platform, hashtags, scheduledDate, scheduledTime, status, strategyColor, strategyLabel, createdAt, updatedAt
6. THE system SHALL define a ScheduledPostUpdate Pydantic model with optional fields: scheduledDate, scheduledTime, content, platform, hashtags, status
7. WHEN the Scheduler_Agent returns structured output, THE system SHALL serialize the Pydantic models to JSON for API responses

### Requirement 13: Integrate Scheduler Table Configuration into Existing Settings

**User Story:** As a developer, I want the scheduler DynamoDB table name to be configurable alongside existing table settings, so that the deployment is consistent across environments.

#### Acceptance Criteria

1. THE Settings class in python/config.py SHALL include a dynamodb_scheduled_posts_table field with a default value of "scheduled-posts-dev"
2. THE dynamodb_scheduled_posts_table field SHALL be overridable via the DYNAMODB_SCHEDULED_POSTS_TABLE environment variable
3. THE Python_Service SHALL use the dynamodb_scheduled_posts_table setting when initializing the scheduler repository

### Requirement 14: Create Scheduler API Client for Frontend

**User Story:** As a frontend developer, I want a TypeScript API client for the scheduler endpoints, so that I can call the scheduler backend from the Next.js application following the same patterns as the existing strategy and copy clients.

#### Acceptance Criteria

1. THE system SHALL create a schedulerClient.ts in lib/api/ following the same patterns as strategyClient.ts and copyClient.ts
2. THE schedulerClient SHALL export functions for: autoSchedule(strategyId), manualSchedule(input), listPosts(), listPostsByStrategy(strategyId), getPost(postId), updatePost(postId, data), and deletePost(postId)
3. THE schedulerClient SHALL handle snake_case to camelCase conversion for all API responses
4. THE schedulerClient SHALL include JWT authentication headers on all requests using the same getAuthToken pattern
5. THE schedulerClient SHALL handle 401 errors by clearing the token and redirecting to login
6. THE schedulerClient SHALL handle 403, 404, and other error status codes with descriptive error messages
7. THE schedulerClient SHALL export a SchedulerAPIError class for typed error handling

### Requirement 15: Define TypeScript Types for Scheduled Posts

**User Story:** As a frontend developer, I want TypeScript type definitions for scheduled post data, so that the frontend has type safety when working with scheduler API responses.

#### Acceptance Criteria

1. THE system SHALL define a ScheduledPost TypeScript interface with fields: id, strategyId, copyId, userId, content, platform, hashtags, scheduledDate, scheduledTime, status, strategyColor, strategyLabel, createdAt, updatedAt
2. THE system SHALL define a ManualScheduleInput TypeScript interface with fields: copyId, scheduledDate, scheduledTime, platform
3. THE system SHALL define a ScheduledPostUpdate TypeScript interface with optional fields: scheduledDate, scheduledTime, content, platform, hashtags, status
4. THE ScheduledPost status field SHALL be typed as a union: 'draft' | 'scheduled' | 'published'
5. THE type definitions SHALL be placed in types/scheduler.ts consistent with existing type file organization

### Requirement 16: Integrate Scheduler with Calendar and Scheduler Components

**User Story:** As a user, I want the Scheduler page calendar to load and display my scheduled posts from the backend instead of local state, so that my posts persist across sessions and are synced with the scheduler agent.

#### Acceptance Criteria

1. THE Scheduler component SHALL fetch scheduled posts from the scheduler API on mount using the schedulerClient
2. THE Scheduler component SHALL replace local React state post management with API-backed CRUD operations
3. WHEN a user creates a post via the SchedulingModal, THE system SHALL call the schedulerClient.manualSchedule or create endpoint and refresh the calendar
4. WHEN a user edits a post, THE system SHALL call the schedulerClient.updatePost endpoint and refresh the calendar
5. WHEN a user deletes a post, THE system SHALL call the schedulerClient.deletePost endpoint and refresh the calendar
6. THE Calendar component SHALL display strategy color indicators on posts from different strategies
7. THE DateDetailsModal SHALL show the strategy label (brandName) for each post so users can identify which strategy a post belongs to
8. THE Scheduler component SHALL display loading and error states during API operations

### Requirement 17: Wire Publish Button in CaptionEditor to Manual Scheduling

**User Story:** As a user, I want the Publish button in the CaptionEditor to open a scheduling dialog where I can pick a date and time, so that I can manually schedule a copy directly from the copywriter page.

#### Acceptance Criteria

1. WHEN a user clicks the Publish button in the CaptionEditor, THE system SHALL open a scheduling modal pre-filled with the active copy's content, platform, and hashtags
2. THE scheduling modal SHALL allow the user to select a date and time for the post
3. WHEN the user confirms scheduling, THE system SHALL call the schedulerClient.manualSchedule endpoint with the copyId, selected date, time, and platform
4. WHEN manual scheduling succeeds, THE system SHALL display a success message indicating the post has been scheduled
5. IF manual scheduling fails, THE system SHALL display an error message to the user
6. THE Publish button SHALL be disabled when no copy is selected or when a scheduling operation is in progress

### Requirement 18: Add Auto-Schedule Action to Scheduler Page

**User Story:** As a user, I want an auto-schedule button on the Scheduler page that lets me select a strategy and automatically schedule all its copies using the AI agent, so that I can bulk-fill my calendar without manual effort.

#### Acceptance Criteria

1. THE Scheduler page SHALL include an "Auto Schedule" button alongside the existing "Schedule Post" button
2. WHEN the user clicks "Auto Schedule", THE system SHALL display a strategy selection dropdown listing the user's strategies
3. WHEN the user selects a strategy and confirms, THE system SHALL call the schedulerClient.autoSchedule endpoint with the selected strategyId
4. WHILE auto-scheduling is in progress, THE system SHALL display a loading indicator and disable the auto-schedule button
5. WHEN auto-scheduling completes, THE system SHALL refresh the calendar to show the newly scheduled posts
6. IF auto-scheduling fails, THE system SHALL display an error message to the user with the option to retry
