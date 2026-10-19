variable "environment" {
  description = "Environment name for the default workspace; other workspaces use their own name (e.g. prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "app_domain" {
  description = "Public domain of the app (e.g. zetca.com); empty for dev. Used for media upload CORS."
  type        = string
  default     = ""
}

variable "create_app_server" {
  description = "Create the Lightsail server and the app's IAM user (prod only)"
  type        = bool
  default     = false
}

variable "ssh_public_key_path" {
  description = "Public key installed on the app server for SSH"
  type        = string
  default     = "~/.ssh/zetca-lightsail.pub"
}

variable "lightsail_bundle_id" {
  description = "Lightsail plan; small_3_0 is 2 GB RAM / 2 vCPU / 60 GB, $12 a month"
  type        = string
  default     = "small_3_0"
}

variable "lightsail_blueprint_id" {
  description = "Lightsail OS image"
  type        = string
  default     = "ubuntu_24_04"
}

variable "availability_zone" {
  description = "Availability zone for the app server"
  type        = string
  default     = "us-east-1a"
}

variable "bedrock_model_id" {
  description = "Bedrock inference profile the app calls"
  type        = string
  default     = "us.anthropic.claude-sonnet-4-6"
}
