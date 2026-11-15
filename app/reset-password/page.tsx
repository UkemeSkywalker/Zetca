import { Suspense } from 'react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Reset password - Zetca',
  description: 'Choose a new password for your Zetca account',
  // The URL carries the reset token: keep it out of search engines and Referer headers
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-heading text-on-surface mb-2">Choose a new password</h1>
          <p className="text-outline">You’ll use it to log in from now on</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient p-8">
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
