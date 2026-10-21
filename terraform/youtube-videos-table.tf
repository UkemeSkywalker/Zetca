# YouTube videos people schedule from Zetca: the details they filled in, and
# where each one is in the upload (queued → uploading → scheduled on YouTube)
resource "aws_dynamodb_table" "youtube_videos" {
  name         = "youtube-videos-${local.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "videoId"

  attribute {
    name = "videoId"
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

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # The upload engine finds queued videos, oldest first
  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
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
    Name        = "YouTube Videos Table"
    Environment = local.environment
    ManagedBy   = "Terraform"
    Application = "YouTubePublishing"
  }
}
