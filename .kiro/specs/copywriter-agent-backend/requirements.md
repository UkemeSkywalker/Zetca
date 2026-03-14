# Requirements Document: Copywriter Agent Backend

## Introduction

The Copywriter Agent Backend extends the Zetca Python FastAPI service with AI-powered social media copy generation. The Copywriter Agent consumes strategy data produced by the Strategist Agent and generates platform-specific social media copies (captions with hashtags) tailored to the brand's goals and audience. Each copy is linked to a specific strategy, ensuring copies remain organized per strategy. Users can also engage in conversational chat with the AI to refine individual copies. The service follows the same architectural patterns as the existing Strategist Agent Backend: FastAPI routes, Pydantic models, DynamoDB repository, Strands Agents SDK with Amazon Bedrock, and JWT authentication.

## Glossary

- **Copywriter_Agent**: The AI agent built with Strands Agents Python SDK that generates social media copies from strategy data
- **Copy**: A single social media post text with associated platform, hashtags, and metadata, stored as a database record
- **Copy_Record**: Database entity storing a Copy associated with a specific strategy and user
- **Copies_Table**: DynamoDB table storing all Copy_Records with strategyId-based querying
- **Strategy_Record**: An existing strategy created by the Strategist Agent, referenced by strategyId
- **Copy_Generation_Input**: Data sent to the Copywriter Agent including the strategyId (from which strategy data is fetched)
- **Copy_Output**: The structured output from the Copywriter Agent containing a list of generated copies
- **Chat_Message**: A single message in a conversational exchange between the user and the AI about a specific copy
- **Chat_Request**: A user message sent to the AI to refine or adjust a specific copy
- **Chat_Response**: The AI's reply containing the updated copy text and any modifications
- **User_Context**: The authenticated user's identity derived from JWT token
- **Python_Service**: The existing FastAPI service that hosts both the Strategist and Copywriter agents
- **API_Endpoint**: REST API route exposed by the Python_Service for copy operations

## Requirements

### Requirement 1: Generate Copies from Strategy Data

**User Story:** As a user, I want to generate social media copies based on my existing strategy, so that I get platform-specific content aligned with my brand goals and audience.

#### Acceptance Criteria

1. WHEN a user submits a Copy_Generation_Input with a valid strategyId, THE Copywriter_Agent SHALL retrieve the associated Strategy_Record from the database
2. WHEN the Strategy_Record is retrieved, THE Copywriter_Agent SHALL use the content_pillars, content_themes, engagement_tactics, platform_recommendations, and posting_schedule to generate relevant copies
3. THE Copywriter_Agent SHALL generate copies for each platform listed in the Strategy_Record platform_recommendations
4. EACH generated Copy SHALL include a text field containing the post caption
5. EACH generated Copy SHALL include a platform field indicating the target social media platform
6. EACH generated Copy SHALL include a hashtags field containing a list of relevant hashtags
7. WHEN the Copywriter_Agent completes generation, THE system SHALL return a structured Copy_Output validated by a Pydantic model
8. IF the provided strategyId does not exist, THEN THE API_Endpoint SHALL return a 404 error with a descriptive message
9. IF the provided strategyId belongs to a different user, THEN THE API_Endpoint SHALL return a 403 error

### Requirement 2: Store Copies with Strategy Association

**User Story:** As a user, I want my generated copies to be saved and linked to the strategy they were created from, so that I can find and manage copies per strategy.

#### Acceptance Criteria

1. WHEN copies are generated, THE system SHALL store each Copy_Record in the Copies_Table
2. EACH Copy_Record SHALL include a unique copyId as the partition key
3. EACH Copy_Record SHALL include the strategyId linking it to the originating Strategy_Record
4. EACH Copy_Record SHALL include the userId from the User_Context
5. EACH Copy_Record SHALL include the text, platform, and hashtags fields
6. EACH Copy_Record SHALL include a createdAt timestamp
7. EACH Copy_Record SHALL include an updatedAt timestamp that reflects the last modification time
8. THE Copies_Table SHALL have a Global Secondary Index on strategyId with createdAt as sort key for efficient querying of copies by strategy
9. THE Copies_Table SHALL have a Global Secondary Index on userId with createdAt as sort key for efficient querying of copies by user

