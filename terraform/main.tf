terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket       = "zetca-terraform-state"
    key          = "zetca/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  # Each environment has its own workspace, and so its own state file
  # (the "prod" workspace's state lives at env:/prod/zetca/terraform.tfstate).
  # The default workspace is dev. Naming resources after the workspace means
  # a prod run can never rename or replace the dev tables.
  environment = terraform.workspace == "default" ? var.environment : terraform.workspace
}
