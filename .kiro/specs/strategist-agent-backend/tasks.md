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

- [ ] 3. Create matching Pydantic models in Python
  - [ ] 3.1 Create `python-service/models/strategy.py`
    - Implement `StrategyInput` model matching TypeScript interface
    - Implement `PlatformRecommendation` model
    - Implement `StrategyOutput` model with field descriptions and constraints
    - Add `visual_prompts` field (List[str], min_items=2, max_items=3) with description about alignment with content themes
    - Implement `StrategyRecord` model
    - Add Pydantic validators for min_length=1 on required fields
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 3.2 Write unit tests for Pydantic validation
    - Test empty strings are rejected
    - Test content_pillars requires 3-6 items
    - Test platform_recommendations requires at least 2 items
    - Test visual_prompts requires 2-3 items
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.7_

## Phase 2: Mock Agent + Basic Frontend (Verify End-to-End Flow)

- [ ] 4. Create mock agent service (returns hardcoded strategy)
  - [ ] 4.1 Create `python-service/services/mock_agent.py`
    - Implement `MockStrategistAgent` class
    - Implement `generate_strategy()` method that returns hardcoded StrategyOutput
    - Use realistic sample data (3-5 content pillars, 2-3 platforms, 2-3 visual prompts, etc.)
    - Include sample visual prompts that align with mock content themes (e.g., "Professional office workspace with team collaboration" for B2B content)
    - Add 1-second delay to simulate API call
    - _Requirements: 2.3, 3.8_

- [ ] 5. Create basic FastAPI endpoint with mock agent
  - [ ] 5.1 Create `python-service/routes/strategy.py`
    - Implement POST `/api/strategy/generate` endpoint
    - Accept StrategyInput, validate with Pydantic
    - Call mock agent to generate strategy
    - Return StrategyOutput as JSON
    - Add CORS middleware to allow Next.js origin
    - _Requirements: 6.1, 6.8_

  - [ ] 5.2 Update `python-service/main.py`
    - Create FastAPI app instance
    - Configure CORS for http://localhost:3000
    - Register strategy routes
    - Add `/health` endpoint
    - Run with: `uvicorn main:app --reload --port 8000`
    - _Requirements: 6.8_

- [ ] 6. Create API client in Next.js
  - [ ] 6.1 Create `lib/api/strategyClient.ts`
    - Implement `generateStrategy(input: StrategyInput): Promise<StrategyOutput>`
    - Call POST http://localhost:8000/api/strategy/generate
    - Add error handling for network errors
    - Return typed response
    - _Requirements: 6.1_

- [ ] 7. Create StrategyDisplay component
  - [ ] 7.1 Create `components/dashboard/StrategyDisplay.tsx`
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

- [ ] 8. Update StrategyForm to call API and show results
  - [ ] 8.1 Update `components/dashboard/StrategyForm.tsx`
    - Import `generateStrategy` from strategyClient
    - Add state for loading and generated strategy
    - On form submit, call `generateStrategy()` with form data
    - Show loading spinner while generating
    - Pass generated strategy to StrategyDisplay component
    - Add error message display for failures
    - _Requirements: 6.1_

- [ ] 9. Update Strategist page to integrate components
  - [ ] 9.1 Update `app/dashboard/strategist/page.tsx`
    - Import StrategyForm and StrategyDisplay
    - Render StrategyForm
    - Conditionally render StrategyDisplay when strategy exists
    - Add simple layout with sections
    - _Requirements: 6.1_

- [ ] 10. **CHECKPOINT: Verify mock agent flow works**
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

