'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

export default function SignupForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms of service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle API errors
        if (data.field === 'email' && data.error === 'Email already exists') {
          setErrors({ email: 'An account with this email already exists' });
        } else if (response.status === 400 && data.error) {
          // Handle validation errors from API
          const fieldError = data.field as keyof FormErrors;
          if (fieldError) {
            setErrors({ [fieldError]: data.error });
          } else {
            setErrors({ email: data.error });
          }
        } else {
          setErrors({ email: data.error || 'Signup failed. Please try again.' });
        }
        setIsLoading(false);
        return;
      }

      // Token is automatically stored in HTTP-only cookie by the API
      // Update auth context and redirect to dashboard on success
      if (data.success && data.user) {
        login(data.user);
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ email: 'Network error. Please check your connection and try again.' });
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="text"
          name="name"
          label="Name"
          placeholder="Enter your name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
        />

        <Input
          type="email"
          name="email"
          label="Email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />

        <Input
          type="password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />

        <Input
          type="password"
          name="confirmPassword"
          label="Confirm Password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />

        <div className="space-y-2">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="acceptTerms"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="acceptTerms" className="ml-2 text-sm text-gray-700">
              I accept the{' '}
              <Link
                href="#"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="#"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-red-600">{errors.acceptTerms}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          Sign Up
        </Button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
          >
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
