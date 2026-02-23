# Implementation Plan: Strategist Agent Backend

## Overview

This implementation plan follows an incremental, full-stack approach where backend and frontend are developed together. Each phase delivers a working, verifiable feature that can be tested end-to-end. This ensures we can see results immediately and catch integration issues early.

The implementation follows this sequence:
1. **Phase 1: Foundation** - Set up both Python and TypeScript projects with basic types
2. **Phase 2: Mock Agent** - Create a simple mock agent and display results on frontend (verify flow works)
3. **Phase 3: Real Agent** - Replace mock with Strands Agent and Bedrock integration
4. **Phase 4: Persistence** - Add DynamoDB storage and retrieval
5. **Phase 5: Authentication** - Add JWT authentication across services
6. **Phase 6: Polish** - Error handling, Docker, and production readiness

Each phase ends with a verification checkpoint where you can see the feature working in the browser.

## Tasks


## Phase 1: Foundation Setup (Backend + Frontend Types)

- [x] 1. Set up Python project structure
  - Create `python-service/` directory in project root
  - Create `requirements.txt` with FastAPI, uvicorn, pydantic, boto3, pytest
  - Create `main.py` as application entry point
  - Create directory structure: `models/`, `services/`, `routes/`, `tests/`
  - Set up virtual environment: `python -m venv venv`
  - Install dependencies: `pip install -r requirements.txt`
  - Create `.env.example` with AWS_REGION, JWT_SECRET placeholders
  - _Requirements: 11.1, 11.2_

- [x] 2. Create shared TypeScript types for strategy data
  - [x] 2.1 Create `types/strategy.ts` with interfaces
    - Define `StrategyInput` interface (brandName, industry, targetAudience, goals)
    - Define `PlatformRecommendation` interface (platform, rationale, priority)
    - Define `StrategyOutput` interface (contentPillars, postingSchedule, platformRecommendations, contentThemes, engagementTactics, visualPrompts)
    - Define `StrategyRecord` interface (id, userId, ...input fields, strategyOutput, createdAt)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Create matching Pydantic models in Python
  - [x] 3.1 Create `python-service/models/strategy.py`
    - Implement `StrategyInput` model matching TypeScript interface
    - Implement `PlatformRecommendation` model
    - Implement `StrategyOutput` model with field descriptions and constraints
    - Add `visual_prompts` field (List[str], min_items=2, max_items=3) with description about alignment with content themes
    - Implement `StrategyRecord` model
    - Add Pydantic validators for min_length=1 on required fields
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 3.2 Write unit tests for Pydantic validation
    - Test empty strings are rejected
    - Test content_pillars requires 3-6 items
    - Test platform_recommendations requires at least 2 items
    - Test visual_prompts requires 2-3 items
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.7_

## Phase 2: Mock Agent + Basic Frontend (Verify End-to-End Flow)

- [x] 4. Create mock agent service (returns hardcoded strategy)
  - [x] 4.1 Create `python-service/services/mock_agent.py`
    - Implement `MockStrategistAgent` class
    - Implement `generate_strategy()` method that returns hardcoded StrategyOutput
    - Use realistic sample data (3-5 content pillars, 2-3 platforms, 2-3 visual prompts, etc.)
    - Include sample visual prompts that align with mock content themes (e.g., "Professional office workspace with team collaboration" for B2B content)
    - Add 1-second delay to simulate API call
    - _Requirements: 2.3, 3.8_

- [x] 5. Create basic FastAPI endpoint with mock agent
  - [x] 5.1 Create `python-service/routes/strategy.py`
    - Implement POST `/api/strategy/generate` endpoint
    - Accept StrategyInput, validate with Pydantic
    - Call mock agent to generate strategy
    - Return StrategyOutput as JSON
    - Add CORS middleware to allow Next.js origin
    - _Requirements: 6.1, 6.8_

  - [x] 5.2 Update `python-service/main.py`
    - Create FastAPI app instance
    - Configure CORS for http://localhost:3000
    - Register strategy routes
    - Add `/health` endpoint
    - Run with: `uvicorn main:app --reload --port 8000`
    - _Requirements: 6.8_

- [x] 6. Create API client in Next.js
  - [x] 6.1 Create `lib/api/strategyClient.ts`
    - Implement `generateStrategy(input: StrategyInput): Promise<StrategyOutput>`
    - Call POST http://localhost:8000/api/strategy/generate
    - Add error handling for network errors
    - Return typed response
    - _Requirements: 6.1_

