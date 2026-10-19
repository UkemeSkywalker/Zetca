# The production app server: one Lightsail instance running the app and Caddy
# with Docker Compose (see docker-compose.yml and scripts/deploy.sh), plus the
# IAM user whose keys the app uses. Created only when create_app_server = true,
# i.e. in the prod workspace.
#
# The app needs a long-running server (the LinkedIn publisher loop and the
# Copywriter's background jobs), which is why this isn't serverless.

locals {
  app_server_count = var.create_app_server ? 1 : 0
  app_name         = "zetca-${local.environment}"
}

resource "aws_lightsail_key_pair" "app" {
  count      = local.app_server_count
  name       = "${local.app_name}-ssh"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

resource "aws_lightsail_instance" "app" {
  count             = local.app_server_count
  name              = local.app_name
  availability_zone = var.availability_zone
  blueprint_id      = var.lightsail_blueprint_id
  bundle_id         = var.lightsail_bundle_id
  key_pair_name     = aws_lightsail_key_pair.app[0].name

  # Runs once, as root, on first boot
  user_data = <<-EOT
    #!/bin/bash
    set -euxo pipefail
    # 2 GB of swap, so building the app on a 2 GB server has headroom
    if [ ! -f /swapfile ]; then
      fallocate -l 2G /swapfile
      chmod 600 /swapfile
      mkswap /swapfile
      swapon /swapfile
      echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2 unattended-upgrades
    systemctl enable --now docker
    usermod -aG docker ubuntu
    mkdir -p /opt/zetca
    chown ubuntu:ubuntu /opt/zetca
    touch /var/lib/cloud/instance/zetca-ready
  EOT

  tags = {
    Name        = local.app_name
    Environment = local.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_lightsail_static_ip" "app" {
  count = local.app_server_count
  name  = "${local.app_name}-ip"
}

resource "aws_lightsail_static_ip_attachment" "app" {
  count          = local.app_server_count
  static_ip_name = aws_lightsail_static_ip.app[0].name
  instance_name  = aws_lightsail_instance.app[0].name
}

# Replaces Lightsail's default firewall: SSH (key only) plus HTTP and HTTPS for Caddy
resource "aws_lightsail_instance_public_ports" "app" {
  count         = local.app_server_count
  instance_name = aws_lightsail_instance.app[0].name

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
  }

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
  }
}

# ---------------------------------------------------------------------------
# The app's AWS identity. Lightsail can't use IAM roles, so the app runs with
# this user's access keys, limited to its own tables, its media bucket and the
# Claude models on Bedrock.
# ---------------------------------------------------------------------------

resource "aws_iam_user" "app" {
  count = local.app_server_count
  name  = "${local.app_name}-app"

  tags = {
    Environment = local.environment
    ManagedBy   = "Terraform"
  }
}

data "aws_iam_policy_document" "app" {
  count = local.app_server_count

  statement {
    sid = "AppTables"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:DescribeTable",
    ]
    resources = flatten([
      for arn in [
        aws_dynamodb_table.users.arn,
        aws_dynamodb_table.strategies.arn,
        aws_dynamodb_table.copies.arn,
        aws_dynamodb_table.scheduled_posts.arn,
        aws_dynamodb_table.publish_log.arn,
        aws_dynamodb_table.post_media.arn,
      ] : [arn, "${arn}/index/*"]
    ])
  }

  statement {
    sid       = "MediaObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.post_media.arn}/*"]
  }

  statement {
    sid     = "ClaudeOnBedrock"
    actions = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
    # The us. inference profile routes requests to the model in several US regions
    resources = [
      "arn:aws:bedrock:*:${data.aws_caller_identity.current.account_id}:inference-profile/us.anthropic.*",
      "arn:aws:bedrock:*::foundation-model/anthropic.*",
    ]
  }
}

resource "aws_iam_user_policy" "app" {
  count  = local.app_server_count
  name   = "${local.app_name}-app"
  user   = aws_iam_user.app[0].name
  policy = data.aws_iam_policy_document.app[0].json
}

# The secret is kept in Terraform state (the state bucket is encrypted and private)
resource "aws_iam_access_key" "app" {
  count = local.app_server_count
  user  = aws_iam_user.app[0].name
}
