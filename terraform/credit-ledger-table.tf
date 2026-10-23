# Every credit charge and refund: the action, the credits, and the real AI
# tokens and costs behind it. Entries expire after 400 days.
resource "aws_dynamodb_table" "credit_ledger" {
  name         = "credit-ledger-${local.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "entryId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "entryId"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "Credit Ledger Table"
    Environment = local.environment
    ManagedBy   = "Terraform"
    Application = "Billing"
  }
}