- [ ] 2. Implement Pydantic models for data validation
  - [ ] 2.1 Create `models/strategy.py` with Pydantic models
    - Implement `StrategyInput` model with field validation (min_length=1 for all fields)
    - Implement `PlatformRecommendation` model with platform, rationale, priority fields
    - Implement `StrategyOutput` model with all required fields and constraints
    - Implement `StrategyRecord` model for database storage
    - Add field descriptions to guide agent output generation
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 2.2 Write property test for Pydantic JSON serialization
    - **Property 7: Pydantic Model JSON Serialization Round-Trip**
    - **Validates: Requirements 3.7**

  - [ ]* 2.3 Write unit tests for Pydantic model validation
    - Test that empty strings are rejected for required fields
    - Test that content_pillars requires 3-6 items
    - Test that platform_recommendations requires at least 2 items
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ] 3. Implement configuration management
  - [ ] 3.1 Create `config.py` with Pydantic Settings
    - Define `Settings` class with all environment variables
    - Add AWS credentials (region, access key, secret key)
    - Add DynamoDB table names (users, strategies)
    - Add JWT secret configuration
    - Add Bedrock model ID configuration
    - Add API configuration (port, frontend URL, timeout)
    - Implement validation for required settings
    - _Requirements: 8.1, 8.2, 8.4, 11.4, 11.7_

  - [ ]* 3.2 Write unit test for configuration validation
    - Test that missing AWS credentials raise clear error at startup
    - Test that missing JWT_SECRET raises error
    - _Requirements: 8.3_

- [ ] 4. Implement Strands Agent integration
  - [ ] 4.1 Create `services/strategist_agent.py` with agent wrapper
    - Initialize BedrockProvider with AWS region and model ID
    - Create Agent instance with system prompt and structured output model
    - Implement `_get_system_prompt()` method with social media strategy expert instructions
    - Implement `generate_strategy()` method that formats input and calls agent
    - Add validation to ensure structured_output is present in response
    - Raise `StructuredOutputException` if structured output is missing
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 9.1, 9.2, 9.4_

  - [ ]* 4.2 Write property test for agent output schema conformance
    - **Property 6: Agent Output Conforms to Schema**
    - **Validates: Requirements 2.5, 2.6, 3.2, 3.3, 3.4, 3.5, 3.6, 9.4**

  - [ ]* 4.3 Write unit test for structured output exception handling
    - Test that missing structured_output raises StructuredOutputException
    - _Requirements: 3.8_

- [ ] 5. Checkpoint - Verify agent integration
  - Ensure agent can be initialized with test credentials
  - Ensure all tests pass, ask the user if questions arise

- [ ] 6. Implement DynamoDB data access layer
  - [ ] 6.1 Create `repositories/strategy_repository.py`
    - Initialize DynamoDB resource with boto3
    - Implement `create_strategy()` method to store StrategyRecord
    - Implement `get_strategy_by_id()` method with user isolation check
    - Implement `list_strategies_by_user()` method using UserIdIndex GSI
    - Implement `_item_to_record()` helper to convert DynamoDB items to StrategyRecord
    - Add proper error handling for DynamoDB exceptions
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.2, 5.3_

  - [ ]* 6.2 Write property test for user isolation
    - **Property 10: Strategy Records Enforce User Isolation**
    - **Validates: Requirements 4.7, 5.2, 5.4**

  - [ ]* 6.3 Write property test for strategy record completeness
    - **Property 9: Strategy Records Are Complete**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**

  - [ ]* 6.4 Write unit tests for repository methods
    - Test create_strategy stores all fields correctly
    - Test get_strategy_by_id returns None for non-existent ID
    - Test get_strategy_by_id returns None for wrong user_id
    - Test list_strategies_by_user returns empty list for new user
    - _Requirements: 4.1, 5.5_

