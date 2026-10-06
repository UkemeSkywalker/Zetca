variable "aws_region" {
  description = "AWS region for the Terraform state bucket"
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "Name of the S3 bucket used to store Terraform state"
  type        = string
  default     = "zetca-terraform-state"
}
