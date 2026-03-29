resource "aws_dynamodb_table" "post_media" {
  name           = "post-media-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "mediaId"

  attribute {
    name = "mediaId"
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
    Name        = "Post Media Table"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Application = "PostMediaAttachments"
  }
}
