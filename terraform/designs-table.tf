# Designs people make in the Designer: the layout (background, text, colours)
# as JSON, so a design can be opened and edited again
resource "aws_dynamodb_table" "designs" {
  name         = "designs-${local.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "designId"

  attribute {
    name = "designId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "updatedAt"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    range_key       = "updatedAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "Designs Table"
    Environment = local.environment
    ManagedBy   = "Terraform"
    Application = "Designer"
  }
}
