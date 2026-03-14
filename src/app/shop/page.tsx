'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Package, ArrowLeft, ArrowRight, ShoppingCart, Store, User, ClipboardList, Star, Settings, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import {
  Button, Input, Card, CardHeader, CardTitle, CardDescription, CardFooter,
  Avatar, AvatarImage, AvatarFallback,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui';
import { NotificationCenter } from '@/components/ui/notification-center';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/components/ui/toast';
import AiChat from '@/components/AiChat';

interface Product {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  price: number;
  mainImage: string | null;
  createdAt: string;
  variants: { id: string; name: string; price: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ShopPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, search, sortBy]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '12',
      });
      if (search) params.set('search', search);
      if (sortBy) params.set('sort', sortBy);

      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleAddToCart = async (productId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, variantId: null, quantity: 1 }),
      });
      if (res.ok) {
        showToast('Added to cart!', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to add to cart', 'error');
      }
    } catch (e) {
      showToast('Failed to add to cart', 'error');
    }
  };

  return (
    <div className="min-h-screen texture-lines flex flex-col">
      {/* Navbar */}
      <nav className="border-b-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link href={isAuthenticated ? '/dashboard' : '/'} className="font-display text-2xl tracking-tight">
              CodeHost
            </Link>
            <div className="flex items-center gap-2 md:gap-4">
              {_hasHydrated && isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm">Dashboard</Button>
                  </Link>
                  <Link href="/cart">
                    <Button variant="ghost" size="sm">
                      <ShoppingCart size={16} className="mr-2" />
                      Cart
                    </Button>
                  </Link>
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
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Log In</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Get Started →</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-8 lg:px-12 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Store size={28} strokeWidth={1.5} />
              <h1 className="font-display text-4xl md:text-5xl tracking-tight">Shop</h1>
            </div>
            <p className="text-muted-foreground">Browse our featured products and tools.</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search products..."
                className="border-2 border-foreground pl-10 pr-4 py-2 text-sm w-64 focus:outline-none"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="hidden md:block border-2 border-foreground px-3 py-2 text-sm bg-background focus:outline-none"
            >
              <option value="latest">Latest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="title">Name</option>
            </select>
          </form>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-24">
            <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">Loading...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-border-light">
            <Package size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-display text-2xl mb-2">No products found</h3>
            <p className="text-muted-foreground">Check back later for new products.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <div key={product.id} className="group border border-border-light hover:border-foreground bg-background transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <Link href={`/shop/${product.slug}`}>
                    <div className="aspect-[4/3] overflow-hidden border-b border-border-light group-hover:border-foreground transition-colors duration-300 bg-muted">
                    {product.mainImage ? (
                      <img src={product.mainImage} alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={48} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-5">
                  <Link href={`/shop/${product.slug}`}>
                    <h3 className="font-display text-xl tracking-tight mb-1 hover:underline">{product.title}</h3>
                  </Link>
                  {product.shortDescription && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.shortDescription}</p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-display text-2xl">${product.price.toFixed(2)}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToCart(product.id)}
                        className="border-2 border-foreground p-2 hover:bg-foreground hover:text-background transition-colors"
                        title="Add to Cart"
                      >
                        <ShoppingCart size={18} />
                      </button>
                      <Link href={`/shop/${product.slug}`}>
                        <button className="bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-90 transition-colors">
                          View →
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-12">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
            >
              <ArrowLeft size={16} className="mr-1" /> Previous
            </Button>
            <span className="font-mono text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
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

      {_hasHydrated && isAuthenticated && <AiChat />}
    </div>
  );
}
