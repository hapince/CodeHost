'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Moon, Sun, Bell, Shield } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [_hasHydrated, isAuthenticated]);

  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen texture-lines flex flex-col">
      {/* Navbar */}
      <nav className="border-b-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="font-display text-2xl tracking-tight">
              CodeHost
            </Link>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-12 flex-1 w-full">
        <h1 className="font-display text-4xl tracking-tight mb-8">Settings</h1>

        <div className="space-y-8">
          {/* Account settings */}
          <div className="border-2 border-foreground p-8">
            <h2 className="font-display text-xl mb-4 flex items-center gap-2">
              <Shield size={20} /> Account Security
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Change Password</Label>
                <div className="space-y-2">
                  <Input type="password" placeholder="Current password" />
                  <Input type="password" placeholder="New password" />
                  <Input type="password" placeholder="Confirm new password" />
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  Update Password
                </Button>
              </div>
            </div>
          </div>

          {/* Notification settings */}
          <div className="border-2 border-foreground p-8">
            <h2 className="font-display text-xl mb-4 flex items-center gap-2">
              <Bell size={20} /> Notification Settings
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Receive project invitation notifications</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Receive project update notifications</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span>Receive email notifications</span>
              </label>
            </div>
          </div>

          {/* Danger zone */}
          <div className="border-2 border-red-500 p-8">
            <h2 className="font-display text-xl mb-4 text-red-500">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Logging out will clear the current session. Account deletion is irreversible.
            </p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  router.push('/');
                }}
              >
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-display text-xl">CodeHost</div>
            <div className="text-sm text-muted-foreground">
              Powered by <span className="font-semibold">Hapince Technology</span>
            </div>
            <div className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
              © {new Date().getFullYear()} Hapince Tech.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
