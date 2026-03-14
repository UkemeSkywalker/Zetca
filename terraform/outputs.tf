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