- [x] 7. Create StrategyDisplay component
  - [x] 7.1 Create `components/dashboard/StrategyDisplay.tsx`
    - Accept `strategy: StrategyOutput` prop
    - Display content pillars as cards or list
    - Display posting schedule
    - Display platform recommendations with priority badges
    - Display content themes
    - Display engagement tactics
    - Display visual prompts in a dedicated section (e.g., "Image Ideas" or "Visual Concepts")
    - Style visual prompts to indicate they're for image generation
    - Use existing UI components (Card, Button) for consistency
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 8. Update StrategyForm to call API and show results
  - [x] 8.1 Update `components/dashboard/StrategyForm.tsx`
    - Import `generateStrategy` from strategyClient
    - Add state for loading and generated strategy
    - On form submit, call `generateStrategy()` with form data
    - Show loading spinner while generating
    - Pass generated strategy to StrategyDisplay component
    - Add error message display for failures
    - _Requirements: 6.1_

- [x] 9. Update Strategist page to integrate components
  - [x] 9.1 Update `app/dashboard/strategist/page.tsx`
    - Import StrategyForm and StrategyDisplay
    - Render StrategyForm
    - Conditionally render StrategyDisplay when strategy exists
    - Add simple layout with sections
    - _Requirements: 6.1_

- [x] 10. **CHECKPOINT: Verify mock agent flow works**
  - Start Python service: `cd python-service && uvicorn main:app --reload --port 8000`
  - Start Next.js: `npm run dev`
  - Navigate to /dashboard/strategist
  - Fill out form and submit
  - Verify hardcoded strategy appears on screen
  - Verify loading state shows during generation
  - **This proves the full stack communication works!**

## Phase 3: Real Strands Agent Integration

- [ ] 11. Add Strands Agents SDK and AWS dependencies
  - [ ] 11.1 Update `python-service/requirements.txt`
    - Add `strands-agents` package
    - Add `boto3` for AWS SDK
    - Add `python-jose[cryptography]` for JWT
    - Install: `pip install -r requirements.txt`
    - _Requirements: 2.1, 8.1_

- [ ] 12. Create configuration management
  - [ ] 12.1 Create `python-service/config.py`
    - Define `Settings` class with Pydantic BaseSettings
    - Add AWS credentials (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    - Add JWT_SECRET
    - Add BEDROCK_MODEL_ID (default: anthropic.claude-4-sonnet-20250514-v1:0)
    - Add FRONTEND_URL for CORS
    - Load from environment variables
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ]* 12.2 Write test for missing credentials
    - Test that missing AWS credentials raise error
    - _Requirements: 8.3_

- [ ] 13. Implement real Strands Agent
  - [ ] 13.1 Create `python-service/services/strategist_agent.py`
    - Import Agent, BedrockProvider from strands_agents
    - Implement `StrategistAgent` class
    - Initialize BedrockProvider with AWS region and model ID
    - Create Agent with system prompt and structured_output_model=StrategyOutput
    - Implement detailed system prompt (social media strategy expert)
    - Add instructions in system prompt to generate visual_prompts that align with content themes and engagement tactics
    - Emphasize that visual prompts should be specific and relevant, not generic
    - Implement `generate_strategy()` method that formats input and calls agent
    - Extract structured_output from agent response
    - Raise StructuredOutputException if missing
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [ ]* 13.2 Write property test for agent output schema
    - **Property 6: Agent Output Conforms to Schema**
    - Verify visual_prompts field has 2-3 items
    - **Validates: Requirements 2.5, 2.6, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 9.4**

- [ ] 14. Replace mock agent with real agent in routes
  - [ ] 14.1 Update `python-service/routes/strategy.py`
    - Replace MockStrategistAgent with StrategistAgent
    - Add timeout handling (60 seconds)
    - Add try-except for Bedrock errors (return 503)
    - Add try-except for StructuredOutputException (return 500)
    - Add try-except for timeout (return 504)
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 15. **CHECKPOINT: Verify real agent generates strategies**
  - Ensure AWS credentials are set in environment
  - Restart Python service
  - Fill out form in browser with real brand info
  - Verify Claude generates a real, customized strategy
  - Verify strategy appears correctly formatted on screen
  - **Verify visual prompts are displayed and align with the content themes/tactics**
  - **This proves the Strands Agent integration works!**

## Phase 4: Add Database Persistence

- [ ] 16. Create DynamoDB table with Terraform
  - [ ] 16.1 Create `terraform/strategies-table.tf`
    - Define aws_dynamodb_table resource
    - Set hash_key to "strategyId"
    - Define attributes: strategyId (S), userId (S), createdAt (S)
    - Create UserIdIndex GSI (userId hash, createdAt sort)
    - Enable point-in-time recovery and encryption
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 16.2 Apply Terraform
    - Run `terraform init`
    - Run `terraform plan`
    - Run `terraform apply`
    - Note the table name for environment variables

