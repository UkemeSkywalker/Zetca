# Implementation Plan: Copywriter Agent Backend

## Overview

This implementation plan extends the existing Python FastAPI service at `python/` with AI-powered social media copy generation. The Copywriter Agent consumes strategy data from the Strategist Agent and generates platform-specific copies with hashtags. Users can also chat with the AI to refine individual copies.

The implementation follows the same phased approach as the Strategist Agent Backend:
1. **Phase 1: Foundation** - Pydantic models, DynamoDB table, config updates
2. **Phase 2: Mock Agent + Routes** - Mock copywriter agent, copy repository, service layer, API routes
3. **Phase 3: Real Agent** - Strands SDK copywriter agent with Bedrock
4. **Phase 4: Frontend Integration** - Update CaptionEditor, API client, copywriter page
5. **Phase 5: Polish** - Error handling, chat refinement, final wiring

Each phase ends with a verification checkpoint.

## Tasks

## Phase 1: Foundation (Models, Table, Config)

- [x] 1. Create Pydantic models for copy data
  - [x] 1.1 Create `python/models/copy.py`
    - Define `CopyGenerateInput` model with `strategy_id` field (non-empty string, validator)
    - Define `CopyItem` model with `text`, `platform`, `hashtags` fields
    - Define `CopyOutput` model with `copies` field (List[CopyItem], min_length=1)
    - Define `CopyRecord` model with `id`, `strategy_id`, `user_id`, `text`, `platform`, `hashtags`, `created_at`, `updated_at`
    - Define `ChatRequest` model with `message` field (non-empty string, validator)
    - Define `ChatResponse` model with `updated_text`, `updated_hashtags`, `ai_message` fields
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 1.2 Write property test for input validation
    - **Property 1: Input Validation Rejects Whitespace**
    - Test that whitespace-only or empty strings are rejected for `strategy_id` in CopyGenerateInput and `message` in ChatRequest
    - **Validates: Requirements 10.1, 10.5**

  - [ ]* 1.3 Write property test for Pydantic JSON round-trip
    - **Property 2: Pydantic Model JSON Serialization Round-Trip**
    - Test that CopyItem, CopyOutput, CopyRecord, ChatRequest, ChatResponse survive JSON serialize/deserialize
    - **Validates: Requirements 1.7, 10.2, 10.3, 10.4, 10.6, 10.7**

- [x] 2. Create DynamoDB copies table with Terraform
  - [x] 2.1 Create `terraform/copies-table.tf`
    - Define `aws_dynamodb_table` resource for copies table
    - Set `copyId` as partition key (String)
    - Define attributes: `copyId` (S), `strategyId` (S), `userId` (S), `createdAt` (S)
    - Create `StrategyIdIndex` GSI with `strategyId` hash key and `createdAt` range key
    - Create `UserIdIndex` GSI with `userId` hash key and `createdAt` range key
    - Set PAY_PER_REQUEST billing, enable PITR and encryption
    - Table name pattern: `copies-${var.environment}`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 3. Update configuration and app registration
  - [x] 3.1 Update `python/config.py`
    - Add `dynamodb_copies_table: str = "copies-dev"` to Settings class
    - _Requirements: 8.7_

  - [x] 3.2 Update `python/main.py`
    - Import and register copy router: `from routes.copy import router as copy_router`
    - Add `app.include_router(copy_router)`
    - Update app title/description to reflect both strategy and copy services
    - _Requirements: 5.7_

- [x] 4. **CHECKPOINT: Verify foundation**
  - Ensure Pydantic models validate correctly (run model unit tests)
  - Ensure Terraform plan succeeds for copies table
  - Ensure Python service starts without errors with new config
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Mock Agent + Repository + Service + Routes

