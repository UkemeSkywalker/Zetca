# Design Document: Strategist Agent Backend

## Overview

The Strategist Agent Backend is a Python-based microservice that provides AI-powered social media strategy generation using the Strands Agents Python SDK with Amazon Bedrock (Claude 4 Sonnet). The service runs alongside the Next.js frontend application and communicates via REST API endpoints.

The architecture follows a microservices pattern where:
- **Next.js Frontend**: Handles user interface, authentication, and proxies strategy requests
- **Python Agent Service**: Hosts the Strands agent, generates strategies, and manages strategy data
- **Shared DynamoDB**: Both services access the same DynamoDB tables for users and strategies

The Python service uses FastAPI for high-performance async request handling and integrates with the existing JWT authentication system. Strategy generation leverages Pydantic models for structured output validation, ensuring type-safe responses that match the frontend's TypeScript interfaces.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Pages   │  │  Dashboard   │  │  Strategy UI │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    JWT Authentication                        │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    API Proxy (/api/strategy/*)
                             │
┌────────────────────────────┼─────────────────────────────────┐
│              Python Agent Service (FastAPI)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Layer (FastAPI Routes)              │   │
│  │  /generate  │  /list  │  /:id  │  /health           │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Authentication Middleware                   │   │
│  │         (JWT Validation, User Context)               │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Service Layer                            │   │
│  │  ┌────────────────┐    ┌────────────────┐           │   │
│  │  │ Strategy       │    │  Strands Agent │           │   │
│  │  │ Service        │───▶│  Orchestrator  │           │   │
│  │  └────────────────┘    └────────────────┘           │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Data Access Layer                           │   │
│  │  ┌────────────────┐    ┌────────────────┐           │   │
│  │  │ Strategy       │    │  User          │           │   │
│  │  │ Repository     │    │  Repository    │           │   │
│  │  └────────────────┘    └────────────────┘           │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┼─────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼────────┐       ┌───────▼────────┐
        │   DynamoDB     │       │  Amazon        │
        │   Tables       │       │  Bedrock       │
        │  - users       │       │  (Claude 4)    │
        │  - strategies  │       └────────────────┘
        └────────────────┘
```

### Agent Architecture

The Strands Agent follows a single-agent pattern with structured output:

```
┌─────────────────────────────────────────────────────────────┐
│                    Strategist Agent                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Agent Configuration                    │    │
│  │  - Model: Claude 4 Sonnet (Bedrock)               │    │
│  │  - System Prompt: Social Media Strategy Expert    │    │
│  │  - Structured Output: StrategyOutput (Pydantic)   │    │
│  └────────────────────────────────────────────────────┘    │
│                            │                                │
│                            ▼                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Input Processing                       │    │
│  │  - Brand Name                                      │    │
│  │  - Industry                                        │    │
│  │  - Target Audience                                 │    │
│  │  - Goals                                           │    │
│  └────────────────────────────────────────────────────┘    │
│                            │                                │
│                            ▼                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Strands Agent Execution                     │    │
│  │  1. Format user input into prompt                  │    │
│  │  2. Send to Bedrock with structured_output_model   │    │
│  │  3. Receive Pydantic-validated response            │    │
│  │  4. Extract structured_output field                │    │
│  └────────────────────────────────────────────────────┘    │
│                            │                                │
│                            ▼                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Structured Output (Pydantic)              │    │
│  │  - content_pillars: List[str]                      │    │
│  │  - posting_schedule: str                           │    │
│  │  - platform_recommendations: List[Dict]            │    │
│  │  - content_themes: List[str]                       │    │
│  │  - engagement_tactics: List[str]                   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose / ECS                      │
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │  Next.js Container   │      │  Python Container    │    │
│  │  Port: 3000          │      │  Port: 8000          │    │
│  │                      │      │                      │    │
│  │  - Frontend UI       │      │  - FastAPI Server    │    │
│  │  - API Routes        │      │  - Strands Agent     │    │
│  │  - Auth Logic        │      │  - Strategy Service  │    │
│  └──────────────────────┘      └──────────────────────┘    │
│           │                              │                  │
│           └──────────────┬───────────────┘                  │
│                          │                                  │
│                  Shared Environment                         │
│                  - AWS_REGION                               │
│                  - JWT_SECRET                               │
│                  - DYNAMODB_TABLE_NAME                      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Pydantic Models

#### StrategyInput Model
```python
from pydantic import BaseModel, Field

class StrategyInput(BaseModel):
    """Input model for strategy generation requests"""
    brand_name: str = Field(..., min_length=1, description="Brand or company name")
    industry: str = Field(..., min_length=1, description="Industry or business sector")
    target_audience: str = Field(..., min_length=1, description="Target audience description")
    goals: str = Field(..., min_length=1, description="Business goals and objectives")
```

#### PlatformRecommendation Model
```python
class PlatformRecommendation(BaseModel):
    """Social media platform recommendation"""
    platform: str = Field(..., description="Platform name (e.g., Instagram, LinkedIn)")
    rationale: str = Field(..., description="Why this platform is recommended")
    priority: str = Field(..., description="Priority level: high, medium, or low")
```

