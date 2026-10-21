import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy | Zetca',
  description: 'What information Zetca collects, how it is used and shared, and the choices you have.',
};

const UPDATED = '21 October 2026';

const sections: LegalSection[] = [
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <p>
          <strong>Your account.</strong> Your name, email address and password (stored only as a secure hash), and the
          company and bio you add to your profile.
        </p>
        <p>
          <strong>Your content.</strong> What you create in Zetca: strategy quiz answers and the strategies made from
          them, posts written with the Copywriter, your edits, scheduled posts, and the images, videos, thumbnails and
          captions files you upload.
        </p>
        <p>
          <strong>Connected accounts.</strong> When you connect a social account, we receive what that platform shares
          with your permission:
        </p>
        <ul>
          <li>
            <strong>LinkedIn:</strong> your LinkedIn member ID, name, profile picture and email address, and an access
            token that lets Zetca publish the posts you schedule.
          </li>
          <li>
            <strong>YouTube (Google):</strong> your channel’s ID, name, handle and picture, the permissions you granted,
            and a refresh token that lets Zetca upload and manage the videos you schedule. We encrypt this token before
            storing it.
          </li>
        </ul>
        <p>
          <strong>Technical information.</strong> Server logs (such as IP address, browser type, the pages and features
          used, and error details) that we use to run, secure and fix the service.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use-it',
    title: 'How we use your information',
    body: (
      <ul>
        <li>To provide Zetca: generate strategies and posts, save your work, and schedule and publish what you ask us to.</li>
        <li>To publish to the accounts you connect, only with the content and at the times you choose.</li>
        <li>To keep the service secure, prevent abuse and fix problems.</li>
        <li>To contact you about your account and important changes to the service.</li>
      </ul>
    ),
  },
  {
    id: 'ai',
    title: 'AI features',
    body: (
      <p>
        When you use the Strategist, the Copywriter or “Write with Copywriter”, the details you enter are sent to Anthropic’s
        Claude models through Amazon Bedrock to generate a response. Amazon Bedrock does not use this content to train
        models. We do not use your content to train AI models.
      </p>
    ),
  },
  {
    id: 'google-and-youtube',
    title: 'Google and YouTube data',
    body: (
      <>
        <p>
          Zetca uses YouTube API Services. By connecting a YouTube channel you also agree to the{' '}
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
            YouTube Terms of Service
          </a>
          , and Google’s handling of your information is described in the{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            Google Privacy Policy
          </a>
          .
        </p>
        <p>
          We use the permissions you grant only to upload the videos you schedule, set their details (title, description,
          tags, thumbnail, captions, playlists, visibility and publish time), list your playlists and video categories, and
          create a playlist when you ask us to. We don’t sell this data, use it for advertising, or let people read it
          except where you ask us to, it’s needed for security, or the law requires it.
        </p>
        <p>
          Zetca’s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p>
          You can disconnect YouTube at any time in your Zetca profile, which deletes the stored token. You can also remove
          Zetca’s access from your{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
            Google account’s third-party access page
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'How we share information',
    body: (
      <>
        <p>We don’t sell your personal information. We share it only:</p>
        <ul>
          <li>
            With service providers that run Zetca for us: Amazon Web Services (hosting, databases, file storage and Amazon
            Bedrock).
          </li>
          <li>With the platforms you connect (LinkedIn, Google/YouTube), to publish what you schedule.</li>
          <li>When the law requires it, or to protect the rights, safety and security of our users and the service.</li>
          <li>If Zetca is involved in a merger or sale, in which case we’ll tell you before your information is governed by a different policy.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'storage-and-security',
    title: 'Storage and security',
    body: (
      <p>
        Your information is stored with Amazon Web Services in the United States. Databases and files are encrypted at
        rest, connections use HTTPS, and connected-account tokens are never shown in the app. No system is perfectly
        secure, but we work to protect your information and will tell you if a breach affects you.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'Keeping and deleting your information',
    body: (
      <>
        <p>
          We keep your information while your account is open. You can delete strategies, copy, scheduled posts and media
          in the app, and disconnect connected accounts at any time.
        </p>
        <p>
          To delete your account and everything in it, email{' '}
          <a href="mailto:hello@zetca.pro">hello@zetca.pro</a> from your account’s email address. We delete it within 30
          days, except where we must keep something by law. Backups are removed on their normal cycle.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: (
      <>
        <p>
          Zetca uses cookies it needs to work: one that keeps you signed in, and short-lived ones that protect the sign-in
          with LinkedIn and Google.
        </p>
        <p>
          We don’t use analytics or advertising cookies today. If we add them, for example to understand how people use
          Zetca or to measure our ads, we’ll update this policy first, name the providers, and ask for your consent where
          the law requires it. Information we receive from Google APIs is never used for advertising.
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your choices and rights',
    body: (
      <p>
        You can see and edit your profile in the app. Depending on where you live, you may have the right to access,
        correct, export or delete your personal information, or object to how we use it. To make a request, email{' '}
        <a href="mailto:hello@zetca.pro">hello@zetca.pro</a>.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: <p>Zetca is not for children under 13, and we don’t knowingly collect information from them.</p>,
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If we change this policy we’ll update the date above, and for significant changes we’ll let you know by email or in
        the app before they take effect.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        Questions about privacy? Email <a href="mailto:hello@zetca.pro">hello@zetca.pro</a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro={
        <p>
          Zetca (“we”, “us”) is an AI content tool at zetca.pro that plans content strategies, writes posts, schedules them
          and publishes them to the accounts you connect. This policy explains what information we collect, how we use and
          share it, and the choices you have.
        </p>
      }
      sections={sections}
    />
  );
}
