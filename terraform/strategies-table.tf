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
    range_key       = "createdAt"
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