- [ ] 17. Implement DynamoDB repository
  - [ ] 17.1 Create `python-service/repositories/strategy_repository.py`
    - Initialize DynamoDB resource with boto3
    - Implement `create_strategy(record: StrategyRecord) -> StrategyRecord`
    - Implement `get_strategy_by_id(strategy_id: str, user_id: str) -> Optional[StrategyRecord]`
    - Implement `list_strategies_by_user(user_id: str) -> List[StrategyRecord]`
    - Implement `_item_to_record()` helper
    - Enforce user isolation in get_strategy_by_id
    - _Requirements: 4.1, 4.7, 5.2, 5.3_

  - [ ]* 17.2 Write property test for user isolation
    - **Property 10: Strategy Records Enforce User Isolation**
    - **Validates: Requirements 4.7, 5.2, 5.4**

  - [ ]* 17.3 Write property test for record completeness
    - **Property 9: Strategy Records Are Complete**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**

- [ ] 18. Create service layer with persistence
  - [ ] 18.1 Create `python-service/services/strategy_service.py`
    - Implement `StrategyService` class
    - Inject agent and repository dependencies
    - Implement `generate_and_store_strategy()` - generates then stores
    - Implement `get_user_strategies()` - retrieves all user strategies
    - Implement `get_strategy()` - retrieves specific strategy with user check
    - Ensure errors don't create incomplete records
    - _Requirements: 4.1, 5.2, 7.4_

  - [ ]* 18.2 Write property test for persistence
    - **Property 8: Generated Strategies Are Persisted**
    - **Validates: Requirements 4.1**

  - [ ]* 18.3 Write property test for error prevention
    - **Property 13: Errors Prevent Incomplete Storage**
    - **Validates: Requirements 7.4**

- [ ] 19. Add persistence endpoints to API
  - [ ] 19.1 Update `python-service/routes/strategy.py`
    - Update POST /generate to use strategy_service.generate_and_store_strategy()
    - Add GET `/api/strategy/list` endpoint (returns all user strategies)
    - Add GET `/api/strategy/{strategy_id}` endpoint (returns specific strategy)
    - Add 404 handling for non-existent strategies
    - For now, use hardcoded user_id="test-user" (auth comes next phase)
    - _Requirements: 6.2, 6.3, 6.7_

- [ ] 20. Add strategy list to frontend
  - [ ] 20.1 Update `lib/api/strategyClient.ts`
    - Add `listStrategies(): Promise<StrategyRecord[]>`
    - Add `getStrategy(id: string): Promise<StrategyRecord>`
    - _Requirements: 6.2, 6.3_

  - [ ] 20.2 Create `components/dashboard/StrategyList.tsx`
    - Fetch strategies on mount using listStrategies()
    - Display as cards with brand name, industry, created date
    - Add click handler to view full strategy
    - Show loading state and empty state
    - _Requirements: 5.1, 5.3, 5.5_

  - [ ] 20.3 Update `app/dashboard/strategist/page.tsx`
    - Add StrategyList component
    - Add tabs or sections: "Generate New" and "Saved Strategies"
    - Allow clicking saved strategy to view details
    - _Requirements: 6.2, 6.3_

- [ ] 21. **CHECKPOINT: Verify persistence works**
  - Generate a strategy through the form
  - Refresh the page
  - Verify the strategy appears in "Saved Strategies" list
  - Click on saved strategy to view details
  - Generate another strategy
  - Verify both appear in list, sorted by date (newest first)
  - **This proves database persistence works!**

## Phase 5: Add Authentication

- [ ] 22. Implement JWT authentication middleware
  - [ ] 22.1 Create `python-service/middleware/auth.py`
    - Implement `AuthMiddleware` class
    - Implement `get_current_user()` dependency
    - Extract JWT from Authorization header
    - Validate JWT using JWT_SECRET from config
    - Extract userId from token payload
    - Return 401 for missing/expired/invalid tokens
    - _Requirements: 1.1, 6.4, 6.5_

  - [ ]* 22.2 Write property test for authentication
    - **Property 3: Authentication Required for Protected Endpoints**
    - **Validates: Requirements 1.1, 6.4**

  - [ ]* 22.3 Write property test for 401 responses
    - **Property 4: Unauthenticated Requests Return 401**
    - **Validates: Requirements 6.5**

- [ ] 23. Add authentication to all endpoints
  - [ ] 23.1 Update `python-service/routes/strategy.py`
    - Add `user_id: str = Depends(auth_middleware.get_current_user)` to all endpoints
    - Remove hardcoded "test-user"
    - Use authenticated user_id for all operations
    - Add 403 handling when user tries to access another user's strategy
    - _Requirements: 1.1, 6.4, 6.5, 6.6_

  - [ ]* 23.2 Write property test for cross-user access
    - **Property 12: Cross-User Access Returns 403**
    - **Validates: Requirements 6.6**

