'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-[440px]">
      <div className="bg-white p-8 sm:p-12 rounded-xl shadow-sm border border-[#0d968b]/10">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="flex items-center gap-2 text-[#0d968b]">
            <Image src="/laundryping-icon.png" alt="LaundryPing" width={32} height={32} className="size-8 rounded-lg" />
            <h2 className="text-[#111817] text-xl font-bold leading-tight tracking-tight">
              LaundryPing
            </h2>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#111817]">Forgot password</h1>
          <p className="mt-2 text-sm text-[#618986]">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            Check your email for a reset link.
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-[#111817] mb-2">
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="e.g., alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-lg"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 min-h-11 rounded-lg bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>
        )}

        {/* Back to Login */}
        <div className="mt-8 text-center text-sm text-[#618986]">
          <p>
            Remember your password?{' '}
            <Link href="/login" className="font-semibold text-[#0d968b] hover:underline">
              Log in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-[#618986]">
          <p>&copy; {new Date().getFullYear()} LaundryPing. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
