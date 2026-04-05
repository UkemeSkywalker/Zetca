output "dynamodb_users_table_name" {
  value       = aws_dynamodb_table.users.name
  description = "Name of the DynamoDB users table"
}

output "dynamodb_users_table_arn" {
  value       = aws_dynamodb_table.users.arn
  description = "ARN of the DynamoDB users table"
}

output "dynamodb_strategies_table_name" {
  value       = aws_dynamodb_table.strategies.name
  description = "Name of the DynamoDB strategies table"
}

output "dynamodb_strategies_table_arn" {
  value       = aws_dynamodb_table.strategies.arn
  description = "ARN of the DynamoDB strategies table"
}

output "dynamodb_copies_table_name" {
  value       = aws_dynamodb_table.copies.name
  description = "Name of the DynamoDB copies table"
}

output "dynamodb_copies_table_arn" {
  value       = aws_dynamodb_table.copies.arn
  description = "ARN of the DynamoDB copies table"
}
output "dynamodb_scheduled_posts_table_name" {
  value       = aws_dynamodb_table.scheduled_posts.name
  description = "Name of the DynamoDB scheduled posts table"
}

output "dynamodb_scheduled_posts_table_arn" {
  value       = aws_dynamodb_table.scheduled_posts.arn
  description = "ARN of the DynamoDB scheduled posts table"
}

output "s3_post_media_bucket_name" {
  value       = aws_s3_bucket.post_media.bucket
  description = "Name of the S3 post media bucket"
}

output "s3_post_media_bucket_arn" {
  value       = aws_s3_bucket.post_media.arn
  description = "ARN of the S3 post media bucket"
}

output "dynamodb_post_media_table_name" {
  value       = aws_dynamodb_table.post_media.name
  description = "Name of the DynamoDB post media table"
}

output "dynamodb_post_media_table_arn" {
  value       = aws_dynamodb_table.post_media.arn
  description = "ARN of the DynamoDB post media table"
}

output "dynamodb_publish_log_table_name" {
  value       = aws_dynamodb_table.publish_log.name
  description = "Name of the DynamoDB publish log table"
}

output "dynamodb_publish_log_table_arn" {
  value       = aws_dynamodb_table.publish_log.arn
  description = "ARN of the DynamoDB publish log table"
}