#### StrategyOutput Model
```python
class StrategyOutput(BaseModel):
    """Structured output model for generated strategies"""
    content_pillars: list[str] = Field(
        ..., 
        min_items=3,
        max_items=6,
        description="3-6 core content themes that align with brand identity"
    )
    posting_schedule: str = Field(
        ..., 
        description="Recommended posting frequency and optimal timing"
    )
    platform_recommendations: list[PlatformRecommendation] = Field(
        ...,
        min_items=2,
        description="Recommended social media platforms with rationale"
    )
    content_themes: list[str] = Field(
        ...,
        min_items=5,
        description="Specific content ideas and topics"
    )
    engagement_tactics: list[str] = Field(
        ...,
        min_items=4,
        description="Strategies for audience interaction and community building"
    )
    visual_prompts: list[str] = Field(
        ...,
        min_items=2,
        max_items=3,
        description="2-3 detailed image generation prompts that align with content themes and engagement tactics, suitable for passing to a Designer Agent to create graphics for posts"
    )
```

#### StrategyRecord Model
```python
from datetime import datetime
from uuid import UUID

class StrategyRecord(BaseModel):
    """Complete strategy record for database storage"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str = Field(..., description="User ID from JWT token")
    brand_name: str
    industry: str
    target_audience: str
    goals: str
    strategy_output: StrategyOutput
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### 2. Strands Agent Configuration

#### Agent Initialization
```python
from strands_agents import Agent, BedrockProvider

class StrategistAgent:
    """Wrapper for Strands Agent with Bedrock integration"""
    
    def __init__(self, aws_region: str, model_id: str = "anthropic.claude-4-sonnet-20250514-v1:0"):
        self.provider = BedrockProvider(
            region_name=aws_region,
            model_id=model_id
        )
        
        self.agent = Agent(
            name="strategist",
            provider=self.provider,
            system_prompt=self._get_system_prompt(),
            structured_output_model=StrategyOutput
        )
    
    def _get_system_prompt(self) -> str:
        return """You are an expert social media strategist with deep knowledge of digital marketing, 
        content strategy, and audience engagement across multiple platforms.
        
        Your role is to analyze brand information and generate comprehensive, actionable social media 
        strategies tailored to the specific industry, target audience, and business goals provided.
        
        When generating strategies:
        1. Consider the unique characteristics of the industry and competitive landscape
        2. Tailor content pillars to resonate with the target audience
        3. Recommend platforms based on where the target audience is most active
        4. Provide specific, actionable content themes rather than generic advice
        5. Suggest engagement tactics that build authentic community connections
        6. Ensure posting schedules are realistic and sustainable
        7. Generate 2-3 visual/image generation prompts that directly align with and support your 
           recommended content themes and engagement tactics
        8. Each visual prompt should describe a specific image that would be appropriate for posts 
           related to the strategy (e.g., if recommending customer testimonials, describe an image 
           of a satisfied customer; if recommending behind-the-scenes content, describe a workspace scene)
        9. Visual prompts should be detailed enough to pass to an image generation AI or designer
        
        IMPORTANT: The visual prompts must be directly relevant to the content strategy - they should 
        visually represent the themes and tactics you're recommending, not generic stock imagery.
        
        Generate strategies that are practical, data-informed, and aligned with current social media 
        best practices."""
    
    async def generate_strategy(self, strategy_input: StrategyInput) -> StrategyOutput:
        """Generate a social media strategy using the Strands agent"""
        user_prompt = f"""Generate a comprehensive social media strategy for the following brand:

Brand Name: {strategy_input.brand_name}
Industry: {strategy_input.industry}
Target Audience: {strategy_input.target_audience}
Goals: {strategy_input.goals}

Provide a detailed strategy that includes content pillars, posting schedule, platform recommendations, 
content themes, engagement tactics, and visual prompts for image generation that align with the strategy."""

        response = await self.agent.run(user_prompt)
        
        # Extract structured output from agent response
        if not response.structured_output:
            raise StructuredOutputException("Agent did not return structured output")
        
        return response.structured_output
```

### 3. Data Access Layer

#### Strategy Repository
```python
from boto3.dynamodb.conditions import Key
import boto3
from typing import Optional, List

