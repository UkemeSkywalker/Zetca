resource "aws_s3_bucket" "post_media" {
  bucket = "zetca-post-media-${var.environment}"

  tags = {
    Name        = "Post Media Bucket"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Application = "PostMediaAttachments"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "post_media" {
  bucket = aws_s3_bucket.post_media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "post_media" {
  bucket = aws_s3_bucket.post_media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "post_media" {
  bucket = aws_s3_bucket.post_media.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    filter {}

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "post_media" {
  bucket = aws_s3_bucket.post_media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}