### Requirement 3: Retrieve Copies by Strategy

**User Story:** As a user, I want to retrieve all copies associated with a specific strategy, so that I can review the content generated for that strategy.

#### Acceptance Criteria

1. THE API_Endpoint SHALL provide a method to retrieve all Copy_Records for a given strategyId
2. WHEN retrieving Copy_Records by strategyId, THE system SHALL verify that the strategy belongs to the authenticated user
3. WHEN retrieving Copy_Records, THE system SHALL return results ordered by createdAt timestamp in descending order
4. WHEN no Copy_Records exist for a strategyId, THE system SHALL return an empty array
5. IF the strategyId does not exist, THEN THE API_Endpoint SHALL return a 404 error
6. IF the strategyId belongs to a different user, THEN THE API_Endpoint SHALL return a 403 error

### Requirement 4: Chat with AI to Refine Individual Copies

**User Story:** As a user, I want to chat with the AI about a specific copy to request adjustments like tone changes, length modifications, or hashtag updates, so that I can fine-tune each copy to my liking.

#### Acceptance Criteria

1. THE API_Endpoint SHALL accept a Chat_Request containing a copyId and a user message
2. WHEN a Chat_Request is received, THE system SHALL retrieve the existing Copy_Record to provide context to the AI
3. WHEN a Chat_Request is received, THE system SHALL also retrieve the associated Strategy_Record to maintain brand context
4. THE Copywriter_Agent SHALL process the user message in the context of the existing copy text, platform, hashtags, and strategy data
5. THE Copywriter_Agent SHALL return a Chat_Response containing the updated copy text, updated hashtags, and an AI explanation message
6. WHEN a Chat_Response is returned, THE system SHALL update the Copy_Record in the database with the new text and hashtags
7. WHEN a Copy_Record is updated via chat, THE system SHALL update the updatedAt timestamp
8. IF the copyId does not exist, THEN THE API_Endpoint SHALL return a 404 error
9. IF the Copy_Record belongs to a different user, THEN THE API_Endpoint SHALL return a 403 error

### Requirement 5: Provide RESTful API Endpoints for Copy Operations

**User Story:** As a frontend developer, I want well-defined API endpoints for copy generation, retrieval, and chat, so that I can integrate the Copywriter Agent into the user interface.

#### Acceptance Criteria

1. THE Python_Service SHALL provide a POST endpoint at /api/copy/generate that accepts a strategyId and returns generated copies
2. THE Python_Service SHALL provide a GET endpoint at /api/copy/list/{strategyId} that returns all copies for a given strategy
3. THE Python_Service SHALL provide a GET endpoint at /api/copy/{copyId} that returns a specific copy by ID
4. THE Python_Service SHALL provide a POST endpoint at /api/copy/{copyId}/chat that accepts a Chat_Request and returns a Chat_Response
5. THE Python_Service SHALL provide a DELETE endpoint at /api/copy/{copyId} that deletes a specific copy
6. WHEN accessing any copy endpoint without valid JWT authentication, THE system SHALL return a 401 error
7. THE Python_Service SHALL register copy routes alongside existing strategy routes in the FastAPI application

### Requirement 6: Enforce User Isolation for Copies

**User Story:** As a user, I want my copies to be private and inaccessible to other users, so that my content remains secure.

#### Acceptance Criteria

