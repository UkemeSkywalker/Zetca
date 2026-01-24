'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface WaitlistSectionProps {
  className?: string;
}

export default function WaitlistSection({ className = '' }: WaitlistSectionProps) {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate empty email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Simulate API call with 2-second delay
    setIsLoading(true);
    setTimeout(() => {
      setIsSubmitted(true);
      setEmail(''); // Clear input on success
      setIsLoading(false);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    }, 2000);
  };

  return (
    <section className={`py-16 px-4 bg-gradient-to-br from-blue-50 to-indigo-50 ${className}`}>
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Join the Waitlist
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Be the first to know when Zetca launches. Get early access and exclusive updates.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error || undefined}
              className="w-full"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="sm:w-auto w-full"
          >
            Join Now
          </Button>
        </form>

        {isSubmitted && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">
              Thanks for joining! We'll be in touch soon.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
