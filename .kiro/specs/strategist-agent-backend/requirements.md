# Requirements Document: Strategist Agent Backend

## Introduction

The Strategist Agent Backend provides an autonomous AI-powered social media strategy generation service for the Zetca platform. Using the Strands Agents Python SDK with Amazon Bedrock (Claude 4 Sonnet), the system accepts brand information from authenticated users and generates comprehensive social media strategies. The Python-based agent service communicates with the Next.js frontend via REST API endpoints. The system ensures user data isolation and provides structured output for frontend integration.

## Glossary

- **Strategist_Agent**: The autonomous AI agent built with Strands Agents Python SDK that generates social media strategies
- **Strategy_Input**: User-provided data including Brand Name, Industry, Target Audience, and Defined Goals
- **Strategy_Output**: The generated social media strategy including content pillars, posting schedules, platform recommendations, content themes, engagement tactics, and visual prompts for image generation (structured using Pydantic models)
- **Visual_Prompts**: 2-3 detailed image generation prompts that align with the content themes and engagement tactics, designed to be passed to a Designer Agent for creating graphics
- **Strategy_Record**: Database entity storing the Strategy_Output associated with a specific user
- **User_Context**: The authenticated user's identity derived from JWT token
- **Strands_Agent_Framework**: The strands-agents Python library used to build the agent
- **Bedrock_Provider**: Amazon Bedrock service configured to use Claude 4 Sonnet model
- **Python_Service**: FastAPI/Flask service that hosts the Strands agent and exposes REST endpoints
- **API_Endpoint**: REST API route that accepts Strategy_Input and returns Strategy_Output
- **User_Isolation**: Security principle ensuring users can only access their own Strategy_Records
- **Structured_Output**: Pydantic model-based output format that ensures type-safe, validated responses from the agent

## Requirements

### Requirement 1: Accept Strategy Input from Authenticated Users

**User Story:** As a logged-in user, I want to provide my brand information to the Strategist Agent, so that I can receive a customized social media strategy.

#### Acceptance Criteria

1. WHEN a user submits Strategy_Input, THE API_Endpoint SHALL validate that the user is authenticated via JWT token
2. WHEN Strategy_Input is received, THE API_Endpoint SHALL validate that Brand Name is a non-empty string
3. WHEN Strategy_Input is received, THE API_Endpoint SHALL validate that Industry is a non-empty string
4. WHEN Strategy_Input is received, THE API_Endpoint SHALL validate that Target Audience is a non-empty string
5. WHEN Strategy_Input is received, THE API_Endpoint SHALL validate that Defined Goals is a non-empty string
6. IF any required field is missing or invalid, THEN THE API_Endpoint SHALL return a 400 error with descriptive validation messages

### Requirement 2: Generate Strategy Using Strands Agent

**User Story:** As a system, I want to use the Strands Agents framework to autonomously generate social media strategies, so that users receive high-quality, AI-powered recommendations.

#### Acceptance Criteria

1. THE Strategist_Agent SHALL be initialized using the Strands_Agent_Framework (Python SDK) with Bedrock_Provider configuration
2. WHEN the Strategist_Agent is initialized, THE system SHALL configure it to use Amazon Bedrock with Claude 4 Sonnet model
3. WHEN Strategy_Input is provided, THE Strategist_Agent SHALL generate a comprehensive social media strategy autonomously
4. THE Strategist_Agent SHALL operate independently as a single agent (designed to support future multi-agent integration)
5. WHEN the Strategist_Agent completes generation, THE system SHALL use structured_output_model parameter to receive validated Pydantic model output
6. THE system SHALL return the structured Strategy_Output directly from the agent's structured_output field

### Requirement 3: Structure Strategy Output

**User Story:** As a frontend developer, I want the strategy output to be structured and predictable, so that I can easily display it to users.

#### Acceptance Criteria

1. THE Strategy_Output SHALL be defined as a Pydantic BaseModel with typed fields
2. THE Strategy_Output Pydantic model SHALL include a content_pillars field (List[str]) containing content themes
3. THE Strategy_Output Pydantic model SHALL include a posting_schedule field (str) containing recommended posting frequency and timing
4. THE Strategy_Output Pydantic model SHALL include a platform_recommendations field (List[Dict]) containing suggested platforms with rationale
5. THE Strategy_Output Pydantic model SHALL include a content_themes field (List[str]) containing specific content ideas
6. THE Strategy_Output Pydantic model SHALL include an engagement_tactics field (List[str]) containing audience interaction strategies
7. THE Strategy_Output Pydantic model SHALL include a visual_prompts field (List[str]) containing 2-3 image generation prompts
8. THE visual_prompts SHALL be directly aligned with and support the content_themes and engagement_tactics
9. EACH visual_prompt SHALL describe a specific image that would be appropriate for posts related to the strategy's themes and tactics
10. WHEN the agent returns structured output, THE system SHALL serialize the Pydantic model to JSON for API response
11. IF structured output generation fails, THE system SHALL raise a StructuredOutputException and return appropriate error response

### Requirement 4: Store Strategy Records with User Isolation

**User Story:** As a user, I want my generated strategies to be saved and associated with my account, so that I can access them later without regenerating.

#### Acceptance Criteria

1. WHEN a Strategy_Output is generated, THE system SHALL create a Strategy_Record in the database
2. THE Strategy_Record SHALL include the user_id from the User_Context
3. THE Strategy_Record SHALL include the original Strategy_Input fields
4. THE Strategy_Record SHALL include the complete Strategy_Output
5. THE Strategy_Record SHALL include a created_at timestamp
6. THE Strategy_Record SHALL include a unique identifier
7. WHEN storing the Strategy_Record, THE system SHALL ensure it is associated only with the authenticated user

