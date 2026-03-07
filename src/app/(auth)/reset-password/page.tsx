'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

// Module-level variable to survive React strict mode double-mount
let recoveryToken: string | null = null;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(() => {
    // Check if token was already captured (e.g. strict mode re-mount)
    return !!recoveryToken;
  });

  useEffect(() => {
    if (ready) return;

    // Parse the implicit-flow hash fragment from Supabase's recovery link
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const type = params.get('type');

    if (accessToken && type === 'recovery') {
      recoveryToken = accessToken;
      // Clear tokens from URL to prevent exposure in history/address bar
      window.history.replaceState(null, '', window.location.pathname);
      // Use a microtask to set state outside the effect body
      queueMicrotask(() => setReady(true));
    }
  }, [ready]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!recoveryToken) {
      setError('Reset session expired. Please request a new reset link.');
      return;
    }

    setLoading(true);

    try {
      // Call Supabase Auth API directly with the recovery access token.
      // This bypasses @supabase/ssr's cookie-based session management which
      // doesn't work with the implicit flow (hash fragment) tokens that
      // generateLink returns. Internally, supabase.auth.updateUser() does
      // the exact same PUT request — we just skip the broken session lookup.
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${recoveryToken}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.msg || data.error_description || 'Failed to update password');
        setLoading(false);
        return;
      }

      // Clear the module-level token
      recoveryToken = null;

      toast.success('Password updated! Please log in with your new password.');
      router.push('/login');
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
            <Image src="/laundryping-icon.png" alt="LaundryPing" width={32} height={32} className="size-8 rounded-lg" />
            <h2 className="text-[#111817] text-xl font-bold leading-tight tracking-tight">
              LaundryPing
            </h2>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#111817]">Set new password</h1>
          <p className="mt-2 text-sm text-[#618986]">
            Choose a strong password for your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!ready && !error && (
          <div className="mb-6 flex items-center justify-center gap-2 text-sm text-[#618986]">
            <Loader2 className="size-4 animate-spin" />
            Verifying reset link...
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={`space-y-6 ${!ready ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <Label htmlFor="password" className="text-sm font-medium text-[#111817] mb-2">
              New password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="At least 8 characters"
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

          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-[#111817] mb-2">
              Confirm new password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-lg pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#618986] hover:text-[#111817] transition-colors min-w-11 justify-center"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !ready}
            className="w-full h-11 min-h-11 rounded-lg bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-[#618986]">
          <p>&copy; {new Date().getFullYear()} LaundryPing. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