class StrategyRepository:
    """Repository for strategy data access in DynamoDB"""
    
    def __init__(self, table_name: str, region: str):
        dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table = dynamodb.Table(table_name)
    
    async def create_strategy(self, record: StrategyRecord) -> StrategyRecord:
        """Store a new strategy record"""
        item = {
            'strategyId': record.id,
            'userId': record.user_id,
            'brandName': record.brand_name,
            'industry': record.industry,
            'targetAudience': record.target_audience,
            'goals': record.goals,
            'strategyOutput': record.strategy_output.model_dump(),
            'createdAt': record.created_at.isoformat()
        }
        
        self.table.put_item(Item=item)
        return record
    
    async def get_strategy_by_id(self, strategy_id: str, user_id: str) -> Optional[StrategyRecord]:
        """Retrieve a strategy by ID with user isolation"""
        response = self.table.get_item(
            Key={'strategyId': strategy_id}
        )
        
        if 'Item' not in response:
            return None
        
        item = response['Item']
        
        # Enforce user isolation
        if item['userId'] != user_id:
            return None
        
        return self._item_to_record(item)
    
    async def list_strategies_by_user(self, user_id: str) -> List[StrategyRecord]:
        """List all strategies for a specific user"""
        response = self.table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression=Key('userId').eq(user_id),
            ScanIndexForward=False  # Sort by createdAt descending
        )
        
        return [self._item_to_record(item) for item in response.get('Items', [])]
    
    def _item_to_record(self, item: dict) -> StrategyRecord:
        """Convert DynamoDB item to StrategyRecord"""
        return StrategyRecord(
            id=item['strategyId'],
            user_id=item['userId'],
            brand_name=item['brandName'],
            industry=item['industry'],
            target_audience=item['targetAudience'],
            goals=item['goals'],
            strategy_output=StrategyOutput(**item['strategyOutput']),
            created_at=datetime.fromisoformat(item['createdAt'])
        )
```

### 4. Service Layer

#### Strategy Service
```python
class StrategyService:
    """Business logic for strategy generation and management"""
    
    def __init__(self, agent: StrategistAgent, repository: StrategyRepository):
        self.agent = agent
        self.repository = repository
    
    async def generate_and_store_strategy(
        self, 
        strategy_input: StrategyInput, 
        user_id: str
    ) -> StrategyRecord:
        """Generate a strategy and store it in the database"""
        # Generate strategy using Strands agent
        strategy_output = await self.agent.generate_strategy(strategy_input)
        
        # Create record
        record = StrategyRecord(
            user_id=user_id,
            brand_name=strategy_input.brand_name,
            industry=strategy_input.industry,
            target_audience=strategy_input.target_audience,
            goals=strategy_input.goals,
            strategy_output=strategy_output
        )
        
        # Store in database
        return await self.repository.create_strategy(record)
    
    async def get_user_strategies(self, user_id: str) -> List[StrategyRecord]:
        """Retrieve all strategies for a user"""
        return await self.repository.list_strategies_by_user(user_id)
    
    async def get_strategy(self, strategy_id: str, user_id: str) -> Optional[StrategyRecord]:
        """Retrieve a specific strategy with user isolation"""
        return await self.repository.get_strategy_by_id(strategy_id, user_id)
```

### 5. Authentication Middleware

#### JWT Validation
```python
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

security = HTTPBearer()

class AuthMiddleware:
    """JWT authentication middleware"""
    
    def __init__(self, jwt_secret: str):
        self.jwt_secret = jwt_secret
    
    async def get_current_user(
        self, 
        credentials: HTTPAuthorizationCredentials = Security(security)
    ) -> str:
        """Extract and validate JWT token, return user_id"""
        token = credentials.credentials
        
        try:
            payload = jwt.decode(
                token, 
                self.jwt_secret, 
                algorithms=["HS256"]
            )
            user_id: Optional[str] = payload.get("userId")
            
            if user_id is None:
                raise HTTPException(status_code=401, detail="Invalid token: missing userId")
            
            return user_id
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
```

### 6. API Layer (FastAPI Routes)

#### Strategy Routes
```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Strategist Agent API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/strategy/generate", response_model=StrategyRecord)
async def generate_strategy(
    strategy_input: StrategyInput,
    user_id: str = Depends(auth_middleware.get_current_user),
    service: StrategyService = Depends(get_strategy_service)
):
    """Generate a new social media strategy"""
    try:
        record = await service.generate_and_store_strategy(strategy_input, user_id)
        return record
    except StructuredOutputException as e:
        raise HTTPException(status_code=500, detail="Failed to generate structured output")
    except Exception as e:
        logger.error(f"Strategy generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Strategy generation failed")

@app.get("/api/strategy/list", response_model=List[StrategyRecord])
async def list_strategies(
    user_id: str = Depends(auth_middleware.get_current_user),
    service: StrategyService = Depends(get_strategy_service)
):
    """List all strategies for the authenticated user"""
    return await service.get_user_strategies(user_id)

