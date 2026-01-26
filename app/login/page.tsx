import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login - Zetca',
  description: 'Login to your Zetca account',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 pt-24">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Login to continue to your dashboard</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
