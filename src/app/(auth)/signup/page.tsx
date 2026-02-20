'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, WashingMachine } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (shopName.trim().length === 0) {
      setError('Shop name is required');
      return;
    }
    if (shopName.trim().length > 50) {
      setError('Shop name must be 50 characters or less');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          shopName: shopName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }

      // Redirect to login with success indication
      router.push('/login?registered=true');
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-[440px]">
      <div className="bg-white p-8 sm:p-12 rounded-xl shadow-sm border border-[#0d968b]/10">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="flex items-center gap-2 text-[#0d968b]">
            <div className="size-8 flex items-center justify-center rounded-lg bg-[#0d968b]/10">
              <WashingMachine className="size-5 text-[#0d968b]" />
            </div>
            <h2 className="text-[#111817] text-xl font-bold leading-tight tracking-tight">
              LaundryPing
            </h2>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#111817]">Create account</h1>
          <p className="mt-2 text-sm text-[#618986]">
            Set up your laundromat in minutes
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="shopName" className="text-sm font-medium text-[#111817] mb-2">
              Shop name
            </Label>
            <Input
              id="shopName"
              name="shopName"
              type="text"
              required
              maxLength={50}
              placeholder="e.g., Spin & Go Laundry"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="h-11 rounded-lg"
            />
          </div>

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

          <div>
            <Label htmlFor="password" className="text-sm font-medium text-[#111817] mb-2">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-lg pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#618986] hover:text-[#111817] transition-colors min-w-[44px] justify-center"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-[#111817] mb-2">
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-lg pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#618986] hover:text-[#111817] transition-colors min-w-[44px] justify-center"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 min-h-[44px] rounded-lg bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        {/* Login Link */}
        <div className="mt-8 text-center text-sm text-[#618986]">
          <p>
            Already have an account?{' '}
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
