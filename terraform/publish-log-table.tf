resource "aws_dynamodb_table" "publish_log" {
  name           = "publish-log-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "logId"

  attribute {
    name = "logId"
    type = "S"
  }

  attribute {
    name = "postId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "attemptedAt"
    type = "S"
  }

  global_secondary_index {
    name            = "PostIdIndex"
    hash_key        = "postId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    range_key       = "attemptedAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "Publish Log Table"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Application = "PublisherAgent"
  }
}