- [x] 5. Create copy repository for DynamoDB
  - [x] 5.1 Create `python/repositories/copy_repository.py`
    - Initialize DynamoDB resource with boto3
    - Implement `create_copy(record: CopyRecord) -> CopyRecord`
    - Implement `create_copies(records: List[CopyRecord]) -> List[CopyRecord]` for batch storage
    - Implement `get_copy_by_id(copy_id: str, user_id: str) -> Optional[CopyRecord]` with user isolation
    - Implement `copy_exists(copy_id: str) -> bool`
    - Implement `list_copies_by_strategy(strategy_id: str) -> List[CopyRecord]` using StrategyIdIndex GSI, sorted descending
    - Implement `list_copies_by_user(user_id: str) -> List[CopyRecord]` using UserIdIndex GSI
    - Implement `update_copy(copy_id: str, text: str, hashtags: List[str]) -> CopyRecord` with updatedAt
    - Implement `delete_copy(copy_id: str) -> bool`
    - Implement `_item_to_record()` helper to convert DynamoDB items to CopyRecord
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.3, 6.5_

  - [x] 5.2 Write property test for CopyRecord completeness
    - **Property 4: CopyRecord Completeness**
    - Test that stored CopyRecords contain all required fields: non-empty copyId, strategyId, userId, text, platform, hashtags list, valid createdAt, valid updatedAt
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

  - [ ] 5.3 Write property test for user isolation
    - **Property 5: User Isolation Across All Copy Operations**
    - Test that user A's copies are inaccessible to user B across get, list, chat, and delete operations
    - **Validates: Requirements 1.9, 3.2, 3.6, 4.9, 6.1, 6.2, 6.3, 6.4**

- [x] 6. Create mock copywriter agent
  - [x] 6.1 Create `python/services/mock_copywriter_agent.py`
    - Implement `MockCopywriterAgent` class
    - Implement `generate_copies(strategy_data: dict) -> CopyOutput` returning realistic sample copies
    - Generate copies for platforms from strategy data's platform_recommendations
    - Include platform-appropriate text and hashtags in mock output
    - Add 1-second simulated delay
    - Implement `chat_refine(copy_text, platform, hashtags, strategy_data, user_message) -> ChatResponse`
    - Return mock ChatResponse with updated text, hashtags, and AI explanation message
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 6.2 Write property test for mock agent interface compatibility
    - **Property 10: Mock Agent Interface Compatibility**
    - Test that MockCopywriterAgent accepts the same inputs and returns the same Pydantic model types as the real agent interface
    - **Validates: Requirements 9.4**

- [x] 7. Create copy service layer
  - [x] 7.1 Create `python/services/copy_service.py`
    - Implement `CopyService` class with agent, copy_repository, and strategy_repository dependencies
    - Implement `generate_copies(strategy_id, user_id) -> List[CopyRecord]`:
      - Fetch strategy from strategy_repository (verify ownership, raise 404/403)
      - Call agent.generate_copies() with strategy data
      - Store each CopyItem as a CopyRecord in copy_repository
      - Ensure no copies are stored if agent fails (error integrity)
    - Implement `get_copies_by_strategy(strategy_id, user_id) -> List[CopyRecord]`:
      - Verify strategy ownership first
      - Return copies sorted by createdAt descending
      - Return empty array if no copies exist
    - Implement `get_copy(copy_id, user_id) -> tuple[Optional[CopyRecord], bool]`:
      - Return (record, False) if found and owned by user
      - Return (None, True) if exists but belongs to another user
      - Return (None, False) if not found
    - Implement `chat_refine_copy(copy_id, message, user_id) -> tuple[ChatResponse, CopyRecord]`:
      - Fetch copy (verify ownership)
      - Fetch associated strategy for brand context
      - Call agent.chat_refine() with copy, strategy, and user message
      - Update copy in DB with new text/hashtags/updatedAt
      - Do NOT update copy if agent fails
    - Implement `delete_copy(copy_id, user_id) -> tuple[bool, bool]`:
      - Return (True, False) if deleted successfully
      - Return (False, True) if belongs to another user
      - Return (False, False) if not found
    - _Requirements: 1.1, 1.2, 1.8, 1.9, 2.1, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.5, 6.1, 6.2, 6.3, 6.4, 7.4, 7.5_

  - [ ]* 7.2 Write property test for copy persistence round-trip
    - **Property 3: Copy Persistence Round-Trip**
    - Test that generated copies can be retrieved by strategyId with matching fields
    - **Validates: Requirements 2.1, 3.1**

  - [ ]* 7.3 Write property test for error integrity
    - **Property 9: Errors Preserve Data Integrity**
    - Test that failed generation stores no copies, and failed chat leaves copy unchanged
    - **Validates: Requirements 7.4, 7.5**

