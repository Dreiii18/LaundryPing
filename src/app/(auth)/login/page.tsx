'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function LoginBanners() {
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === 'true';
  const authError = searchParams.get('error') === 'auth_callback_failed';

  return (
    <>
      {registered && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          Account created! Check your email to verify, then log in.
        </div>
      )}
      {authError && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          Authentication failed. Please try again.
        </div>
      )}
    </>
  );
}

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
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
            <Image src="/laundryping-icon.png" alt="LaundryPing" width={96} height={96} className="size-8 rounded-lg" />
            <h2 className="text-[#111817] text-xl font-bold leading-tight tracking-tight">
              LaundryPing
            </h2>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#111817]">Log in</h1>
          <p className="mt-2 text-sm text-[#618986]">
            Enter your credentials to access your account
          </p>
        </div>

        {/* Banners from URL params */}
        <Suspense fallback={null}>
          <LoginBanners />
        </Suspense>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#111817]">
                Password
              </Label>
              <Link href="/forgot-password" className="text-xs font-medium text-[#0d968b] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-lg pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#618986] hover:text-[#111817] transition-colors min-w-11 justify-center"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 min-h-11 rounded-lg bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Log in'
            )}
          </Button>
        </form>

        {/* Signup Link */}
        <div className="mt-8 text-center text-sm text-[#618986]">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[#0d968b] hover:underline">
              Sign up
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

export default function LoginPage() {
  return <LoginForm />;
}
