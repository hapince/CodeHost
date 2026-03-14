'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Lock, Globe, ArrowLeft, ChevronLeft, ChevronRight, FileCode, GitCommit, User, ClipboardList, ShoppingCart, Settings, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import {
  Button, Card, CardHeader, CardTitle, CardDescription, CardFooter,
  Avatar, AvatarImage, AvatarFallback,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui';
import { NotificationCenter } from '@/components/ui/notification-center';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import AiChat from '@/components/AiChat';

export default function StarsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const [stars, setStars] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchStars();
  }, [_hasHydrated, isAuthenticated]);

  const fetchStars = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stars?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStars(data.stars);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstar = async (projectId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/star`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchStars(pagination.page);
    } catch (error) {
      console.error('Failed to unfavorite:', error);
    }
  };

  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen texture-lines flex flex-col">
      <nav className="border-b-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="font-display text-2xl tracking-tight">CodeHost</Link>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus-ring">
                    <Avatar>
                      {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                      <AvatarFallback>{user?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                    <LayoutDashboard size={16} className="mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User size={16} className="mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/orders')}>
                    <ClipboardList size={16} className="mr-2" />
                    My Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/cart')}>
                    <ShoppingCart size={16} className="mr-2" />
                    My Cart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/stars')}>
                    <Star size={16} className="mr-2" />
                    My Favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings size={16} className="mr-2" />
                    Settings
                  </DropdownMenuItem>
                  {user?.role === 'ADMIN' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/codeadmin')}>
                        <Shield size={16} className="mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { logout(); router.push('/'); }}>
                    <LogOut size={16} className="mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-8 lg:px-12 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <div>
            <h1 className="font-display text-4xl tracking-tight flex items-center gap-3">
              <Star size={32} className="text-yellow-500" />
              My Favorites
            </h1>
            <p className="text-muted-foreground">Projects you starred ({pagination.total})</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">Loading...</p>
          </div>
        ) : stars.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border-light">
            <Star size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-display text-2xl mb-2">No favorites yet</h3>
            <p className="text-muted-foreground mb-4">Browse public projects and star the ones you like</p>
            <Link href="/explore">
              <Button>Explore Projects →</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stars.map(s => (
                <Card key={s.id} className="relative group">
                  <Link href={s.project.isPrivate ? `/project/${s.project.slug}` : `/explore/${s.project.slug}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{s.project.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {s.project.isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                          {s.project.price > 0 && (
                            <span className="text-xs font-mono bg-foreground text-background px-1.5 py-0.5">
                              ${s.project.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <CardDescription>{s.project.description || 'No description'}</CardDescription>
                      {s.project.language && (
                        <span className="inline-block text-[10px] font-mono border border-border-light px-1.5 py-0.5 mt-1 w-fit">
                          {s.project.language}
                        </span>
                      )}
                    </CardHeader>
                    <CardFooter>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Link href={`/user/${s.project.owner.id}`} onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 hover:text-foreground">
                          <Avatar className="w-4 h-4">
                            {s.project.owner.avatar && <AvatarImage src={s.project.owner.avatar} alt="" />}
                            <AvatarFallback className="text-[6px]">{s.project.owner.name.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                          {s.project.owner.name}
                        </Link>
                        <span className="flex items-center gap-1">
                          <Star size={10} className="text-yellow-500" /> {s.project._count.stars}
                        </span>
                        <span className="flex items-center gap-1"><FileCode size={10} /> {s.project._count.files}</span>
                      </div>
                      <span className="text-xs font-mono">{formatDate(s.project.updatedAt)}</span>
                    </CardFooter>
                  </Link>
                  <button onClick={(e) => { e.preventDefault(); handleUnstar(s.project.id); }}
                    className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-yellow-500"
                    title="Unfavorite">
                    <Star size={16} fill="currentColor" className="text-yellow-500" />
                  </button>
                </Card>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button variant="outline" size="sm" onClick={() => fetchStars(pagination.page - 1)} disabled={pagination.page <= 1}>
                  <ChevronLeft size={16} className="mr-1" /> Previous
                </Button>
                <span className="font-mono text-sm">{pagination.page} / {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchStars(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
                  Next <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t-2 border-foreground mt-auto">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-display text-xl">CodeHost</div>
            <div className="text-sm text-muted-foreground text-center">
              Powered by <span className="font-semibold">Hapince Technology</span>
            </div>
            <div className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
              © {new Date().getFullYear()} Hapince Tech. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
      <AiChat />
    </div>
  );
}
