'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  form?: string;
}

export default function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="text-on-surface" role="alert">This reset link is incomplete. Please request a new one.</p>
        <Link href="/forgot-password" className="text-primary hover:text-primary/80 hover:underline font-medium">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="text-on-surface" role="status">Your password has been changed. You can now log in with it.</p>
        <Link href="/login" className="text-primary hover:text-primary/80 hover:underline font-medium">
          Go to login
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FormErrors = {};
    if (!password) next.password = 'Password is required';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters';
    else if (password.length > 128) next.password = 'Password must be less than 128 characters';
    if (password && confirmPassword !== password) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setDone(true);
      } else if (response.status === 429) {
        setErrors({ form: 'Too many attempts. Please try again later.' });
      } else if (data.field === 'password') {
        setErrors({ password: data.error });
      } else {
        setErrors({ form: data.error || 'An error occurred. Please try again.' });
      }
    } catch {
      setErrors({ form: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {errors.form && (
          <p className="text-sm text-error" role="alert">
            {errors.form}{' '}
            <Link href="/forgot-password" className="text-primary hover:underline font-medium">
              Request a new link
            </Link>
          </p>
        )}
        <Input
          type="password"
          name="password"
          label="New password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
        />
        <Input
          type="password"
          name="confirmPassword"
          label="Confirm new password"
          placeholder="Type it again"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          error={errors.confirmPassword}
        />
        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
          Set new password
        </Button>
      </form>
    </div>
  );
}