- [ ] 24. Update frontend API client to send JWT
  - [ ] 24.1 Update `lib/api/strategyClient.ts`
    - Get JWT token from AuthContext or localStorage
    - Add Authorization header to all requests: `Bearer ${token}`
    - Handle 401 errors (redirect to login)
    - Handle 403 errors (show access denied message)
    - _Requirements: 6.4, 6.5, 6.6_

- [ ] 25. **CHECKPOINT: Verify authentication works**
  - Log in as User A
  - Generate a strategy
  - Verify it appears in User A's list
  - Log out and log in as User B
  - Verify User B sees empty list (not User A's strategies)
  - Generate strategy as User B
  - Verify User B sees only their own strategy
  - **This proves user isolation works!**

## Phase 6: Polish and Production Readiness

- [ ] 26. Add comprehensive error handling
  - [ ] 26.1 Create `python-service/utils/errors.py`
    - Define `StructuredOutputException` custom exception
    - Define error response models
    - _Requirements: 3.8, 7.2_

  - [ ] 26.2 Add error handling decorator
    - Create `@handle_agent_errors` decorator
    - Handle timeouts (504)
    - Handle Bedrock errors (503)
    - Handle agent errors (500)
    - Log errors without exposing sensitive data
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ] 26.3 Create `components/dashboard/StrategyErrorBoundary.tsx`
    - Implement React error boundary
    - Display user-friendly error messages
    - Add retry button
    - _Requirements: 7.2, 7.5_

- [ ] 27. Add input validation and error display
  - [ ]* 27.1 Write property test for input validation
    - **Property 1: Input Validation Rejects Invalid Fields**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**

  - [ ]* 27.2 Write property test for validation errors
    - **Property 2: Invalid Input Returns Descriptive Errors**
    - **Validates: Requirements 1.6**

  - [ ] 27.3 Update StrategyForm to show validation errors
    - Display field-specific error messages
    - Highlight invalid fields
    - _Requirements: 1.6_

- [ ] 28. Set up Docker and docker-compose
  - [ ] 28.1 Create `python-service/Dockerfile`
    - Use python:3.11-slim base image
    - Copy requirements and install dependencies
    - Copy application code
    - Expose port 8000
    - CMD: uvicorn main:app --host 0.0.0.0 --port 8000
    - _Requirements: 11.3_

  - [ ] 28.2 Create `docker-compose.yml` at project root
    - Define nextjs service (port 3000)
    - Define python-service (port 8000)
    - Share environment variables (AWS, JWT, DynamoDB)
    - Set up service dependencies
    - _Requirements: 11.2, 11.3, 11.4_

  - [ ] 28.3 Update `next.config.ts` with API proxy
    - Add rewrites to proxy /api/strategy/* to Python service
    - Use PYTHON_SERVICE_URL environment variable
    - _Requirements: 11.5_

- [ ] 29. Create deployment documentation
  - [ ] 29.1 Create `python-service/README.md`
    - Document local development setup
    - Document environment variables
    - Document API endpoints
    - Document Docker deployment
    - _Requirements: 11.8_

  - [ ] 29.2 Update root `README.md`
    - Add section on running both services
    - Document microservices architecture
    - Add troubleshooting guide
    - _Requirements: 11.8_

- [ ]* 30. Write property test for sorted strategies
  - **Property 11: User Strategies Sorted by Date Descending**
  - **Validates: Requirements 5.3**

- [ ] 31. **FINAL CHECKPOINT: Complete end-to-end verification**
  - Run both services with docker-compose
  - Test complete user journey:
    1. Sign up / Log in
    2. Generate strategy with real brand info
    3. View generated strategy on screen
    4. Navigate to saved strategies
    5. Verify strategy appears in list
    6. Click to view saved strategy details
    7. Generate another strategy
    8. Verify both strategies appear, newest first
    9. Log out and log in as different user
    10. Verify user isolation (can't see other user's strategies)
  - Test error scenarios:
    1. Submit form with empty fields (see validation errors)
    2. Disconnect internet (see network error)
    3. Use invalid JWT (see 401 error)
  - **This proves the entire system works end-to-end!**

## Notes
  - Create `python-service/` directory in project root
  - Create `requirements.txt` with FastAPI, Strands Agents SDK, boto3, pydantic, pytest, hypothesis
  - Create `main.py` as application entry point
  - Create directory structure: `models/`, `services/`, `repositories/`, `middleware/`, `routes/`, `tests/`
  - Set up virtual environment and install dependencies
  - Create `.env.example` with required environment variables
  - _Requirements: 11.1, 11.2_
