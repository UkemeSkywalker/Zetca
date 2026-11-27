/**
 * Sends account emails (password resets) through Amazon SES.
 *
 * The sender comes from EMAIL_FROM and must be an identity verified in SES
 * (terraform/email.tf verifies the app's domain). Without EMAIL_FROM, emails
 * are written to the server log in development and refused in production.
 */

import { SESv2Client, SendEmailCommand, type SESv2ClientConfig } from '@aws-sdk/client-sesv2';
import { getConfig } from '../config';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type SendEmail = (message: EmailMessage) => Promise<void>;

let client: SESv2Client | null = null;

function sesClient(): SESv2Client {
  if (!client) {
    const cfg = getConfig();
    const clientConfig: SESv2ClientConfig = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      clientConfig.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    }
    client = new SESv2Client(clientConfig);
  }
  return client;
}

export const sendEmail: SendEmail = async ({ to, subject, text, html }) => {
  const from = getConfig().emailFrom;
  if (!from) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EMAIL_FROM is not configured, so emails cannot be sent');
    }
    console.log(`[email] EMAIL_FROM is not set; not sending. To: ${to}\nSubject: ${subject}\n\n${text}`);
    return;
  }

  await sesClient().send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Text: { Data: text, Charset: 'UTF-8' }, Html: { Data: html, Charset: 'UTF-8' } },
        },
      },
    })
  );
};
