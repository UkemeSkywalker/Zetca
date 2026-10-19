# CI/CD: GitHub Actions builds the app image, pushes it to ECR, and the app
# server pulls it (see .github/workflows/deploy.yml). Created with the app
# server (prod workspace only).
#
# Actions signs in to AWS with GitHub's OIDC tokens, so no AWS keys are stored
# in GitHub. The role it assumes can only push to this repository's ECR repo,
# and only from the master branch or the "production" environment.

variable "github_repository" {
  description = "GitHub repository (owner/name) allowed to push images"
  type        = string
  default     = "UkemeSkywalker/Zetca"
}

resource "aws_ecr_repository" "app" {
  count = local.app_server_count
  name  = "zetca"

  # Every image is tagged with its commit, so tags never need to move
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Environment = local.environment
    ManagedBy   = "Terraform"
  }
}

# Keep the last 10 images (enough to roll back), so storage stays at cents a month
resource "aws_ecr_lifecycle_policy" "app" {
  count      = local.app_server_count
  repository = aws_ecr_repository.app[0].name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 10 images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 10 }
      action       = { type = "expire" }
    }]
  })
}

resource "aws_iam_openid_connect_provider" "github" {
  count          = local.app_server_count
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # AWS validates GitHub's certificate itself; the thumbprint is kept for the API
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "github_assume" {
  count = local.app_server_count
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github[0].arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repository}:ref:refs/heads/master",
        "repo:${var.github_repository}:environment:production",
      ]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  count              = local.app_server_count
  name               = "${local.app_name}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume[0].json
  tags = {
    Environment = local.environment
    ManagedBy   = "Terraform"
  }
}

data "aws_iam_policy_document" "github_push" {
  count = local.app_server_count
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "PushAppImage"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:DescribeImages",
    ]
    resources = [aws_ecr_repository.app[0].arn]
  }
}

resource "aws_iam_role_policy" "github_push" {
  count  = local.app_server_count
  name   = "push-app-image"
  role   = aws_iam_role.github_deploy[0].id
  policy = data.aws_iam_policy_document.github_push[0].json
}

# The server pulls the image with the app's own IAM user
data "aws_iam_policy_document" "app_pull" {
  count = local.app_server_count
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid       = "PullAppImage"
    actions   = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"]
    resources = [aws_ecr_repository.app[0].arn]
  }
}

resource "aws_iam_user_policy" "app_pull" {
  count  = local.app_server_count
  name   = "${local.app_name}-pull-image"
  user   = aws_iam_user.app[0].name
  policy = data.aws_iam_policy_document.app_pull[0].json
}

output "ecr_repository_url" {
  description = "Where CI pushes the app image"
  value       = var.create_app_server ? aws_ecr_repository.app[0].repository_url : null
}

output "github_deploy_role_arn" {
  description = "Role GitHub Actions assumes (repository variable AWS_DEPLOY_ROLE_ARN)"
  value       = var.create_app_server ? aws_iam_role.github_deploy[0].arn : null
}
