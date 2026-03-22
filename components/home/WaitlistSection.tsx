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

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsSubmitted(true);
      setEmail('');
      setIsLoading(false);
      setTimeout(() => setIsSubmitted(false), 5000);
    }, 2000);
  };

  return (
    <section className={`py-18 px-4 bg-gradient-to-br from-surface-container-low to-surface ${className}`}>
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-display-md font-heading text-on-surface mb-4">
          Join the Waitlist
        </h2>
        <p className="text-lg text-outline mb-8">
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
          <div className="mt-6 p-4 bg-emerald-500/10 rounded-lg">
            <p className="text-emerald-700 font-medium">
              Thanks for joining! We&apos;ll be in touch soon.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
