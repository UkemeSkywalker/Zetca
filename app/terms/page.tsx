import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service | Zetca',
  description: 'The terms for using Zetca.',
};

const UPDATED = '21 October 2026';

const sections: LegalSection[] = [
  {
    id: 'using-zetca',
    title: 'Using Zetca',
    body: (
      <p>
        Zetca helps you plan content, write posts with AI, schedule them and publish them to accounts you connect. You must
        be at least 13 years old, and old enough to agree to these terms where you live. If you use Zetca for a business,
        you agree to these terms on its behalf.
      </p>
    ),
  },
  {
    id: 'your-account',
    title: 'Your account',
    body: (
      <p>
        Give accurate information when you sign up and keep your password safe. You’re responsible for what happens in your
        account. Tell us at <a href="mailto:hello@zetca.pro">hello@zetca.pro</a> if you think someone else is using it.
      </p>
    ),
  },
  {
    id: 'your-content',
    title: 'Your content',
    body: (
      <>
        <p>
          You own what you put into Zetca and what Zetca writes for you. You give us permission to store, process and
          publish it only as needed to run the service for you, for example to generate drafts and to publish posts to
          the accounts and at the times you choose.
        </p>
        <p>
          You’re responsible for your content and for having the rights to anything you upload, including videos, images,
          music and captions.
        </p>
      </>
    ),
  },
  {
    id: 'ai-output',
    title: 'AI-generated content',
    body: (
      <p>
        Strategies and posts are written by AI and can be wrong, incomplete or similar to content made for others. Review
        everything before you publish it. Zetca doesn’t give legal, financial, medical or other professional advice.
      </p>
    ),
  },
  {
    id: 'connected-accounts',
    title: 'Connected accounts',
    body: (
      <>
        <p>
          When you connect an account such as LinkedIn or YouTube, you allow Zetca to act on it as described when you
          connect, and you remain bound by that platform’s own terms. By connecting YouTube you agree to the{' '}
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
            YouTube Terms of Service
          </a>
          .
        </p>
        <p>
          Platforms can change or limit their services (for example, daily upload limits), which may delay or prevent a
          post. We’ll tell you in the app when something doesn’t publish. You can disconnect an account at any time.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>Don’t use Zetca to:</p>
        <ul>
          <li>break the law or the rules of the platforms you publish to;</li>
          <li>publish spam, scams, hate, harassment, or content that infringes someone else’s rights;</li>
          <li>mislead people about who you are, or pass off realistic AI-altered content as real without disclosing it;</li>
          <li>try to break, overload, scrape or get around the security or limits of the service.</li>
        </ul>
        <p>We may remove content or suspend accounts that break these rules.</p>
      </>
    ),
  },
  {
    id: 'plans',
    title: 'Plans and payment',
    body: (
      <p>
        Zetca has a free plan. Paid plans and their prices are shown on our <Link href="/#pricing">pricing page</Link>.
        Before you’re ever charged, we’ll show the price and billing terms and ask you to confirm. Features marked “Coming
        soon” aren’t available yet.
      </p>
    ),
  },
  {
    id: 'ending',
    title: 'Ending your use',
    body: (
      <p>
        You can stop using Zetca at any time and ask us to delete your account by emailing{' '}
        <a href="mailto:hello@zetca.pro">hello@zetca.pro</a>. We may suspend or close accounts that break these terms or
        put the service or other people at risk, and we’ll tell you why unless the law or safety stops us.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers and liability',
    body: (
      <>
        <p>
          We work hard to keep Zetca reliable, but it’s provided “as is”, without guarantees that it will always be
          available, error-free, or that posts will publish at an exact time.
        </p>
        <p>
          As far as the law allows, Zetca isn’t liable for indirect or consequential losses, such as lost profits, data or
          reputation, and our total liability for any claim is limited to the amount you paid us in the 12 months before
          it. Nothing in these terms limits rights you have under consumer law that can’t be limited.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>
        We may update these terms as Zetca grows. We’ll change the date above and, for significant changes, tell you by
        email or in the app before they take effect. Continuing to use Zetca after that means you accept the new terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        Questions about these terms? Email <a href="mailto:hello@zetca.pro">hello@zetca.pro</a>. Our{' '}
        <Link href="/privacy">Privacy Policy</Link> explains how we handle your information.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      intro={
        <p>
          These terms are an agreement between you and Mac Tidar AI Venture Studio Ltd (“we”, “us”), which builds and
          operates Zetca at zetca.pro. Please read them; by creating an account or using Zetca you agree to them.
        </p>
      }
      sections={sections}
    />
  );
}