@app.get("/api/strategy/{strategy_id}", response_model=StrategyRecord)
async def get_strategy(
    strategy_id: str,
    user_id: str = Depends(auth_middleware.get_current_user),
    service: StrategyService = Depends(get_strategy_service)
):
    """Get a specific strategy by ID"""
    strategy = await service.get_strategy(strategy_id, user_id)
    
    if strategy is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    return strategy

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
```

### 7. Configuration Management

#### Environment Configuration
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # AWS Configuration
    aws_region: str = "us-east-1"
    aws_access_key_id: str
    aws_secret_access_key: str
    
    # DynamoDB Configuration
    dynamodb_users_table: str = "users-dev"
    dynamodb_strategies_table: str = "strategies-dev"
    
    # JWT Configuration
    jwt_secret: str
    
    # Bedrock Configuration
    bedrock_model_id: str = "anthropic.claude-4-sonnet-20250514-v1:0"
    
    # API Configuration
    frontend_url: str = "http://localhost:3000"
    api_port: int = 8000
    
    # Timeout Configuration
    agent_timeout_seconds: int = 60
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

## Data Models

### DynamoDB Table: strategies

**Table Structure:**
- **Primary Key**: `strategyId` (String) - Partition key
- **Global Secondary Index**: `UserIdIndex`
  - Partition key: `userId` (String)
  - Sort key: `createdAt` (String, ISO 8601 format)

**Attributes:**
```
{
  "strategyId": "uuid-v4-string",
  "userId": "uuid-v4-string",
  "brandName": "string",
  "industry": "string",
  "targetAudience": "string",
  "goals": "string",
  "strategyOutput": {
    "content_pillars": ["string", "string", ...],
    "posting_schedule": "string",
    "platform_recommendations": [
      {
        "platform": "string",
        "rationale": "string",
        "priority": "string"
      }
    ],
    "content_themes": ["string", "string", ...],
    "engagement_tactics": ["string", "string", ...]
  },
  "createdAt": "ISO-8601-timestamp"
}
```

**Terraform Configuration:**
```hcl
resource "aws_dynamodb_table" "strategies" {
  name           = "strategies-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "strategyId"

  attribute {
    name = "strategyId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    sort_key        = "createdAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "Strategies Table"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Application = "StrategistAgent"
  }
}
```

### Frontend-Backend Data Flow

**Request Flow:**
```
User Input (Frontend)
  ↓
{
  brandName: "TechCorp",
  industry: "SaaS",
  targetAudience: "B2B decision makers",
  goals: "Increase brand awareness"
}
  ↓
Next.js API Proxy (/api/strategy/generate)
  ↓
Python Service (POST /api/strategy/generate)
  ↓
StrategyInput (Pydantic validation)
  ↓
Strands Agent (Bedrock)
  ↓
StrategyOutput (Pydantic structured output)
  ↓
StrategyRecord (Database storage)
  ↓
JSON Response to Frontend
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified the following consolidations:

**Redundant Properties:**
- Criteria 1.2, 1.3, 1.4, 1.5 all test non-empty string validation for different fields → Can be combined into one property about input validation
- Criteria 3.2, 3.3, 3.4, 3.5, 3.6 all test field presence in StrategyOutput → Can be combined into one property about output structure completeness
- Criteria 4.2, 4.3, 4.4, 4.5, 4.6 all test Strategy_Record completeness → Can be combined into one property about record completeness
- Criteria 1.1 and 6.4 both test JWT validation → Same property
- Criteria 5.2 and 5.4 both test user isolation for retrieval → Same property
- Criteria 2.5, 2.6, and 9.4 all test structured output from agent → Can be combined

**Final Property Set:**
1. Input validation rejects invalid fields (combines 1.2-1.5)
2. Invalid input returns 400 with messages (1.6)
3. Authentication required for all endpoints (1.1, 6.4)
4. Unauthenticated requests return 401 (6.5)
5. Agent generates output for valid input (2.3)
6. Agent output conforms to Pydantic schema (2.5, 2.6, 9.4, 3.2-3.6)
7. Pydantic models serialize to JSON (3.7)
8. Generated strategies are persisted (4.1)
9. Strategy records are complete (4.2-4.6)
10. Strategy records enforce user isolation (4.7, 5.2, 5.4)
11. User strategies are sorted by date descending (5.3)
12. Cross-user access returns 403 (6.6)
13. Errors prevent incomplete storage (7.4)

### Correctness Properties

Property 1: Input Validation Rejects Invalid Fields
*For any* StrategyInput where any required field (brand_name, industry, target_audience, goals) is empty or whitespace-only, the API should reject the request with a validation error
**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

Property 2: Invalid Input Returns Descriptive Errors
*For any* invalid StrategyInput, the API should return a 400 status code with a response body containing descriptive validation messages indicating which fields are invalid
**Validates: Requirements 1.6**

Property 3: Authentication Required for Protected Endpoints
*For any* request to protected endpoints (/api/strategy/generate, /api/strategy/list, /api/strategy/:id), if the JWT token is missing, expired, or invalid, the request should be rejected
**Validates: Requirements 1.1, 6.4**

Property 4: Unauthenticated Requests Return 401
*For any* request to a protected endpoint without valid authentication, the API should return a 401 status code
**Validates: Requirements 6.5**

Property 5: Agent Generates Output for Valid Input
*For any* valid StrategyInput with non-empty fields, the Strands agent should successfully generate a StrategyOutput without throwing exceptions
**Validates: Requirements 2.3**

Property 6: Agent Output Conforms to Schema
*For any* StrategyOutput generated by the agent, it should contain all required fields (content_pillars, posting_schedule, platform_recommendations, content_themes, engagement_tactics) with correct types and constraints (e.g., content_pillars has 3-6 items, platform_recommendations has at least 2 items)
**Validates: Requirements 2.5, 2.6, 3.2, 3.3, 3.4, 3.5, 3.6, 9.4**

