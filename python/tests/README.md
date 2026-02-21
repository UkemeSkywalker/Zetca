# Python Service Tests

## Running Tests

### Run all tests
```bash
./venv/bin/pytest tests/ -v
```

### Run specific test file
```bash
./venv/bin/pytest tests/test_mock_agent.py -v
./venv/bin/pytest tests/test_strategy_models.py -v
```

### Run with coverage
```bash
./venv/bin/pytest tests/ --cov=. --cov-report=html
```

## Test Files

### test_strategy_models.py
Tests for Pydantic models:
- StrategyInput validation
- PlatformRecommendation validation
- StrategyOutput validation (including field count constraints)
- StrategyRecord validation and auto-generation

### test_mock_agent.py
Tests for MockStrategistAgent:
- Returns valid StrategyOutput
- Correct field counts (content_pillars: 3-6, platforms: ≥2, visual_prompts: 2-3)
- Valid priority values
- Detailed visual prompts
- 1-second simulated delay
- Deterministic output

## Test Results

All 28 tests passing:
- 17 model validation tests
- 11 mock agent tests
