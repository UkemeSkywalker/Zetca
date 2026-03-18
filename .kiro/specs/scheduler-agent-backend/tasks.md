# Implementation Plan: Scheduler Agent Backend

## Overview

This implementation plan extends the existing Python FastAPI service with AI-powered social media post scheduling and integrates the scheduling functionality into the Next.js frontend. The architecture follows the same patterns established by the Strategist and Copywriter Agent backends.

The implementation follows this sequence:
1. **Phase 1: Foundation** - Pydantic models, DynamoDB table (Terraform), config updates
2. **Phase 2: Repository + Mock Agent + Service + Routes** - Scheduler repository, mock agent, service layer, API routes, main app registration
3. **Phase 3: Real Scheduler Agent** - Strands SDK scheduler agent with Bedrock
4. **Phase 4: Frontend Integration** - TypeScript types, scheduler API client, component updates, Publish button wiring, auto-schedule UI
5. **Phase 5: Polish** - Error handling, final wiring, verification

Each phase ends with a verification checkpoint.

## Tasks

## Phase 1: Foundation (Models, Table, Config)

- [x] 1. Create Pydantic models for scheduler data
  - [x] 1.1 Create `python/models/scheduler.py`
    - Define `AutoScheduleInput` model with `strategy_id` field (non-empty string, field_validator)
    - Define `ManualScheduleInput` model with `copy_id`, `scheduled_date` (YYYY-MM-DD), `scheduled_time` (HH:MM), `platform` fields with validators
    - Define `PostAssignment` model with `copy_id`, `scheduled_date`, `scheduled_time`, `platform` fields
    - Define `AutoScheduleOutput` model with `posts` field (List[PostAssignment], min_length=1)
    - Define `ScheduledPostRecord` model with all fields: `id`, `strategy_id`, `copy_id`, `user_id`, `content`, `platform`, `hashtags`, `scheduled_date`, `scheduled_time`, `status`, `strategy_color`, `strategy_label`, `created_at`, `updated_at`
    - Define `ScheduledPostUpdate` model with optional fields: `scheduled_date`, `scheduled_time`, `content`, `platform`, `hashtags`, `status` with validators
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 1.2 Write property test for input validation
    - **Property 1: Input Validation Rejects Invalid Data**
    - Create `python/tests/test_scheduler_input_validation_property.py`
    - Test that whitespace-only or empty strings are rejected for `strategy_id` in AutoScheduleInput
    - Test that invalid date formats, time formats, empty copy_id, and empty platform are rejected in ManualScheduleInput
    - **Validates: Requirements 2.6, 12.1, 12.2**

  - [ ]* 1.3 Write property test for Pydantic JSON round-trip
    - **Property 2: Pydantic Model JSON Serialization Round-Trip**
    - Create `python/tests/test_scheduler_serialization_property.py`
    - Test that AutoScheduleInput, ManualScheduleInput, PostAssignment, AutoScheduleOutput, ScheduledPostRecord, and ScheduledPostUpdate survive JSON serialize/deserialize
    - **Validates: Requirements 1.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7**

- [ ] 2. Create DynamoDB scheduled-posts table with Terraform
  - [ ] 2.1 Create `terraform/scheduled-posts-table.tf`
    - Define `aws_dynamodb_table` resource for scheduled-posts table
    - Set `postId` as partition key (String)
    - Define attributes: `postId` (S), `userId` (S), `strategyId` (S), `copyId` (S), `scheduledDate` (S)
    - Create `UserIdIndex` GSI with `userId` hash key and `scheduledDate` range key, projection ALL
    - Create `StrategyIdIndex` GSI with `strategyId` hash key and `scheduledDate` range key, projection ALL
    - Create `CopyIdIndex` GSI with `copyId` hash key, projection ALL
    - Set PAY_PER_REQUEST billing, enable point-in-time recovery and server-side encryption
    - Table name pattern: `scheduled-posts-${var.environment}`
    - Add tags: Name, Environment, ManagedBy, Application
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [ ] 3. Update configuration and app registration
  - [ ] 3.1 Update `python/config.py`
    - Add `dynamodb_scheduled_posts_table: str = "scheduled-posts-dev"` to Settings class
    - _Requirements: 13.1, 13.2_

  - [ ] 3.2 Update `python/main.py`
    - Import and register scheduler router: `from routes.scheduler import router as scheduler_router`
    - Add `app.include_router(scheduler_router)`
    - Update app description to reflect strategy, copy, and scheduler services
    - _Requirements: 7.9_