Property 7: Pydantic Model JSON Serialization Round-Trip
*For any* valid StrategyOutput Pydantic model, serializing it to JSON and then deserializing it back should produce an equivalent StrategyOutput object
**Validates: Requirements 3.7**

Property 8: Generated Strategies Are Persisted
*For any* successfully generated strategy, querying the database immediately after generation should return a Strategy_Record with matching content
**Validates: Requirements 4.1**

Property 9: Strategy Records Are Complete
*For any* Strategy_Record stored in the database, it should contain all required fields: id (non-empty), user_id (non-empty), brand_name, industry, target_audience, goals, strategy_output (complete StrategyOutput), and created_at (valid ISO 8601 timestamp)
**Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**

Property 10: Strategy Records Enforce User Isolation
*For any* two distinct users A and B, if user A creates a strategy, then user B should not be able to retrieve that strategy by ID, and it should not appear in user B's strategy list
**Validates: Requirements 4.7, 5.2, 5.4**

Property 11: User Strategies Sorted by Date Descending
*For any* user with multiple Strategy_Records, retrieving their strategy list should return records ordered by created_at timestamp in descending order (newest first)
**Validates: Requirements 5.3**

Property 12: Cross-User Access Returns 403
*For any* request to /api/strategy/:id where the strategy_id belongs to a different user than the authenticated user, the API should return a 403 status code
**Validates: Requirements 6.6**

Property 13: Errors Prevent Incomplete Storage
*For any* strategy generation request that fails (due to agent error, timeout, or Bedrock failure), no Strategy_Record should be created in the database
**Validates: Requirements 7.4**

## Error Handling

### Error Categories and Responses

#### 1. Authentication Errors (401)
- **Trigger**: Missing, expired, or invalid JWT token
- **Response**: `{"detail": "Invalid token"}` or `{"detail": "Token has expired"}`
- **Logging**: Log token validation failures with user IP (no token content)

#### 2. Authorization Errors (403)
- **Trigger**: Authenticated user attempts to access another user's strategy
- **Response**: `{"detail": "Access denied"}`
- **Logging**: Log user_id, requested strategy_id, and timestamp

#### 3. Validation Errors (400)
- **Trigger**: Invalid or missing required fields in StrategyInput
- **Response**: `{"detail": "Validation error", "errors": [{"field": "brand_name", "message": "Field required"}]}`
- **Logging**: Log validation errors with sanitized input (no PII)

#### 4. Not Found Errors (404)
- **Trigger**: Strategy ID does not exist
- **Response**: `{"detail": "Strategy not found"}`
- **Logging**: Log requested strategy_id and user_id

#### 5. Agent Errors (500)
- **Trigger**: Strands agent throws exception during generation
- **Response**: `{"detail": "Strategy generation failed"}`
- **Logging**: Log full exception stack trace, input parameters, and agent configuration

#### 6. Structured Output Errors (500)
- **Trigger**: Agent completes but structured_output is None or invalid
- **Response**: `{"detail": "Failed to generate structured output"}`
- **Logging**: Log agent response, expected schema, and validation errors

#### 7. Service Unavailable (503)
- **Trigger**: Bedrock service is unreachable or returns errors
- **Response**: `{"detail": "AI service temporarily unavailable"}`
- **Logging**: Log Bedrock error response and retry attempts

#### 8. Timeout Errors (504)
- **Trigger**: Agent execution exceeds 60 seconds
- **Response**: `{"detail": "Request timeout"}`
- **Logging**: Log execution time, input size, and partial results if available

### Error Handling Implementation

```python
from fastapi import HTTPException
import logging
from functools import wraps
import asyncio

logger = logging.getLogger(__name__)

class StructuredOutputException(Exception):
    """Raised when agent fails to produce structured output"""
    pass

def handle_agent_errors(func):
    """Decorator for handling agent-related errors"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            # Set timeout for agent execution
            return await asyncio.wait_for(
                func(*args, **kwargs),
                timeout=60.0
            )
        except asyncio.TimeoutError:
            logger.error(f"Agent execution timeout in {func.__name__}")
            raise HTTPException(status_code=504, detail="Request timeout")
        except StructuredOutputException as e:
            logger.error(f"Structured output error: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail="Failed to generate structured output"
            )
        except Exception as e:
            logger.error(f"Agent error in {func.__name__}: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, 
                detail="Strategy generation failed"
            )
    return wrapper

# Usage in service layer
class StrategyService:
    @handle_agent_errors
    async def generate_and_store_strategy(
        self, 
        strategy_input: StrategyInput, 
        user_id: str
    ) -> StrategyRecord:
        # Generation logic here
        pass
```

### Database Transaction Handling

To ensure Property 13 (errors prevent incomplete storage), use transaction-like patterns:

