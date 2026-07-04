'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/api-services';
import { useAuthStore } from '@/stores/auth-store';
import { useRedirectIfAuthenticated } from '@/hooks/use-auth-guard';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { hasHydrated, isAuthenticated } = useRedirectIfAuthenticated();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authService.login(email, password);
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      toast.success('Welcome back!');
      router.push('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
          'Cannot reach API server. Check NEXT_PUBLIC_API_URL on Vercel and CORS settings on Render.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!hasHydrated || isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-white">
            <Sparkles className="h-6 w-6 text-[var(--foreground)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Welcome to Keshavai</h1>
          <p className="mt-2 text-[var(--muted)]">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--muted)]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[var(--foreground)] underline hover:opacity-80">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
