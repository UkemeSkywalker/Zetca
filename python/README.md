# Strategist Agent Backend

Python-based microservice that provides AI-powered social media strategy generation using the Strands Agents Python SDK with Amazon Bedrock (Claude 4 Sonnet).

## Project Structure

```
python-service/
├── models/          # Pydantic data models and schemas
├── services/        # Business logic and agent orchestration
├── routes/          # FastAPI API endpoints
├── tests/           # Test suite
├── main.py          # Application entry point
├── requirements.txt # Python dependencies
└── .env.example     # Environment variable template
```

## Setup

### 1. Create Virtual Environment

```bash
python3 -m venv venv
```

### 2. Activate Virtual Environment

```bash
# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `AWS_REGION`: AWS region for Bedrock (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `JWT_SECRET`: Secret key for JWT validation (must match Next.js app)
- `DYNAMODB_STRATEGIES_TABLE`: DynamoDB table name for strategies
- `BEDROCK_MODEL_ID`: Bedrock model identifier (default: anthropic.claude-4-sonnet-20250514-v1:0)

## Running the Service

### Development Mode

```bash
uvicorn main:app --reload --port 8000
```

Or using Python directly:

```bash
python main.py
```

The service will be available at `http://localhost:8000`

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Testing

Run tests with pytest:

```bash
pytest
```

Run tests with coverage:

```bash
pytest --cov=. --cov-report=html
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /` - Root endpoint with service info
- `POST /api/strategy/generate` - Generate new strategy (coming soon)
- `GET /api/strategy/list` - List user strategies (coming soon)
- `GET /api/strategy/{id}` - Get specific strategy (coming soon)

## Dependencies

- **FastAPI**: Modern web framework for building APIs
- **Uvicorn**: ASGI server for FastAPI
- **Pydantic**: Data validation using Python type annotations
- **Boto3**: AWS SDK for Python (DynamoDB, Bedrock)
- **Strands Agents**: Agent framework for building AI agents
- **python-jose**: JWT token handling
- **pytest**: Testing framework
- **hypothesis**: Property-based testing

## Next Steps

1. Implement Pydantic models for strategy data
2. Create Strands Agent integration
3. Add DynamoDB repository layer
4. Implement API endpoints
5. Add authentication middleware
