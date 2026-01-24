import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
  title: 'Sign Up - Zetca',
  description: 'Create your Zetca account',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 pt-32">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-gray-600">Join Zetca and start automating your social media</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-8">
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