### Requirement 5: Retrieve User-Specific Strategies

**User Story:** As a user, I want to retrieve my previously generated strategies, so that I can review and reference them.

#### Acceptance Criteria

1. THE API_Endpoint SHALL provide a method to retrieve all Strategy_Records for the authenticated user
2. WHEN retrieving Strategy_Records, THE system SHALL filter results by the user_id from User_Context
3. THE system SHALL return Strategy_Records ordered by created_at timestamp in descending order
4. WHEN User A requests Strategy_Records, THE system SHALL NOT return Strategy_Records belonging to User B
5. WHEN no Strategy_Records exist for a user, THE system SHALL return an empty array

### Requirement 6: Provide RESTful API Endpoints

**User Story:** As a frontend developer, I want well-defined API endpoints, so that I can integrate the Strategist Agent into the user interface.

#### Acceptance Criteria

1. THE Python_Service SHALL provide a POST endpoint at /api/strategy/generate that accepts Strategy_Input and returns Strategy_Output
2. THE Python_Service SHALL provide a GET endpoint at /api/strategy/list that returns all Strategy_Records for the authenticated user
3. THE Python_Service SHALL provide a GET endpoint at /api/strategy/:id that returns a specific Strategy_Record by ID
4. THE Python_Service SHALL validate JWT tokens from the Next.js application for authentication
5. WHEN accessing any endpoint without valid authentication, THE system SHALL return a 401 error
6. WHEN accessing /api/strategy/:id with an ID belonging to another user, THE system SHALL return a 403 error
7. WHEN accessing /api/strategy/:id with a non-existent ID, THE system SHALL return a 404 error
8. THE Python_Service SHALL enable CORS to allow requests from the Next.js frontend origin

### Requirement 7: Handle Agent Errors Gracefully

**User Story:** As a user, I want to receive clear error messages when strategy generation fails, so that I understand what went wrong and can retry.

#### Acceptance Criteria

1. IF the Bedrock_Provider fails to respond, THEN THE system SHALL return a 503 error with message indicating service unavailability
2. IF the Strategist_Agent throws an error during generation, THEN THE system SHALL log the error details and return a 500 error with a user-friendly message
3. IF the agent response takes longer than 60 seconds, THEN THE system SHALL timeout and return a 504 error
4. WHEN any error occurs, THE system SHALL NOT store an incomplete Strategy_Record in the database
5. WHEN an error occurs, THE system SHALL log sufficient details for debugging without exposing sensitive information to the user

### Requirement 8: Configure Amazon Bedrock Integration

**User Story:** As a system administrator, I want the Bedrock integration to be properly configured, so that the agent can communicate with AWS services securely.

#### Acceptance Criteria

1. THE system SHALL read AWS credentials from environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
2. THE Bedrock_Provider SHALL be configured to use the Claude 4 Sonnet model identifier
3. WHEN AWS credentials are missing or invalid, THE system SHALL fail gracefully at startup with a clear error message
4. THE system SHALL use the AWS region specified in environment variables for Bedrock API calls
5. THE system SHALL handle AWS credential rotation without requiring application restart

### Requirement 9: Optimize Agent Prompt for Strategy Generation

**User Story:** As a product owner, I want the agent to generate high-quality, actionable strategies, so that users receive valuable insights.

#### Acceptance Criteria

1. THE Strategist_Agent SHALL be configured with a system prompt that instructs it to act as a social media strategy expert
2. THE system prompt SHALL instruct the agent to generate comprehensive strategies matching the Pydantic model structure
3. THE system prompt SHALL instruct the agent to tailor recommendations based on the provided Industry and Target Audience
4. THE system prompt SHALL instruct the agent to generate visual_prompts that directly align with and support the content_themes and engagement_tactics
5. THE system prompt SHALL instruct the agent that visual_prompts should describe specific, relevant images suitable for the recommended content strategy
6. THE agent invocation SHALL use the structured_output_model parameter with the Strategy_Output Pydantic model
7. WHEN generating strategies, THE agent SHALL incorporate all four Strategy_Input fields into its analysis
8. THE Pydantic model field descriptions SHALL guide the agent to produce properly formatted output

### Requirement 10: Ensure Database Schema Supports Strategy Storage

**User Story:** As a developer, I want a proper database schema for storing strategies, so that data is organized and queryable.

#### Acceptance Criteria

1. THE database SHALL have a strategies table with columns: id, user_id, brand_name, industry, target_audience, goals, strategy_output, created_at
2. THE strategies table SHALL have a foreign key constraint on user_id referencing the users table
3. THE strategies table SHALL have an index on user_id for efficient querying
4. THE strategies table SHALL have an index on created_at for efficient sorting
5. THE strategy_output column SHALL support storing JSON data
6. WHEN a user is deleted, THE system SHALL handle the cascade behavior for associated Strategy_Records

### Requirement 11: Deploy Python Service Alongside Next.js Application

**User Story:** As a developer, I want the Python agent service to run alongside the Next.js application, so that the frontend can communicate with the agent backend.

#### Acceptance Criteria

1. THE Python_Service SHALL be implemented using FastAPI or Flask framework
2. THE Python_Service SHALL run on a separate port from the Next.js application (e.g., port 8000)
3. THE Python_Service SHALL be containerized using Docker for consistent deployment
4. THE system SHALL provide environment configuration for Python_Service connection details (host, port)
5. THE Next.js application SHALL proxy requests to /api/strategy/* to the Python_Service
6. THE Python_Service SHALL share the same database connection as the Next.js application
7. THE Python_Service SHALL read JWT_SECRET from environment variables to validate tokens from Next.js
8. THE system SHALL provide documentation for running both services in development and production