- [x] 8. Create copy API routes
  - [x] 8.1 Create `python/routes/copy.py`
    - Create APIRouter with prefix `/api/copy` and tags `["copy"]`
    - Initialize agent (mock or real based on `settings.use_mock_agent`)
    - Initialize copy_repository and strategy_repository
    - Initialize CopyService with dependencies
    - Implement `POST /generate` endpoint:
      - Accept CopyGenerateInput, validate with Pydantic
      - Use auth middleware for user_id
      - Call copy_service.generate_copies()
      - Handle 404 (strategy not found), 403 (not owner), 503 (Bedrock), 504 (timeout), 500 (agent error)
      - Return List[CopyRecord]
    - Implement `GET /list/{strategy_id}` endpoint:
      - Use auth middleware for user_id
      - Call copy_service.get_copies_by_strategy()
      - Handle 404, 403
      - Return List[CopyRecord]
    - Implement `GET /{copy_id}` endpoint:
      - Use auth middleware for user_id
      - Call copy_service.get_copy()
      - Handle 404, 403
      - Return CopyRecord
    - Implement `POST /{copy_id}/chat` endpoint:
      - Accept ChatRequest, validate with Pydantic
      - Use auth middleware for user_id
      - Call copy_service.chat_refine_copy()
      - Handle 404, 403, 503, 504, 500
      - Return ChatResponse
    - Implement `DELETE /{copy_id}` endpoint:
      - Use auth middleware for user_id
      - Call copy_service.delete_copy()
      - Handle 404, 403
      - Return 204 No Content
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.1, 7.2, 7.3, 7.6_

  - [x] 8.2 Write property test for authentication required
    - **Property 6: Authentication Required for All Copy Endpoints**
    - Test that missing/expired/invalid JWT returns 401 for all copy endpoints
    - **Validates: Requirements 5.6**

- [x] 9. **CHECKPOINT: Verify mock agent flow works**
  - Start Python service with USE_MOCK_AGENT=true
  - Test POST /api/copy/generate with a valid strategyId (from existing strategy)
  - Verify copies are returned with platform-specific text and hashtags
  - Test GET /api/copy/list/{strategyId} returns stored copies
  - Test GET /api/copy/{copyId} returns a specific copy
  - Test POST /api/copy/{copyId}/chat with a refinement message
  - Test DELETE /api/copy/{copyId}
  - Verify user isolation (different user gets 403)
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Real Copywriter Agent with Bedrock

- [x] 10. Implement real copywriter agent
  - [x] 10.1 Create `python/services/copywriter_agent.py`
    - Implement `CopywriterAgent` class following same pattern as `StrategistAgent`
    - Initialize BedrockModel with AWS credentials and model_id
    - Create Agent with system prompt for social media copywriting
    - System prompt should instruct the agent to:
      - Act as an expert social media copywriter
      - Generate platform-specific copy (tone, length, style per platform)
      - Include relevant hashtags per platform
      - Use strategy data (content pillars, themes, tactics, audience) as context
      - Generate one copy per platform from platform_recommendations
    - Implement `generate_copies(strategy_data: dict) -> CopyOutput`:
      - Format strategy data into a detailed prompt
      - Call `agent.invoke_async(prompt, structured_output_model=CopyOutput)`
      - Return `result.structured_output`
      - Raise `StructuredOutputException` if structured_output is None
    - Implement `chat_refine(copy_text, platform, hashtags, strategy_data, user_message) -> ChatResponse`:
      - Format existing copy + strategy context + user message into prompt
      - Call `agent.invoke_async(prompt, structured_output_model=ChatResponse)`
      - Return `result.structured_output`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 11. Wire real agent into routes
  - [ ] 11.1 Update `python/routes/copy.py`
    - Import `CopywriterAgent` from `services.copywriter_agent`
    - When `settings.use_mock_agent` is False, instantiate `CopywriterAgent` with AWS config
    - Ensure timeout handling (60 seconds) wraps agent calls
    - _Requirements: 1.1, 7.1, 7.3_

- [ ] 12. **CHECKPOINT: Verify real agent generates copies**
  - Set USE_MOCK_AGENT=false and ensure AWS credentials are configured
  - Generate copies from an existing strategy
  - Verify copies are platform-specific with appropriate tone and hashtags
  - Test chat refinement with the real agent
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Frontend Integration

- [ ] 13. Create TypeScript types for copy data
  - [ ] 13.1 Update `types/agent.ts`
    - Add `CopyRecord` interface with fields: `id`, `strategyId`, `userId`, `text`, `platform`, `hashtags`, `createdAt`, `updatedAt`
    - Add `ChatResponse` interface with fields: `updatedText`, `updatedHashtags`, `aiMessage`
    - Keep existing `Caption` type for backward compatibility or replace with `CopyRecord`
    - _Requirements: 10.2, 10.4, 10.6_

