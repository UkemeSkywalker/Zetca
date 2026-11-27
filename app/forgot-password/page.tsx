import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export const metadata = {
  title: 'Forgot password - Zetca',
  description: 'Reset your Zetca password',
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-heading text-on-surface mb-2">Forgot your password?</h1>
          <p className="text-outline">Enter your email and we’ll send you a link to reset it</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient p-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
