import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
  title: 'Sign Up - Zetca',
  description: 'Create your Zetca account',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface pt-32">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-heading text-on-surface mb-2">Create Your Account</h1>
          <p className="text-outline">Join Zetca and start automating your social media</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient p-8">
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