```python
async def generate_and_store_strategy(
    self, 
    strategy_input: StrategyInput, 
    user_id: str
) -> StrategyRecord:
    """Generate strategy with atomic storage"""
    
    # Step 1: Generate strategy (may fail)
    strategy_output = await self.agent.generate_strategy(strategy_input)
    
    # Step 2: Only store if generation succeeded
    record = StrategyRecord(
        user_id=user_id,
        brand_name=strategy_input.brand_name,
        industry=strategy_input.industry,
        target_audience=strategy_input.target_audience,
        goals=strategy_input.goals,
        strategy_output=strategy_output
    )
    
    # Step 3: Persist to database
    return await self.repository.create_strategy(record)
```

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific scenarios and property-based tests for universal correctness properties.

#### Unit Tests
Unit tests focus on:
- Specific examples of valid and invalid inputs
- Edge cases (empty user strategy lists, non-existent IDs)
- Error conditions (Bedrock failures, timeouts, invalid tokens)
- Integration points (JWT validation, DynamoDB operations)

#### Property-Based Tests
Property-based tests verify universal properties across randomized inputs using the `hypothesis` library for Python. Each property test should:
- Run minimum 100 iterations
- Generate diverse test data (valid/invalid inputs, various user IDs, different strategy content)
- Reference the design document property in a comment tag

### Property Test Configuration

**Library**: `hypothesis` (Python property-based testing library)

**Configuration**:
```python
from hypothesis import given, settings, strategies as st

# Configure hypothesis for thorough testing
@settings(max_examples=100, deadline=None)
@given(
    brand_name=st.text(min_size=1, max_size=100),
    industry=st.text(min_size=1, max_size=100),
    target_audience=st.text(min_size=1, max_size=200),
    goals=st.text(min_size=1, max_size=300)
)
def test_property_valid_input_generates_output(
    brand_name: str, 
    industry: str, 
    target_audience: str, 
    goals: str
):
    """
    Feature: strategist-agent-backend, Property 5: Agent Generates Output for Valid Input
    For any valid StrategyInput with non-empty fields, the Strands agent should 
    successfully generate a StrategyOutput without throwing exceptions
    """
    # Test implementation
    pass
```

### Test Organization

```
tests/
├── unit/
│   ├── test_auth_middleware.py
│   ├── test_strategy_service.py
│   ├── test_strategy_repository.py
│   ├── test_pydantic_models.py
│   └── test_api_routes.py
├── property/
│   ├── test_input_validation_properties.py
│   ├── test_authentication_properties.py
│   ├── test_agent_output_properties.py
│   ├── test_persistence_properties.py
│   └── test_user_isolation_properties.py
├── integration/
│   ├── test_end_to_end_flow.py
│   ├── test_jwt_integration.py
│   └── test_dynamodb_integration.py
└── conftest.py  # Shared fixtures
```

### Example Property Tests

#### Property 1: Input Validation
```python
# Feature: strategist-agent-backend, Property 1: Input Validation Rejects Invalid Fields
@settings(max_examples=100)
@given(
    field_name=st.sampled_from(['brand_name', 'industry', 'target_audience', 'goals']),
    invalid_value=st.one_of(st.just(''), st.text(max_size=0), st.from_regex(r'^\s+$'))
)
async def test_property_input_validation_rejects_invalid_fields(
    field_name: str, 
    invalid_value: str,
    test_client
):
    """Test that any empty or whitespace-only field is rejected"""
    valid_input = {
        'brand_name': 'TechCorp',
        'industry': 'SaaS',
        'target_audience': 'B2B decision makers',
        'goals': 'Increase brand awareness'
    }
    valid_input[field_name] = invalid_value
    
    response = await test_client.post(
        '/api/strategy/generate',
        json=valid_input,
        headers={'Authorization': f'Bearer {valid_token}'}
    )
    
    assert response.status_code == 422  # Pydantic validation error
```

#### Property 7: JSON Serialization Round-Trip
```python
# Feature: strategist-agent-backend, Property 7: Pydantic Model JSON Serialization Round-Trip
@settings(max_examples=100)
@given(
    content_pillars=st.lists(st.text(min_size=1), min_size=3, max_size=6),
    posting_schedule=st.text(min_size=10),
    content_themes=st.lists(st.text(min_size=1), min_size=5),
    engagement_tactics=st.lists(st.text(min_size=1), min_size=4)
)
def test_property_pydantic_json_round_trip(
    content_pillars: list[str],
    posting_schedule: str,
    content_themes: list[str],
    engagement_tactics: list[str]
):
    """Test that StrategyOutput survives JSON serialization round-trip"""
    platform_recs = [
        PlatformRecommendation(
            platform="Instagram",
            rationale="Visual content",
            priority="high"
        )
    ]
    
    original = StrategyOutput(
        content_pillars=content_pillars,
        posting_schedule=posting_schedule,
        platform_recommendations=platform_recs,
        content_themes=content_themes,
        engagement_tactics=engagement_tactics
    )
    
    # Serialize to JSON
    json_str = original.model_dump_json()
    
    # Deserialize back
    restored = StrategyOutput.model_validate_json(json_str)
    
    # Should be equivalent
    assert restored == original
```