1. WHEN User A requests copies, THE system SHALL return only Copy_Records where the userId matches User A
2. WHEN User A attempts to access a Copy_Record belonging to User B, THE system SHALL return a 403 error
3. WHEN User A attempts to chat about a Copy_Record belonging to User B, THE system SHALL return a 403 error
4. WHEN User A attempts to delete a Copy_Record belonging to User B, THE system SHALL return a 403 error
5. THE system SHALL enforce user isolation at the repository level by verifying userId on all read and write operations

### Requirement 7: Handle Copywriter Agent Errors Gracefully

**User Story:** As a user, I want to receive clear error messages when copy generation or chat fails, so that I understand what went wrong and can retry.

#### Acceptance Criteria

1. IF the Bedrock provider fails to respond during copy generation, THEN THE system SHALL return a 503 error with a message indicating service unavailability
2. IF the Copywriter_Agent throws an error during generation, THEN THE system SHALL log the error details and return a 500 error with a user-friendly message
3. IF copy generation takes longer than 60 seconds, THEN THE system SHALL timeout and return a 504 error
4. WHEN any error occurs during copy generation, THE system SHALL NOT store incomplete Copy_Records in the database
5. IF the Copywriter_Agent throws an error during chat, THEN THE system SHALL NOT modify the existing Copy_Record
6. WHEN an error occurs, THE system SHALL log sufficient details for debugging without exposing sensitive information to the user

### Requirement 8: Configure Copies DynamoDB Table

**User Story:** As a developer, I want a proper DynamoDB table schema for storing copies, so that data is organized and efficiently queryable.

#### Acceptance Criteria

1. THE Copies_Table SHALL use copyId as the partition key
2. THE Copies_Table SHALL have a Global Secondary Index named StrategyIdIndex with strategyId as hash key and createdAt as range key
3. THE Copies_Table SHALL have a Global Secondary Index named UserIdIndex with userId as hash key and createdAt as range key
4. THE Copies_Table SHALL use PAY_PER_REQUEST billing mode
5. THE Copies_Table SHALL have point-in-time recovery enabled
6. THE Copies_Table SHALL have server-side encryption enabled
7. THE Copies_Table name SHALL follow the pattern "copies-{environment}" consistent with existing table naming

### Requirement 9: Support Mock Agent for Development

**User Story:** As a developer, I want a mock Copywriter Agent that returns realistic sample copies without calling AWS services, so that I can develop and test without cloud dependencies.

#### Acceptance Criteria

1. WHEN the USE_MOCK_AGENT environment variable is set to true, THE system SHALL use a MockCopywriterAgent instead of the real Copywriter_Agent
2. THE MockCopywriterAgent SHALL return realistic sample copies with platform-appropriate text and hashtags
3. THE MockCopywriterAgent SHALL simulate a processing delay to mimic real agent behavior
4. THE MockCopywriterAgent SHALL support the same generate and chat interfaces as the real Copywriter_Agent
5. THE MockCopywriterAgent SHALL generate copies that reference the provided strategy data for realistic output

### Requirement 10: Define Pydantic Models for Copy Data

**User Story:** As a developer, I want well-defined Pydantic models for copy data, so that input validation, output serialization, and type safety are enforced throughout the system.

#### Acceptance Criteria

1. THE system SHALL define a CopyGenerateInput Pydantic model with a required strategyId field (non-empty string)
2. THE system SHALL define a CopyItem Pydantic model with fields: text (str), platform (str), hashtags (List[str])
3. THE system SHALL define a CopyOutput Pydantic model with a copies field (List[CopyItem]) as the structured agent output
4. THE system SHALL define a CopyRecord Pydantic model with fields: id, strategyId, userId, text, platform, hashtags, createdAt, updatedAt
5. THE system SHALL define a ChatRequest Pydantic model with a required message field (non-empty string)
6. THE system SHALL define a ChatResponse Pydantic model with fields: updatedText (str), updatedHashtags (List[str]), aiMessage (str)
7. WHEN the Copywriter_Agent returns structured output, THE system SHALL serialize the Pydantic models to JSON for API responses