- [ ] 14. Create copy API client
  - [ ] 14.1 Create `lib/api/copyClient.ts`
    - Implement `generateCopies(strategyId: string): Promise<CopyRecord[]>`
      - POST to `/api/copy/generate` with `{ strategy_id: strategyId }`
      - Include JWT Authorization header
      - Convert snake_case response to camelCase
    - Implement `listCopies(strategyId: string): Promise<CopyRecord[]>`
      - GET `/api/copy/list/{strategyId}`
      - Include JWT Authorization header
    - Implement `getCopy(copyId: string): Promise<CopyRecord>`
      - GET `/api/copy/{copyId}`
      - Include JWT Authorization header
    - Implement `chatRefineCopy(copyId: string, message: string): Promise<ChatResponse>`
      - POST to `/api/copy/{copyId}/chat` with `{ message }`
      - Include JWT Authorization header
    - Implement `deleteCopy(copyId: string): Promise<void>`
      - DELETE `/api/copy/{copyId}`
      - Include JWT Authorization header
    - Handle 401 (redirect to login), 403 (access denied), 404 (not found) errors
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 15. Update CaptionEditor to use real backend
  - [ ] 15.1 Update `components/dashboard/CaptionEditor.tsx`
    - Remove import of `mockCaptionsData` from `data/mockCaptions.json`
    - Remove dependency on `useAgentContext` for captions (use local state + API)
    - Add strategy selection: fetch user's strategies via `listStrategies()` from strategyClient
    - Add "Generate Copies" button that calls `generateCopies(strategyId)` from copyClient
    - Display generated copies grouped by platform (keep existing platform tabs UI)
    - Add loading state during copy generation
    - Add error state display for generation failures
    - For each copy, add a chat input field for refinement
    - On chat submit, call `chatRefineCopy(copyId, message)` and update the copy in local state
    - Display AI explanation message from ChatResponse
    - Add delete button per copy that calls `deleteCopy(copyId)`
    - On mount, if a strategyId is selected, load existing copies via `listCopies(strategyId)`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.4, 4.1, 4.5, 5.5_

- [ ] 16. Update Next.js proxy config
  - [ ] 16.1 Update `next.config.ts`
    - Add rewrite rule for `/api/copy/*` to proxy to Python service (same pattern as `/api/strategy/*`)
    - _Requirements: 5.7_

- [ ] 17. **CHECKPOINT: Verify frontend integration**
  - Navigate to /dashboard/copywriter
  - Select a strategy from the dropdown
  - Click "Generate Copies" and verify copies appear grouped by platform
  - Edit a copy via chat refinement and verify the update
  - Delete a copy and verify it's removed
  - Refresh the page and verify copies persist (loaded from API)
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Polish and Remaining Properties

- [ ]* 18. Write property test for copies sorted descending
  - **Property 7: Copies Sorted by CreatedAt Descending**
  - Test that listing copies by strategy returns them newest-first
  - **Validates: Requirements 3.3**

- [ ]* 19. Write property test for chat refinement updates
  - **Property 8: Chat Refinement Updates Copy and Timestamp**
  - Test that after chat refinement, the CopyRecord reflects updated text/hashtags and updatedAt >= original
  - **Validates: Requirements 4.6, 4.7**

- [ ] 20. Add error handling to copy routes
  - [ ] 20.1 Update `python/routes/copy.py` with comprehensive error handling
    - Add timeout handling with `asyncio.wait_for` (60 seconds) on generate and chat endpoints
    - Add `StructuredOutputException` handling (500)
    - Add `BotoCoreError`/`ClientError` handling (503)
    - Add logging for all error cases without exposing sensitive data
    - Ensure HTTPExceptions (403, 404) are re-raised properly
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 21. **FINAL CHECKPOINT: Complete end-to-end verification**
  - Run both services (Next.js + Python)
  - Test complete copywriter journey:
    1. Log in as User A
    2. Navigate to /dashboard/copywriter
    3. Select an existing strategy
    4. Generate copies → verify platform-specific copies appear
    5. Use chat to refine a copy → verify update
    6. Delete a copy → verify removal
    7. Refresh page → verify copies persist
    8. Log out, log in as User B
    9. Verify User B cannot see User A's copies (user isolation)
    10. Generate copies as User B from User B's strategy
  - Test error scenarios:
    1. Generate copies for non-existent strategy (404)
    2. Access another user's copy (403)
    3. Send request without JWT (401)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The existing `python/` service structure, auth middleware, and strategy repository are reused
- The mock agent uses the same `USE_MOCK_AGENT` flag as the strategist