- [ ] 7. Create Terraform configuration for strategies table
  - [ ] 7.1 Create `terraform/strategies-table.tf`
    - Define aws_dynamodb_table resource for strategies
    - Set hash_key to "strategyId"
    - Define attributes: strategyId (S), userId (S), createdAt (S)
    - Create UserIdIndex GSI with userId as hash_key and createdAt as sort_key
    - Enable point-in-time recovery and server-side encryption
    - Add appropriate tags
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8. Implement JWT authentication middleware
  - [ ] 8.1 Create `middleware/auth.py` with JWT validation
    - Implement `AuthMiddleware` class with jwt_secret configuration
    - Implement `get_current_user()` dependency that extracts and validates JWT
    - Handle expired tokens and return 401 with appropriate message
    - Handle invalid tokens and return 401 with appropriate message
    - Extract userId from token payload and return it
    - Use FastAPI's HTTPBearer security scheme
    - _Requirements: 1.1, 6.4, 6.5_

  - [ ]* 8.2 Write property test for authentication enforcement
    - **Property 3: Authentication Required for Protected Endpoints**
    - **Validates: Requirements 1.1, 6.4**

  - [ ]* 8.3 Write property test for unauthenticated requests
    - **Property 4: Unauthenticated Requests Return 401**
    - **Validates: Requirements 6.5**

  - [ ]* 8.4 Write unit tests for JWT validation
    - Test that valid JWT token is accepted
    - Test that expired token returns 401
    - Test that invalid signature returns 401
    - Test that missing userId in payload returns 401
    - _Requirements: 1.1, 6.5_

- [ ] 9. Implement service layer business logic
  - [ ] 9.1 Create `services/strategy_service.py`
    - Implement `StrategyService` class with agent and repository dependencies
    - Implement `generate_and_store_strategy()` method
    - Generate strategy using agent, then store in database only if successful
    - Implement `get_user_strategies()` method to retrieve all user strategies
    - Implement `get_strategy()` method to retrieve specific strategy with user isolation
    - Add error handling decorator `@handle_agent_errors` for timeouts and exceptions
    - _Requirements: 2.3, 4.1, 5.2, 7.4_

  - [ ]* 9.2 Write property test for strategy persistence
    - **Property 8: Generated Strategies Are Persisted**
    - **Validates: Requirements 4.1**

  - [ ]* 9.3 Write property test for error prevention
    - **Property 13: Errors Prevent Incomplete Storage**
    - **Validates: Requirements 7.4**

  - [ ]* 9.4 Write unit tests for service methods
    - Test that generate_and_store_strategy creates database record
    - Test that agent errors don't create database records
    - Test that get_user_strategies returns only user's strategies
    - _Requirements: 4.1, 5.2, 7.4_

- [ ] 10. Checkpoint - Verify core business logic
  - Ensure service layer integrates agent and repository correctly
  - Ensure all tests pass, ask the user if questions arise

- [ ] 11. Implement FastAPI routes
  - [ ] 11.1 Create `routes/strategy.py` with API endpoints
    - Implement POST `/api/strategy/generate` endpoint
    - Implement GET `/api/strategy/list` endpoint
    - Implement GET `/api/strategy/{strategy_id}` endpoint
    - Implement GET `/health` endpoint for health checks
    - Add authentication dependency to all protected endpoints
    - Add proper response models and status codes
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 11.2 Write property test for input validation
    - **Property 1: Input Validation Rejects Invalid Fields**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**

  - [ ] 11.3 Write property test for validation error responses
    - **Property 2: Invalid Input Returns Descriptive Errors**
    - **Validates: Requirements 1.6**

  - [ ] 11.4 Write property test for cross-user access
    - **Property 12: Cross-User Access Returns 403**
    - **Validates: Requirements 6.6**

  - [ ] 11.5 Write unit tests for API endpoints
    - Test POST /api/strategy/generate returns 200 with valid input
    - Test POST /api/strategy/generate returns 422 with invalid input
    - Test GET /api/strategy/list returns user's strategies
    - Test GET /api/strategy/:id returns 404 for non-existent ID
    - Test GET /api/strategy/:id returns 403 for other user's strategy
    - Test all endpoints return 401 without authentication
    - _Requirements: 1.6, 6.5, 6.6, 6.7_

