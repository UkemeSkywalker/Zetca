'use client';

import { useState } from 'react';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sentMessage, setSentMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError('Email is required');
    if (!EMAIL.test(email)) return setError('Please enter a valid email address');

    setIsLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setSentMessage(data.message || 'If an account exists for that email, we’ve sent a reset link.');
      } else if (response.status === 429) {
        setError('Too many requests. Please try again later.');
      } else {
        setError(data.error || 'An error occurred. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sentMessage) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="text-on-surface" role="status">{sentMessage}</p>
        <p className="text-sm text-outline">The link expires in 1 hour. Didn’t get it? Check your spam folder, or try again in a few minutes.</p>
        <Link href="/login" className="text-primary hover:text-primary/80 hover:underline font-medium">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Input
          type="email"
          name="email"
          label="Email"
          placeholder="Enter your email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
          Send reset link
        </Button>
        <p className="text-center text-sm text-outline">
          Remembered it?{' '}
          <Link href="/login" className="text-primary hover:text-primary/80 hover:underline font-medium">
            Back to login
          </Link>
        </p>
      </form>
    </div>
  );
}