- [ ] 4. **CHECKPOINT: Verify foundation**
  - Ensure Pydantic models validate correctly
  - Ensure Terraform plan succeeds for scheduled-posts table
  - Ensure Python service starts without errors with new config
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Repository + Mock Agent + Service + Routes

- [ ] 5. Create scheduler repository for DynamoDB
  - [ ] 5.1 Create `python/repositories/scheduler_repository.py`
    - Initialize DynamoDB resource with boto3 using settings
    - Implement `create_post(record: ScheduledPostRecord) -> ScheduledPostRecord`
    - Implement `create_posts(records: List[ScheduledPostRecord]) -> List[ScheduledPostRecord]` for batch storage
    - Implement `get_post_by_id(post_id: str, user_id: str) -> Optional[ScheduledPostRecord]` with user isolation
    - Implement `post_exists(post_id: str) -> bool`
    - Implement `list_posts_by_user(user_id: str) -> List[ScheduledPostRecord]` using UserIdIndex GSI, sorted by scheduledDate ascending
    - Implement `list_posts_by_strategy(strategy_id: str) -> List[ScheduledPostRecord]` using StrategyIdIndex GSI, sorted by scheduledDate ascending
    - Implement `update_post(post_id: str, updates: dict) -> ScheduledPostRecord` with updatedAt
    - Implement `delete_post(post_id: str) -> bool`
    - Implement `_record_to_item()` and `_item_to_record()` helper methods
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.4, 5.5, 8.5_

  - [ ]* 5.2 Write property test for ScheduledPostRecord completeness
    - **Property 4: ScheduledPostRecord Completeness**
    - Create `python/tests/test_scheduler_record_completeness_property.py`
    - Test that stored ScheduledPostRecords contain all required fields: non-empty postId, strategyId, copyId, userId, content, platform, hashtags list, valid scheduledDate, valid scheduledTime, valid status, strategyColor, strategyLabel, valid createdAt, valid updatedAt
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12**

  - [ ]* 5.3 Write property test for user isolation
    - **Property 5: User Isolation Across All Scheduler Operations**
    - Create `python/tests/test_scheduler_user_isolation_property.py`
    - Test that user A's posts are inaccessible to user B across get, list, update, and delete operations
    - **Validates: Requirements 1.7, 2.3, 2.5, 5.3, 5.7, 8.1, 8.2, 8.3, 8.4**

- [ ] 6. Create mock scheduler agent
  - [ ] 6.1 Create `python/services/mock_scheduler_agent.py`
    - Implement `MockSchedulerAgent` class
    - Implement `auto_schedule(strategy_data: dict, copies_data: List[dict]) -> AutoScheduleOutput`
    - Return realistic scheduling assignments with dates spread across upcoming 2-4 weeks
    - Generate PostAssignment for each copy with varied times and no duplicate platform+date+time combinations
    - Add 2-second simulated delay to mimic real agent behavior
    - Reference provided copies' copyIds in the output
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 6.2 Write property test for mock agent interface compatibility
    - **Property 11: Mock Agent Interface Compatibility**
    - Create `python/tests/test_scheduler_mock_interface_property.py`
    - Test that MockSchedulerAgent accepts the same inputs and returns AutoScheduleOutput with copyIds referencing the provided copies
    - **Validates: Requirements 11.4, 11.5**