#### Property 10: User Isolation
```python
# Feature: strategist-agent-backend, Property 10: Strategy Records Enforce User Isolation
@settings(max_examples=100)
@given(
    user_a_id=st.uuids(),
    user_b_id=st.uuids()
)
async def test_property_user_isolation(
    user_a_id: UUID,
    user_b_id: UUID,
    strategy_service: StrategyService
):
    """Test that users cannot access each other's strategies"""
    assume(user_a_id != user_b_id)  # Ensure different users
    
    # User A creates a strategy
    strategy_input = StrategyInput(
        brand_name="TestBrand",
        industry="Tech",
        target_audience="Developers",
        goals="Growth"
    )
    
    record = await strategy_service.generate_and_store_strategy(
        strategy_input, 
        str(user_a_id)
    )
    
    # User B tries to retrieve it
    result = await strategy_service.get_strategy(record.id, str(user_b_id))
    
    # Should return None (not found for user B)
    assert result is None
    
    # User B's list should not contain it
    user_b_strategies = await strategy_service.get_user_strategies(str(user_b_id))
    assert record.id not in [s.id for s in user_b_strategies]
```

### Integration Tests

Integration tests verify the complete flow from API request to database storage:

```python
async def test_end_to_end_strategy_generation(test_client, valid_jwt_token):
    """Test complete flow: request → agent → database → response"""
    
    # Step 1: Generate strategy
    response = await test_client.post(
        '/api/strategy/generate',
        json={
            'brand_name': 'TechCorp',
            'industry': 'SaaS',
            'target_audience': 'B2B decision makers',
            'goals': 'Increase brand awareness'
        },
        headers={'Authorization': f'Bearer {valid_jwt_token}'}
    )
    
    assert response.status_code == 200
    strategy_data = response.json()
    strategy_id = strategy_data['id']
    
    # Step 2: Verify it appears in list
    list_response = await test_client.get(
        '/api/strategy/list',
        headers={'Authorization': f'Bearer {valid_jwt_token}'}
    )
    
    assert response.status_code == 200
    strategies = list_response.json()
    assert any(s['id'] == strategy_id for s in strategies)
    
    # Step 3: Retrieve by ID
    get_response = await test_client.get(
        f'/api/strategy/{strategy_id}',
        headers={'Authorization': f'Bearer {valid_jwt_token}'}
    )
    
    assert get_response.status_code == 200
    retrieved = get_response.json()
    assert retrieved['id'] == strategy_id
```

### Mock Strategy for Testing

For tests that don't require actual Bedrock calls, mock the agent:

```python
from unittest.mock import AsyncMock, patch

@pytest.fixture
def mock_agent():
    """Mock Strands agent for testing without Bedrock calls"""
    mock = AsyncMock()
    mock.generate_strategy.return_value = StrategyOutput(
        content_pillars=["Educational content", "Behind-the-scenes", "Customer stories"],
        posting_schedule="3-4 times per week",
        platform_recommendations=[
            PlatformRecommendation(
                platform="LinkedIn",
                rationale="B2B audience",
                priority="high"
            )
        ],
        content_themes=["Industry trends", "Product tips", "Case studies", "Team culture", "Thought leadership"],
        engagement_tactics=["Ask questions", "Share user content", "Host Q&A sessions", "Create polls"]
    )
    return mock
```

## Deployment and Operations

### Docker Configuration

#### Python Service Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run FastAPI with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### requirements.txt
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0
strands-agents==0.1.0  # Strands Agents Python SDK
boto3==1.34.0
pyjwt==2.8.0
python-multipart==0.0.6
hypothesis==6.92.0  # For property-based testing
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2  # For testing
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  nextjs:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - AWS_REGION=${AWS_REGION}
      - DYNAMODB_TABLE_NAME=${DYNAMODB_TABLE_NAME}
      - JWT_SECRET=${JWT_SECRET}
      - PYTHON_SERVICE_URL=http://python-service:8000
    depends_on:
      - python-service

  python-service:
    build:
      context: ./python-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - AWS_REGION=${AWS_REGION}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - DYNAMODB_USERS_TABLE=${DYNAMODB_USERS_TABLE}
      - DYNAMODB_STRATEGIES_TABLE=${DYNAMODB_STRATEGIES_TABLE}
      - JWT_SECRET=${JWT_SECRET}
      - BEDROCK_MODEL_ID=anthropic.claude-4-sonnet-20250514-v1:0
      - FRONTEND_URL=http://nextjs:3000
```

### Next.js API Proxy Configuration

Add to `next.config.ts`:

```typescript
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/strategy/:path*',
        destination: `${process.env.PYTHON_SERVICE_URL}/api/strategy/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

### Environment Variables

#### .env.local (Development)
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# DynamoDB Tables
DYNAMODB_TABLE_NAME=users-dev
DYNAMODB_USERS_TABLE=users-dev
DYNAMODB_STRATEGIES_TABLE=strategies-dev

# JWT Configuration
JWT_SECRET=your-jwt-secret-key

# Python Service
PYTHON_SERVICE_URL=http://localhost:8000

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-4-sonnet-20250514-v1:0

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Running the Services

#### Development Mode

Terminal 1 - Python Service:
```bash
cd python-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Terminal 2 - Next.js:
```bash
npm run dev
```