- [ ] 12. Implement error handling and logging
  - [ ] 12.1 Create error handling utilities
    - Implement `StructuredOutputException` custom exception class
    - Implement `@handle_agent_errors` decorator for timeout and error handling
    - Configure structured logging with appropriate log levels
    - Add logging for authentication failures, agent errors, and database errors
    - Ensure sensitive information (tokens, credentials) is not logged
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ]* 12.2 Write unit tests for error handling
    - Test that Bedrock failures return 503
    - Test that agent errors return 500
    - Test that timeouts return 504
    - Test that errors don't expose sensitive information
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 13. Create main application entry point
  - [ ] 13.1 Implement `main.py` with FastAPI app initialization
    - Create FastAPI app instance with title and metadata
    - Configure CORS middleware with frontend URL from settings
    - Register strategy routes
    - Add startup event handler to validate configuration
    - Add exception handlers for custom exceptions
    - Configure dependency injection for services and repositories
    - _Requirements: 6.8, 8.3_

  - [ ]* 13.2 Write integration test for end-to-end flow
    - Test complete flow: authenticate → generate → retrieve → list
    - Verify strategy appears in list after generation
    - Verify strategy can be retrieved by ID
    - _Requirements: 2.3, 4.1, 5.2_

- [ ] 14. Implement Docker containerization
  - [ ] 14.1 Create `python-service/Dockerfile`
    - Use python:3.11-slim as base image
    - Copy requirements.txt and install dependencies
    - Copy application code
    - Expose port 8000
    - Set CMD to run uvicorn with main:app
    - _Requirements: 11.3_

  - [ ] 14.2 Create `docker-compose.yml` for local development
    - Define nextjs service with build context and environment variables
    - Define python-service with build context and environment variables
    - Configure port mappings (3000 for Next.js, 8000 for Python)
    - Set up shared environment variables (AWS, JWT, DynamoDB)
    - Configure service dependencies (nextjs depends on python-service)
    - _Requirements: 11.2, 11.3, 11.4_