- [ ] 7. Create scheduler service layer
  - [ ] 7.1 Create `python/services/scheduler_service.py`
    - Implement `SchedulerService` class with agent, scheduler_repository, copy_repository, strategy_repository dependencies
    - Define `STRATEGY_COLORS` palette for visual differentiation
    - Implement `_get_strategy_color(strategy_id: str) -> str` using hash-based consistent color derivation
    - Implement `auto_schedule(strategy_id, user_id) -> List[ScheduledPostRecord]`:
      - Fetch strategy (verify ownership → 404/403)
      - Fetch copies for strategy (400 if none)
      - Call agent.auto_schedule() with strategy + copies data
      - Create ScheduledPostRecord for each assignment with status "scheduled", strategy color/label
      - Batch store all records; if agent fails, no records stored
    - Implement `manual_schedule(input: ManualScheduleInput, user_id) -> ScheduledPostRecord`:
      - Fetch copy (verify ownership → 404/403)
      - Fetch associated strategy for color/label
      - Create ScheduledPostRecord with status "scheduled"
      - Store record
    - Implement `create_post(post_data, user_id) -> ScheduledPostRecord` with status "draft"
    - Implement `get_post(post_id, user_id) -> tuple[Optional[ScheduledPostRecord], bool]` with user isolation
    - Implement `list_posts_by_user(user_id) -> List[ScheduledPostRecord]` sorted by scheduledDate ascending
    - Implement `list_posts_by_strategy(strategy_id, user_id) -> List[ScheduledPostRecord]` with ownership verification
    - Implement `update_post(post_id, updates: ScheduledPostUpdate, user_id) -> ScheduledPostRecord` with ownership check and updatedAt
    - Implement `delete_post(post_id, user_id) -> tuple[bool, bool]` with user isolation
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 9.4_

  - [ ]* 7.2 Write property test for post persistence round-trip
    - **Property 3: Post Persistence Round-Trip**
    - Create `python/tests/test_scheduler_persistence_property.py`
    - Test that created posts can be retrieved by postId with matching fields and manual schedule posts have status "scheduled"
    - **Validates: Requirements 2.1, 2.2, 4.2**

  - [ ]* 7.3 Write property test for update round-trip
    - **Property 8: Update Round-Trip with Timestamp Advancement**
    - Create `python/tests/test_scheduler_update_property.py`
    - Test that updating fields and retrieving the post reflects updated values, updatedAt >= original, and invalid status values are rejected
    - **Validates: Requirements 4.3, 4.5, 4.6**

  - [ ]* 7.4 Write property test for error integrity
    - **Property 10: Errors Preserve Data Integrity**
    - Create `python/tests/test_scheduler_error_integrity_property.py`
    - Test that failed auto-schedule operations create no new records in the database
    - **Validates: Requirements 9.4**

  - [ ]* 7.5 Write property test for strategy metadata consistency
    - **Property 12: Strategy Metadata Consistency**
    - Create `python/tests/test_scheduler_strategy_metadata_property.py`
    - Test that strategyColor is deterministically derived from strategyId and strategyLabel matches the strategy's brandName
    - **Validates: Requirements 6.1, 6.3, 6.4, 6.5**

- [ ] 8. Create scheduler API routes
  - [ ] 8.1 Create `python/routes/scheduler.py`
    - Create APIRouter with prefix `/api/scheduler` and tags `["scheduler"]`
    - Initialize agent (mock or real based on `settings.use_mock_agent`)
    - Initialize scheduler_repository, copy_repository, strategy_repository
    - Initialize SchedulerService with dependencies
    - Implement `POST /auto-schedule` endpoint with AutoScheduleInput, auth, timeout handling, error handling (400, 403, 404, 500, 503, 504)
    - Implement `POST /manual-schedule` endpoint with ManualScheduleInput, auth, error handling
    - Implement `GET /posts` endpoint to list all user posts with auth
    - Implement `GET /posts/strategy/{strategy_id}` endpoint with auth, 404/403 handling
    - Implement `GET /posts/{post_id}` endpoint with auth, 404/403 handling
    - Implement `PUT /posts/{post_id}` endpoint with ScheduledPostUpdate, auth, 404/403 handling
    - Implement `DELETE /posts/{post_id}` endpoint with auth, 204 response, 404/403 handling
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 9.1, 9.2, 9.3, 9.5_

  - [ ]* 8.2 Write property test for authentication required
    - **Property 6: Authentication Required for All Scheduler Endpoints**
    - Create `python/tests/test_scheduler_auth_property.py`
    - Test that missing/expired/invalid JWT returns 401 for all scheduler endpoints
    - **Validates: Requirements 7.8**

- [ ] 9. **CHECKPOINT: Verify mock agent flow works**
  - Start Python service with USE_MOCK_AGENT=true
  - Test POST /api/scheduler/auto-schedule with a valid strategyId
  - Verify scheduled posts are returned with dates, times, platforms, strategy color/label
  - Test POST /api/scheduler/manual-schedule with a valid copyId, date, time, platform
  - Test GET /api/scheduler/posts returns stored posts sorted ascending
  - Test GET /api/scheduler/posts/strategy/{strategyId} returns filtered posts
  - Test GET /api/scheduler/posts/{postId} returns a specific post
  - Test PUT /api/scheduler/posts/{postId} updates a post
  - Test DELETE /api/scheduler/posts/{postId} deletes a post
  - Verify user isolation (different user gets 403)
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Real Scheduler Agent with Bedrock