#### Production Mode with Docker Compose

```bash
docker-compose up --build
```

### Health Monitoring

The Python service includes a health check endpoint:

```python
@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers"""
    return {
        "status": "healthy",
        "service": "strategist-agent",
        "version": "1.0.0"
    }
```

Configure health checks in ECS task definition:
```json
{
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 60
  }
}
```

### Logging Configuration

```python
import logging
import sys

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Log important events
logger.info("Strategy generated", extra={
    "user_id": user_id,
    "strategy_id": strategy_id,
    "execution_time_ms": execution_time
})
```

### Monitoring and Observability

Key metrics to monitor:
- **Request Rate**: Requests per second to /api/strategy/generate
- **Success Rate**: Percentage of successful strategy generations
- **Latency**: P50, P95, P99 response times
- **Error Rate**: 4xx and 5xx error rates by endpoint
- **Agent Execution Time**: Time spent in Bedrock calls
- **Database Query Time**: Time spent in DynamoDB operations

CloudWatch alarms:
- Alert when error rate exceeds 5%
- Alert when P95 latency exceeds 30 seconds
- Alert when Bedrock throttling occurs

## Security Considerations

### JWT Token Validation
- Tokens are validated on every request
- Expired tokens are rejected with 401
- Token signature is verified using shared JWT_SECRET
- User ID is extracted from token payload for authorization

### User Data Isolation
- All database queries filter by user_id
- Cross-user access attempts return 403
- Strategy IDs are UUIDs (not sequential) to prevent enumeration

### Input Sanitization
- Pydantic models validate all input fields
- String length limits prevent DoS attacks
- No user input is directly interpolated into prompts without validation

### AWS Credentials
- Credentials stored in environment variables (never in code)
- Use IAM roles in production (no hardcoded keys)
- Principle of least privilege for Bedrock and DynamoDB access

### CORS Configuration
- Only allow requests from known frontend origins
- Credentials (cookies, auth headers) are allowed
- Preflight requests are handled correctly

### Rate Limiting
Consider adding rate limiting to prevent abuse:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/strategy/generate")
@limiter.limit("10/minute")  # Max 10 requests per minute per IP
async def generate_strategy(...):
    pass
```

## Future Enhancements

### Multi-Agent Architecture
The current design uses a single Strategist agent but is structured to support future multi-agent workflows:

```python
class AgentOrchestrator:
    """Orchestrate multiple agents for complex workflows"""
    
    def __init__(self):
        self.strategist = StrategistAgent(...)
        self.copywriter = CopywriterAgent(...)  # Future
        self.designer = DesignerAgent(...)      # Future
    
    async def generate_complete_campaign(self, input_data):
        # Step 1: Generate strategy
        strategy = await self.strategist.generate_strategy(input_data)
        
        # Step 2: Generate captions (future)
        captions = await self.copywriter.generate_captions(strategy)
        
        # Step 3: Generate images (future)
        images = await self.designer.generate_images(strategy, captions)
        
        return {
            "strategy": strategy,
            "captions": captions,
            "images": images
        }
```

### Streaming Responses
For better UX, consider streaming strategy generation:
```python
from fastapi.responses import StreamingResponse

@app.post("/api/strategy/generate/stream")
async def generate_strategy_stream(...):
    async def event_generator():
        async for chunk in agent.generate_strategy_stream(input_data):
            yield f"data: {chunk.model_dump_json()}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### Caching
Cache strategies for identical inputs to reduce costs:
```python
import hashlib
import json

def get_cache_key(strategy_input: StrategyInput) -> str:
    """Generate cache key from input"""
    input_dict = strategy_input.model_dump()
    input_str = json.dumps(input_dict, sort_keys=True)
    return hashlib.sha256(input_str.encode()).hexdigest()

# Check cache before generating
cache_key = get_cache_key(strategy_input)
cached_result = await cache.get(cache_key)
if cached_result:
    return cached_result
```

### Strategy Versioning
Track strategy revisions and allow users to regenerate:
```python
class StrategyRecord(BaseModel):
    # ... existing fields ...
    version: int = 1
    parent_strategy_id: Optional[str] = None  # For tracking revisions
```

## Conclusion

This design provides a robust, scalable architecture for AI-powered social media strategy generation using the Strands Agents Python SDK with Amazon Bedrock. The microservices pattern allows independent scaling and deployment of the Python agent service while maintaining seamless integration with the existing Next.js frontend.

Key design decisions:
- **FastAPI** for high-performance async request handling
- **Pydantic models** for type-safe structured output validation
- **DynamoDB** for scalable, serverless data storage with user isolation
- **JWT authentication** for secure cross-service communication
- **Property-based testing** for comprehensive correctness validation
- **Docker containerization** for consistent deployment across environments

The architecture is designed for future extensibility, supporting multi-agent workflows, streaming responses, and advanced caching strategies while maintaining security, performance, and reliability.
