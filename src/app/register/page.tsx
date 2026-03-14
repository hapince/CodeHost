'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
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
            Start<br />Building.
          </h1>
          <p className="text-lg opacity-80">
            Create an account to start your code collaboration journey.
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
            Register
          </h2>
          <p className="text-muted-foreground mb-8">
            Already have an account?{' '}
            <Link href="/login" className="border-b border-foreground hover:border-b-2">
              Log In Now
            </Link>
          </p>

          {error && (
            <div className="border-2 border-foreground bg-muted p-4 mb-6">
              <p className="font-mono text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registering...' : 'Create Account →'}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border-light">
            <p className="text-sm text-muted-foreground text-center">
              By registering, you agree to our Terms of Service and <a href="/privacy" target="_blank" className="underline hover:text-foreground">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