- [ ] 10. Implement real scheduler agent
  - [ ] 10.1 Create `python/services/scheduler_agent.py`
    - Implement `SchedulerAgent` class following same pattern as `CopywriterAgent`
    - Initialize BedrockModel with AWS credentials and model_id
    - Create Agent with system prompt for social media scheduling optimization
    - System prompt should instruct the agent to:
      - Act as a social media scheduling optimizer
      - Analyze posting_schedule, platform_recommendations, content_themes from strategy
      - Distribute copies across optimal dates and times
      - Avoid duplicate posts on the same platform at the same date/time
      - Return structured AutoScheduleOutput
    - Implement `auto_schedule(strategy_data: dict, copies_data: List[dict]) -> AutoScheduleOutput`
      - Format strategy + copies data into a detailed prompt
      - Call `agent.invoke_async(prompt, structured_output_model=AutoScheduleOutput)`
      - Raise `StructuredOutputException` if structured_output is None
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 10.2 Write property test for no duplicate scheduling
    - **Property 9: Auto-Schedule No Duplicate Platform-Date-Time**
    - Create `python/tests/test_scheduler_no_duplicates_property.py`
    - Test that no two post assignments share the same (platform, scheduledDate, scheduledTime) and each references a valid copyId
    - **Validates: Requirements 1.3, 1.5**

- [ ] 11. Wire real agent into routes
  - [ ] 11.1 Update `python/routes/scheduler.py`
    - Import `SchedulerAgent` from `services.scheduler_agent`
    - When `settings.use_mock_agent` is False, instantiate `SchedulerAgent` with AWS config
    - Ensure timeout handling (60 seconds) wraps agent calls
    - _Requirements: 1.1, 7.1, 9.1, 9.2, 9.3_

- [ ] 12. **CHECKPOINT: Verify real agent generates schedules**
  - Set USE_MOCK_AGENT=false and ensure AWS credentials are configured
  - Auto-schedule copies from an existing strategy
  - Verify posts are distributed with optimal dates/times
  - Verify no duplicate platform+date+time combinations
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Frontend Integration

- [ ] 13. Create TypeScript types for scheduler data
  - [ ] 13.1 Create `types/scheduler.ts`
    - Define `ScheduledPost` interface with fields: `id`, `strategyId`, `copyId`, `userId`, `content`, `platform`, `hashtags`, `scheduledDate`, `scheduledTime`, `status` ('draft' | 'scheduled' | 'published'), `strategyColor`, `strategyLabel`, `createdAt`, `updatedAt`
    - Define `ManualScheduleInput` interface with fields: `copyId`, `scheduledDate`, `scheduledTime`, `platform`
    - Define `ScheduledPostUpdate` interface with optional fields: `scheduledDate`, `scheduledTime`, `content`, `platform`, `hashtags`, `status`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 14. Create scheduler API client
  - [ ] 14.1 Create `lib/api/schedulerClient.ts`
    - Follow same patterns as `copyClient.ts` and `strategyClient.ts`
    - Export `SchedulerAPIError` class for typed error handling
    - Implement `convertScheduledPost()` helper for snake_case to camelCase conversion
    - Implement `autoSchedule(strategyId: string): Promise<ScheduledPost[]>`
    - Implement `manualSchedule(input: ManualScheduleInput): Promise<ScheduledPost>`
    - Implement `listPosts(): Promise<ScheduledPost[]>`
    - Implement `listPostsByStrategy(strategyId: string): Promise<ScheduledPost[]>`
    - Implement `getPost(postId: string): Promise<ScheduledPost>`
    - Implement `updatePost(postId: string, data: ScheduledPostUpdate): Promise<ScheduledPost>`
    - Implement `deletePost(postId: string): Promise<void>`
    - Include JWT auth headers on all requests using getAuthToken pattern
    - Handle 401 (clear token, redirect to login), 403, 404 errors with descriptive messages
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 15. Update Next.js proxy config
  - [ ] 15.1 Update `next.config.ts`
    - Add rewrite rule for `/api/scheduler/*` to proxy to Python service (same pattern as `/api/strategy/*` and `/api/copy/*`)
    - _Requirements: 7.9_

- [ ] 16. Update Scheduler component to use API
  - [ ] 16.1 Update `components/dashboard/Scheduler.tsx`
    - Fetch posts from `schedulerClient.listPosts()` on mount instead of local state
    - Replace local state post mutations with API calls (manualSchedule, updatePost, deletePost)
    - Add "Auto Schedule" button next to "Schedule Post" with strategy selection dropdown
    - Show loading/error states during API operations
    - On create via SchedulingModal, call schedulerClient API and refresh calendar
    - On edit, call schedulerClient.updatePost and refresh calendar
    - On delete, call schedulerClient.deletePost and refresh calendar
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.8, 18.1_