- [ ] 15. Configure Next.js integration
  - [ ] 15.1 Update `next.config.ts` with API proxy
    - Add rewrites configuration to proxy /api/strategy/* to Python service
    - Use PYTHON_SERVICE_URL environment variable for destination
    - _Requirements: 11.5_

  - [ ] 15.2 Add Python service environment variables to Next.js
    - Add PYTHON_SERVICE_URL to .env.local.example
    - Update lib/config.ts to include Python service URL if needed
    - _Requirements: 11.4_

- [ ]* 16. Write property test for strategy list sorting
  - **Property 11: User Strategies Sorted by Date Descending**
  - **Validates: Requirements 5.3**

- [ ] 17. Create deployment documentation
  - [ ] 17.1 Create `python-service/README.md`
    - Document local development setup (venv, dependencies, running uvicorn)
    - Document environment variables and their purposes
    - Document API endpoints and request/response formats
    - Document Docker deployment with docker-compose
    - Document production deployment considerations
    - _Requirements: 11.8_

  - [ ] 17.2 Update root `README.md` with Python service information
    - Add section on running both Next.js and Python services
    - Document the microservices architecture
    - Add troubleshooting section for common issues
    - _Requirements: 11.8_

- [ ] 18. Implement frontend TypeScript types for strategy data
  - [ ] 18.1 Create `types/strategy.ts` with TypeScript interfaces
    - Define `StrategyInput` interface matching Python Pydantic model
    - Define `PlatformRecommendation` interface
    - Define `StrategyOutput` interface matching Python Pydantic model
    - Define `StrategyRecord` interface for complete strategy records
    - Ensure types match the JSON structure returned by Python API
    - _Requirements: 3.7, 6.1, 6.2, 6.3_

- [ ] 19. Create API client for Python strategy service
  - [ ] 19.1 Create `lib/api/strategyClient.ts`
    - Implement `generateStrategy()` function that calls POST /api/strategy/generate
    - Implement `listStrategies()` function that calls GET /api/strategy/list
    - Implement `getStrategy()` function that calls GET /api/strategy/:id
    - Add JWT token to Authorization header for all requests
    - Handle error responses (400, 401, 403, 404, 500, 503, 504)
    - Return typed responses using interfaces from types/strategy.ts
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7_

  - [ ]* 19.2 Write unit tests for API client
    - Test that requests include Authorization header
    - Test error handling for different status codes
    - Mock fetch to avoid actual API calls
    - _Requirements: 6.5, 6.6, 6.7_

- [ ] 20. Update StrategyForm component to call Python API
  - [ ] 20.1 Update `components/dashboard/StrategyForm.tsx`
    - Import `generateStrategy` from strategyClient
    - Update form submission to call generateStrategy() with user input
    - Add loading state while strategy is being generated
    - Display success message when strategy is generated
    - Display error message if generation fails
    - Store generated strategy in component state
    - _Requirements: 6.1, 7.2_

  - [ ]* 20.2 Write unit tests for StrategyForm
    - Test form submission calls generateStrategy
    - Test loading state is shown during generation
    - Test error messages are displayed on failure
    - _Requirements: 6.1_

- [ ] 21. Create StrategyDisplay component to show generated strategies
  - [ ] 21.1 Create `components/dashboard/StrategyDisplay.tsx`
    - Accept `StrategyOutput` prop
    - Display content pillars as a list or cards
    - Display posting schedule in readable format
    - Display platform recommendations with rationale and priority
    - Display content themes as a list
    - Display engagement tactics as a list
    - Add styling consistent with existing dashboard components
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 21.2 Write unit tests for StrategyDisplay
    - Test that all strategy fields are rendered
    - Test that component handles missing optional fields gracefully
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 22. Create StrategyList component to show user's saved strategies
  - [ ] 22.1 Create `components/dashboard/StrategyList.tsx`
    - Import `listStrategies` from strategyClient
    - Fetch user's strategies on component mount
    - Display strategies in a list or grid with brand name, industry, and created date
    - Add click handler to view full strategy details
    - Show loading state while fetching
    - Show empty state if user has no strategies
    - _Requirements: 5.1, 5.3, 5.5_

  - [ ]* 22.2 Write unit tests for StrategyList
    - Test that listStrategies is called on mount
    - Test that strategies are displayed in correct order
    - Test empty state is shown when no strategies exist
    - _Requirements: 5.3, 5.5_

- [ ] 23. Update Strategist page to integrate new components
  - [ ] 23.1 Update `app/dashboard/strategist/page.tsx`
    - Import StrategyForm, StrategyDisplay, and StrategyList components
    - Add state to track current view (form, display, list)
    - Show StrategyForm for creating new strategies
    - Show StrategyDisplay when a strategy is generated or selected
    - Show StrategyList to view saved strategies
    - Add navigation between views
    - Handle authentication state (redirect if not logged in)
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 23.2 Write integration test for Strategist page
    - Test complete flow: fill form → generate → view result → see in list
    - Mock API calls to avoid actual backend requests
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 24. Add error boundary for strategy components
  - [ ] 24.1 Create `components/dashboard/StrategyErrorBoundary.tsx`
    - Implement React error boundary for strategy-related errors
    - Display user-friendly error message when API calls fail
    - Add retry button to attempt operation again
    - Log errors for debugging
    - _Requirements: 7.2, 7.5_

- [ ] 25. Update environment configuration for Python service URL
  - [ ] 25.1 Update `.env.local.example`
    - Add NEXT_PUBLIC_PYTHON_SERVICE_URL variable
    - Add documentation for the variable
    - _Requirements: 11.4_

  - [ ] 25.2 Update `lib/config.ts` if needed
    - Add Python service URL to config if centralized config is used
    - _Requirements: 11.4_

- [ ] 26. Final checkpoint - End-to-end verification
  - Run both services locally (Next.js and Python)
  - Test strategy generation through the full stack
  - Verify JWT authentication works across services
  - Verify strategies are stored in DynamoDB
  - Verify user isolation is enforced
  - Verify generated strategies display correctly on frontend
  - Verify saved strategies list shows user's strategies
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation of functionality
- Property tests validate universal correctness properties using hypothesis library
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: models → data access → business logic → API → deployment
- All code should follow Python best practices (type hints, docstrings, PEP 8)
- Use async/await throughout for FastAPI compatibility
- Mock the Strands agent in tests to avoid actual Bedrock API calls during development
