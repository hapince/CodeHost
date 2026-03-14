'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      login(data.user, data.token);
      router.push('/dashboard');
    } catch {
      setError('Network error, please try again later');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex texture-lines">
      {/* Left decoration */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background items-center justify-center p-12">
        <div className="max-w-md">
          <h1 className="font-display text-6xl tracking-tighter mb-8">
            Welcome<br />Back.
          </h1>
          <p className="text-lg opacity-80">
            Log in to continue your code collaboration journey.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <Link href="/" className="font-display text-2xl tracking-tight">
              CodeHost
            </Link>
          </div>

          <h2 className="font-display text-4xl tracking-tight mb-2">
            Log In
          </h2>
          <p className="text-muted-foreground mb-8">
            Don't have an account?{' '}
            <Link href="/register" className="border-b border-foreground hover:border-b-2">
              Register Now
            </Link>
          </p>

          {error && (
            <div className="border-2 border-foreground bg-muted p-4 mb-6">
              <p className="font-mono text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In →'}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border-light">
            <p className="text-sm text-muted-foreground text-center">
              By logging in, you agree to our Terms of Service and <a href="/privacy" target="_blank" className="underline hover:text-foreground">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