- [ ] 17. Update Calendar and DateDetailsModal for strategy colors
  - [ ] 17.1 Update `components/dashboard/Calendar.tsx`
    - Accept `ScheduledPost[]` instead of `Post[]`
    - Use `strategyColor` for post indicator colors instead of hardcoded platform colors
    - Show strategy-colored dots/bars on calendar cells
    - _Requirements: 16.6_

  - [ ] 17.2 Update `components/dashboard/DateDetailsModal.tsx`
    - Display `strategyLabel` (brandName) for each post
    - Show strategy color indicator next to each post entry
    - _Requirements: 16.7_

- [ ] 18. Wire Publish button in CaptionEditor to manual scheduling
  - [ ] 18.1 Update `components/dashboard/CaptionEditor.tsx`
    - Wire "Publish" button to open a scheduling modal pre-filled with active copy data (content, platform, hashtags)
    - On confirm, call `schedulerClient.manualSchedule()` with copyId, date, time, platform
    - Show success/error feedback after scheduling
    - Disable Publish button when no copy is selected or scheduling is in progress
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

- [ ] 19. Add auto-schedule UI to Scheduler page
  - [ ] 19.1 Update `components/dashboard/Scheduler.tsx` (or scheduler page)
    - Add "Auto Schedule" button alongside "Schedule Post"
    - On click, display strategy selection dropdown listing user's strategies
    - On confirm, call `schedulerClient.autoSchedule(strategyId)`
    - Show loading indicator and disable button while in progress
    - On success, refresh calendar with newly scheduled posts
    - On failure, display error message with retry option
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

- [ ] 20. Update SchedulingModal for API integration
  - [ ] 20.1 Update `components/dashboard/SchedulingModal.tsx`
    - Accept optional pre-fill props for content, platform, hashtags (from CaptionEditor publish flow)
    - Support both "create new" and "edit existing" modes via API
    - _Requirements: 16.3, 16.4, 17.1, 17.2_

- [ ] 21. **CHECKPOINT: Verify frontend integration**
  - Navigate to /dashboard/scheduler
  - Verify posts load from API on mount
  - Create a post via SchedulingModal and verify it appears on calendar
  - Edit a post and verify changes persist
  - Delete a post and verify removal
  - Click "Auto Schedule" with a strategy and verify bulk posts appear
  - Navigate to /dashboard/copywriter, click Publish on a copy, verify scheduling modal opens
  - Confirm scheduling and verify post is created
  - Verify strategy colors and labels display correctly on calendar
  - Refresh page and verify all posts persist
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Polish and Remaining Properties

- [ ]* 22. Write property test for list sorting
  - **Property 7: List Results Sorted by ScheduledDate Ascending**
  - Create `python/tests/test_scheduler_sorting_property.py`
  - Test that listing posts by user or by strategy returns records ordered by scheduledDate ascending
  - **Validates: Requirements 5.1, 5.2, 5.4**

- [ ] 23. Add comprehensive error handling to scheduler routes
  - [ ] 23.1 Update `python/routes/scheduler.py` with full error handling
    - Add `asyncio.wait_for` timeout handling (60 seconds) on auto-schedule endpoint
    - Add `StructuredOutputException` handling (500)
    - Add `BotoCoreError`/`ClientError` handling (503)
    - Add logging for all error cases without exposing sensitive data
    - Ensure HTTPExceptions (400, 403, 404) are re-raised properly
    - Ensure no incomplete records stored on failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 24. **FINAL CHECKPOINT: Complete end-to-end verification**
  - Run both services (Next.js + Python)
  - Test complete scheduler journey:
    1. Log in as User A
    2. Navigate to /dashboard/scheduler
    3. Click "Auto Schedule" with an existing strategy
    4. Verify posts appear on calendar with strategy colors/labels
    5. Manually schedule a post via SchedulingModal
    6. Edit a post (change date/time) and verify update
    7. Delete a post and verify removal
    8. Navigate to /dashboard/copywriter
    9. Click Publish on a copy, schedule it, verify success
    10. Return to scheduler, verify the manually scheduled post appears
    11. Refresh page, verify all posts persist
    12. Log out, log in as User B
    13. Verify User B cannot see User A's posts (user isolation)
    14. Auto-schedule as User B from User B's strategy
  - Test error scenarios:
    1. Auto-schedule for non-existent strategy (404)
    2. Access another user's post (403)
    3. Send request without JWT (401)
    4. Manual schedule with invalid date format (400)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (12 properties)
- The existing `python/` service structure, auth middleware, strategy repository, and copy repository are reused
- The mock agent uses the same `USE_MOCK_AGENT` flag as the strategist and copywriter agents
