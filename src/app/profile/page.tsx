'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Mail, Calendar, FolderGit2, Users, Wallet, DollarSign, Camera, CreditCard, CheckCircle, X, Loader2, History } from 'lucide-react';
import { Button, Input, Label, Avatar, AvatarImage, AvatarFallback } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/components/ui/toast';
import PayPalButton from '@/components/PayPalButton';
import { StripeLogo, PayPalLogo } from '@/components/ui/payment-icons';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isAuthenticated, _hasHydrated, updateUser } = useAuthStore();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);
  const [topUpError, setTopUpError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [topUpHistory, setTopUpHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchProfile();
  }, [_hasHydrated, isAuthenticated]);

  const fetchProfile = async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name);
      } else {
        console.error('Failed to fetch profile, status:', res.status);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Stripe redirect: verify session and credit balance
  useEffect(() => {
    const topupStatus = searchParams.get('topup');
    const sessionId = searchParams.get('session_id');

    if (topupStatus === 'success' && sessionId && token) {
      verifyTopUp(sessionId);
    } else if (topupStatus === 'cancelled') {
      setTopUpError('Payment was cancelled.');
      // Clean URL
      router.replace('/profile');
    }
  }, [searchParams, token]);

  const verifyTopUp = async (sessionId: string) => {
    try {
      const res = await fetch('/api/stripe/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTopUpSuccess(true);
        // Refresh profile to get updated balance
        fetchProfile();
        // Clean URL
        router.replace('/profile');
      } else {
        const data = await res.json();
        setTopUpError(data.error || 'Verification failed');
        router.replace('/profile');
      }
    } catch (err) {
      setTopUpError('Failed to verify payment');
      router.replace('/profile');
    }
  };

  const handleTopUp = async (amount: number) => {
    setTopUpLoading(true);
    setTopUpError('');
    try {
      const res = await fetch('/api/stripe/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect to Stripe Checkout
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const data = await res.json();
        setTopUpError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      setTopUpError('Connection error. Please try again.');
    } finally {
      setTopUpLoading(false);
    }
  };

  const fetchTopUpHistory = async () => {
    try {
      const res = await fetch('/api/stripe/topup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTopUpHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch top-up history:', err);
    }
  };

  if (!_hasHydrated || !isAuthenticated) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        updateUser({ avatar: data.avatar });
        setProfile((prev: any) => prev ? { ...prev, avatar: data.avatar } : prev);
      } else {
        const data = await res.json();
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Upload failed, please try again', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

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
        <h1 className="font-display text-4xl tracking-tight mb-8">Profile</h1>

        {loading ? (
          <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">Loading...</p>
        ) : profile ? (
          <div className="space-y-8">
            {/* Avatar and basic info */}
            <div className="border-2 border-foreground p-8">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-20 h-20">
                    {profile.avatar && <AvatarImage src={profile.avatar} alt={profile.name} />}
                    <AvatarFallback className="text-2xl">
                      {profile.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                    <Camera size={20} className="text-white" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={avatarUploading}
                    />
                  </label>
                  {avatarUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <span className="text-white text-xs">Uploading</span>
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="font-display text-2xl">{profile.name}</h2>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Mail size={14} /> {profile.email}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Calendar size={14} /> Joined on {new Date(profile.createdAt).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="border-2 border-foreground p-8 bg-muted">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Wallet size={24} />
                    <span className="font-display text-xl">My Balance</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Revenue from code sales &amp; top-ups</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-4xl">${(profile.balance || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Available balance</p>
                </div>
              </div>

              {/* Success / Error Messages */}
              {topUpSuccess && (
                <div className="mt-4 p-3 border-2 border-green-600 bg-green-50 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-sm text-green-800">Top-up successful! Your balance has been updated.</span>
                  <button onClick={() => setTopUpSuccess(false)} className="ml-auto">
                    <X size={14} />
                  </button>
                </div>
              )}
              {topUpError && (
                <div className="mt-4 p-3 border-2 border-red-600 bg-red-50 flex items-center gap-2">
                  <X size={16} className="text-red-600" />
                  <span className="text-sm text-red-800">{topUpError}</span>
                  <button onClick={() => setTopUpError('')} className="ml-auto">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Top-Up Section */}
              <div className="mt-6 pt-6 border-t-2 border-foreground">
                {!showTopUp ? (
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowTopUp(true)}
                      >
                        <CreditCard size={14} className="mr-1" />
                        Top Up Balance
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowHistory(!showHistory);
                          if (!showHistory) fetchTopUpHistory();
                        }}
                      >
                        <History size={14} className="mr-1" />
                        History
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><StripeLogo size={12} /> Powered by Stripe</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-display text-lg">Select top-up amount</span>
                      <button
                        onClick={() => { setShowTopUp(false); setTopUpError(''); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[5, 10, 20, 50, 100, 200].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => handleTopUp(amount)}
                          disabled={topUpLoading}
                          className="border-2 border-foreground p-4 hover:bg-foreground hover:text-background transition-colors font-display text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {topUpLoading ? (
                            <Loader2 size={20} className="mx-auto animate-spin" />
                          ) : (
                            `$${amount}`
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <StripeLogo size={12} /> You will be redirected to Stripe for secure payment.
                    </p>
                    <div className="mt-4 pt-4 border-t border-border-light">
                      <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1"><PayPalLogo size={14} /> Or top up via PayPal:</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[5, 10, 20, 50, 100, 200].map((amount) => (
                          <div key={`paypal-${amount}`}>
                            <PayPalButton
                              amount={amount}
                              type="topup"
                              token={token!}
                              onSuccess={() => {
                                setShowTopUp(false);
                                showToast(`Successfully topped up $${amount}!`, 'success');
                                fetchProfile();
                              }}
                              onError={(err) => showToast(err, 'error')}
                              className="w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Top-Up History */}
              {showHistory && topUpHistory.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-foreground">
                  <h4 className="font-display text-sm mb-3 uppercase tracking-widest">Recent Top-Ups</h4>
                  <div className="space-y-2">
                    {topUpHistory.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-muted-foreground/20">
                        <div>
                          <span className="font-mono">${item.amount.toFixed(2)}</span>
                          <span className="text-muted-foreground ml-2">
                            {new Date(item.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 border ${
                          item.status === 'COMPLETED'
                            ? 'border-green-600 text-green-700'
                            : item.status === 'PENDING'
                            ? 'border-yellow-600 text-yellow-700'
                            : 'border-red-600 text-red-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showHistory && topUpHistory.length === 0 && (
                <div className="mt-4 pt-4 border-t-2 border-foreground">
                  <p className="text-sm text-muted-foreground">No top-up history yet.</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-foreground p-6">
                <div className="flex items-center gap-3 mb-2">
                  <FolderGit2 size={20} />
                  <span className="font-display text-lg">Owned Projects</span>
                </div>
                <p className="font-display text-3xl">{profile._count?.ownedProjects || 0}</p>
              </div>
              <div className="border-2 border-foreground p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users size={20} />
                  <span className="font-display text-lg">Participating Projects</span>
                </div>
                <p className="font-display text-3xl">{profile._count?.projectMembers || 0}</p>
              </div>
            </div>

            {/* Edit section */}
            <div className="border-2 border-foreground p-8">
              <h3 className="font-display text-xl mb-4">Edit Profile</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Username</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!editing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile.email} disabled />
                  <p className="text-xs text-muted-foreground">Email cannot be changed at this time</p>
                </div>
                {editing ? (
                  <div className="flex gap-4">
                    <Button
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        // TODO: Add save API later
                        updateUser({ name });
                        setEditing(false);
                        setSaving(false);
                      }}
                    >
                      {saving ? 'Saving...' : 'Save →'}
                    </Button>
                    <Button variant="outline" onClick={() => { setEditing(false); setName(profile.name); }}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    Edit →
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p>Loading failed</p>
        )}
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
