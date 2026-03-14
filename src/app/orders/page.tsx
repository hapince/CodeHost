'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCart, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, ArrowLeft, DollarSign, Package, Store, MapPin, Clock, CheckCircle, XCircle, User, ClipboardList, Star, Settings, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import {
  Button, Avatar, AvatarImage, AvatarFallback,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui';
import { NotificationCenter } from '@/components/ui/notification-center';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import AiChat from '@/components/AiChat';

type OrderTab = 'products' | 'bought' | 'sold';

interface OrderStats {
  totalBought: number;
  totalSold: number;
  totalSpent: number;
  totalEarned: number;
}

interface ProductOrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; title: string; slug: string; mainImage: string | null };
  variant: { id: string; name: string } | null;
}

interface ProductOrder {
  id: string;
  orderNo: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  createdAt: string;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
  items: ProductOrderItem[];
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<OrderTab>('products');
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [productOrders, setProductOrders] = useState<ProductOrder[]>([]);
  const [productOrderPagination, setProductOrderPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<OrderStats>({ totalBought: 0, totalSold: 0, totalSpent: 0, totalEarned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) { router.push('/login'); return; }

    // Check for Stripe payment redirect
    const payment = searchParams.get('payment');
    const orderId = searchParams.get('orderId');
    if (payment === 'success' && orderId) {
      showToast('Payment successful! Your order is being processed.', 'success');
    } else if (payment === 'cancelled' && orderId) {
      showToast('Payment was cancelled. Your order is pending. You can retry payment from the order details.', 'warning');
    }

    fetchData();
  }, [_hasHydrated, isAuthenticated]);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated) fetchData();
  }, [activeTab, productOrderPagination.page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const res = await fetch(`/api/product-orders?page=${productOrderPagination.page}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProductOrders(data.orders);
          setProductOrderPagination(prev => ({ ...prev, total: data.pagination.total, totalPages: data.pagination.totalPages }));
        }
      } else {
        const type = activeTab === 'bought' ? 'bought' : 'sold';
        const res = await fetch(`/api/orders?type=${type}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPurchases(data.purchases || []);
          setSales(data.sales || []);
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats on mount
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      fetch('/api/orders?type=all', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.stats) setStats(data.stats); })
        .catch(() => {});
    }
  }, [_hasHydrated, isAuthenticated]);

  const statusBadge = (status: string) => {
    if (status === 'PAID') return <span className="inline-flex items-center gap-1 text-xs font-mono uppercase px-2 py-0.5 bg-green-100 text-green-700 border border-green-300"><CheckCircle size={12} />Paid</span>;
    if (status === 'PENDING_PAYMENT') return <span className="inline-flex items-center gap-1 text-xs font-mono uppercase px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-300"><Clock size={12} />Pending</span>;
    if (status === 'CANCELLED') return <span className="inline-flex items-center gap-1 text-xs font-mono uppercase px-2 py-0.5 bg-red-100 text-red-700 border border-red-300"><XCircle size={12} />Cancelled</span>;
    return <span className="text-xs font-mono uppercase">{status}</span>;
  };

  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen texture-lines flex flex-col">
      {/* Navbar */}
      <nav className="border-b-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="font-display text-2xl tracking-tight">CodeHost</Link>
            <div className="flex items-center gap-2 md:gap-4">
              <Link href="/shop" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <Store size={16} className="mr-2" />
                  Shop
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
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-8 lg:px-12 py-12">
        {/* Page title */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <div>
            <h1 className="font-display text-4xl tracking-tight">My Orders</h1>
            <p className="text-muted-foreground">Manage your purchases and sales</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="border-4 border-foreground p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package size={16} className="text-blue-600" />
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Product Orders</span>
            </div>
            <span className="font-display text-2xl">{productOrderPagination.total}</span>
          </div>
          <div className="border-4 border-foreground p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownCircle size={16} className="text-green-600" />
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Project Purchases</span>
            </div>
            <span className="font-display text-2xl">{stats.totalBought}</span>
          </div>
          <div className="border-4 border-foreground p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpCircle size={16} className="text-blue-600" />
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Sales</span>
            </div>
            <span className="font-display text-2xl">{stats.totalSold}</span>
          </div>
          <div className="border-4 border-foreground p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className="text-green-600" />
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Total Income</span>
            </div>
            <span className="font-display text-2xl">${stats.totalEarned.toFixed(2)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-4 border-foreground w-fit">
          {[
            { key: 'products' as OrderTab, label: 'Product Orders' },
            { key: 'bought' as OrderTab, label: 'Project Purchases' },
            { key: 'sold' as OrderTab, label: 'Project Sales' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-2 text-sm font-mono transition-colors ${
                activeTab === tab.key ? 'bg-foreground text-background font-bold' : 'hover:bg-muted'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Product Orders tab */}
            {activeTab === 'products' && (
              <>
                {productOrders.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-border-light">
                    <Package size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-display text-2xl mb-2">No product orders</h3>
                    <p className="text-muted-foreground mb-4">Browse our shop and discover great products.</p>
                    <Link href="/shop">
                      <Button>Browse Shop →</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {productOrders.map(order => (
                      <div key={order.id} className="border-4 border-foreground">
                        {/* Order header */}
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 border-b-2 border-foreground">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="font-mono text-xs text-muted-foreground">Order #</span>
                              <span className="font-mono text-sm font-bold ml-1">{order.orderNo}</span>
                            </div>
                            {statusBadge(order.status)}
                          </div>
                          <div className="text-right">
                            <span className="font-display text-xl">${order.totalAmount.toFixed(2)}</span>
                            <span className="block text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                          </div>
                        </div>

                        {/* Order items */}
                        <div className="divide-y divide-border-light">
                          {order.items.map(item => (
                            <div key={item.id} className="flex gap-4 p-4">
                              <Link href={`/shop/${item.product.slug}`} className="shrink-0">
                                <div className="w-16 h-16 border border-foreground overflow-hidden bg-muted">
                                  {item.product.mainImage ? (
                                    <img src={item.product.mainImage} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package size={20} className="text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                              </Link>
                              <div className="flex-1 min-w-0">
                                <Link href={`/shop/${item.product.slug}`} className="font-display hover:underline">
                                  {item.product.title}
                                </Link>
                                {item.variant && (
                                  <p className="text-xs text-muted-foreground">Variant: {item.variant.name}</p>
                                )}
                                <div className="flex items-center gap-4 mt-1 text-sm">
                                  <span className="font-mono">${item.price.toFixed(2)}</span>
                                  <span className="text-muted-foreground">× {item.quantity}</span>
                                  <span className="font-mono font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Shipping info */}
                        {order.shippingName && (
                          <div className="p-4 bg-muted/20 border-t-2 border-foreground">
                            <div className="flex items-start gap-2">
                              <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                              <div className="text-sm">
                                <span className="font-semibold">{order.shippingName}</span>
                                {order.shippingPhone && <span className="text-muted-foreground ml-2">{order.shippingPhone}</span>}
                                <p className="text-muted-foreground">
                                  {[order.shippingAddress, order.shippingCity, order.shippingState, order.shippingZip, order.shippingCountry].filter(Boolean).join(', ')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Pagination */}
                    {productOrderPagination.totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-8">
                        <Button variant="outline" size="sm"
                          onClick={() => setProductOrderPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                          disabled={productOrderPagination.page <= 1}>
                          <ChevronLeft size={16} className="mr-1" /> Previous
                        </Button>
                        <span className="font-mono text-sm">{productOrderPagination.page} / {productOrderPagination.totalPages}</span>
                        <Button variant="outline" size="sm"
                          onClick={() => setProductOrderPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                          disabled={productOrderPagination.page >= productOrderPagination.totalPages}>
                          Next <ChevronRight size={16} className="ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Project Purchase orders */}
            {activeTab === 'bought' && (
              <>
                {purchases.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-border-light">
                    <ShoppingCart size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-display text-2xl mb-2">No purchases</h3>
                    <p className="text-muted-foreground mb-4">Explore and discover quality projects</p>
                    <Link href="/explore">
                      <Button>Browse Public Projects →</Button>
                    </Link>
                  </div>
                ) : (
                  purchases.map(p => (
                    <div key={p.id} className="border-4 border-foreground p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <ArrowDownCircle size={20} className="text-green-600 flex-shrink-0" />
                          <div>
                            <Link href={`/explore/${p.project.slug}`} className="font-medium hover:underline">
                              {p.project.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">Seller:</span>
                              <Link href={`/user/${p.project.owner.id}`} className="flex items-center gap-1 text-xs hover:underline">
                                <Avatar className="w-4 h-4">
                                  {p.project.owner.avatar && <AvatarImage src={p.project.owner.avatar} alt="" />}
                                  <AvatarFallback className="text-[6px]">{p.project.owner.name.slice(0, 1)}</AvatarFallback>
                                </Avatar>
                                {p.project.owner.name}
                              </Link>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-lg">-${p.amount.toFixed(2)}</span>
                          <span className="block text-xs text-muted-foreground">{formatDate(p.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Sales orders */}
            {activeTab === 'sold' && (
              <>
                {sales.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-border-light">
                    <DollarSign size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-display text-2xl mb-2">No sales yet</h3>
                    <p className="text-muted-foreground">When someone purchases your project, it will appear here.</p>
                  </div>
                ) : (
                  sales.map(s => (
                    <div key={s.id} className="border-4 border-foreground p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <ArrowUpCircle size={20} className="text-blue-600 flex-shrink-0" />
                          <div>
                            <Link href={`/project/${s.project.slug}`} className="font-medium hover:underline">
                              {s.project.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">Buyer:</span>
                              <Link href={`/user/${s.buyer.id}`} className="flex items-center gap-1 text-xs hover:underline">
                                <Avatar className="w-4 h-4">
                                  {s.buyer.avatar && <AvatarImage src={s.buyer.avatar} alt="" />}
                                  <AvatarFallback className="text-[6px]">{s.buyer.name.slice(0, 1)}</AvatarFallback>
                                </Avatar>
                                {s.buyer.name}
                              </Link>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-lg text-green-600">+${s.amount.toFixed(2)}</span>
                          <span className="block text-xs text-muted-foreground">{formatDate(s.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
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

