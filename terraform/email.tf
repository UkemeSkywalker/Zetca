# ---------------------------------------------------------------------------
# Account emails (password resets) sent through Amazon SES from the app's
# domain. After apply, add the DKIM CNAME records from the ses_dkim_records
# output at the domain's DNS host; SES verifies the domain once they resolve.
# A new SES account is in the sandbox (it can only send to verified
# addresses) until production access is requested in the SES console.
# ---------------------------------------------------------------------------

locals {
  email_enabled = var.create_app_server && var.app_domain != ""
  email_from    = "noreply@${var.app_domain}"
}

resource "aws_sesv2_email_identity" "app" {
  count          = local.email_enabled ? 1 : 0
  email_identity = var.app_domain

  tags = {
    Environment = local.environment
    ManagedBy   = "Terraform"
  }
}

# A separate managed policy: the user's inline policies share a 2,048-byte cap
data "aws_iam_policy_document" "app_email" {
  count = local.email_enabled ? 1 : 0
  statement {
    sid       = "AccountEmails"
    actions   = ["ses:SendEmail"]
    resources = [aws_sesv2_email_identity.app[0].arn]
    # Only from the no-reply address, so leaked keys can't send as anyone@domain
    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"
      values   = [local.email_from]
    }
  }
}

resource "aws_iam_policy" "app_email" {
  count       = local.email_enabled ? 1 : 0
  name        = "${local.app_name}-email"
  description = "Lets the Zetca app send account emails through SES"
  policy      = data.aws_iam_policy_document.app_email[0].json
}

resource "aws_iam_user_policy_attachment" "app_email" {
  count      = local.email_enabled ? 1 : 0
  user       = aws_iam_user.app[0].name
  policy_arn = aws_iam_policy.app_email[0].arn
}

output "ses_dkim_records" {
  description = "CNAME records to add at the domain's DNS host so SES can verify it and sign mail"
  value = local.email_enabled ? [
    for token in aws_sesv2_email_identity.app[0].dkim_signing_attributes[0].tokens :
    "${token}._domainkey.${var.app_domain} CNAME ${token}.dkim.amazonses.com"
  ] : []
}

output "email_from" {
  description = "EMAIL_FROM for the app server's .env.production"
  value       = local.email_enabled ? "Zetca <${local.email_from}>" : ""
}
