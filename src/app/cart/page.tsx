'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Package, Store, MapPin, X, User, ClipboardList, Star, Settings, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import {
  Button, Avatar, AvatarImage, AvatarFallback,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
  Input, Label,
} from '@/components/ui';
import { NotificationCenter } from '@/components/ui/notification-center';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/components/ui/toast';
import PayPalButton from '@/components/PayPalButton';
import { StripeLogo, PayPalLogo } from '@/components/ui/payment-icons';
import AiChat from '@/components/AiChat';

interface CartItemType {
  id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    mainImage: string | null;
    status: string;
  };
  variant: {
    id: string;
    name: string;
    price: number;
  } | null;
}

interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export default function CartPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const { showToast } = useToast();
  const [items, setItems] = useState<CartItemType[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [pendingPayPalOrder, setPendingPayPalOrder] = useState<{ orderId: string; shortfall: number } | null>(null);
  const [shipping, setShipping] = useState<ShippingInfo>({
    name: '', phone: '', address: '', city: '', state: '', zip: '', country: '',
  });

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchCart();
    fetchBalance();
  }, [_hasHydrated, isAuthenticated]);

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotalAmount(data.totalAmount);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserBalance(data.balance || 0);
      }
    } catch (e) {
      console.error('Failed to fetch balance:', e);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) fetchCart();
    } catch (e) {
      console.error('Failed to update quantity:', e);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchCart();
    } catch (e) {
      console.error('Failed to remove item:', e);
    }
  };

  const openCheckout = () => {
    if (items.length === 0) return;
    setShipping(prev => ({ ...prev, name: prev.name || user?.name || '' }));
    setPendingPayPalOrder(null);
    setShowShippingDialog(true);
  };

  const handleCheckout = async (paymentMethod: 'stripe' | 'paypal' = 'stripe') => {
    // Validate shipping
    if (!shipping.name || !shipping.phone || !shipping.address || !shipping.city || !shipping.zip || !shipping.country) {
      showToast('Please fill in all required shipping fields.', 'warning');
      return;
    }
    setCheckingOut(true);
    try {
      const res = await fetch('/api/product-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.product.id,
            variantId: item.variant?.id || null,
            quantity: item.quantity,
          })),
          fromCart: true,
          shipping,
          paymentMethod,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.paid) {
          setShowShippingDialog(false);
          showToast('Order placed successfully!', 'success');
          router.push('/orders');
        } else if (data.stripeUrl) {
          setShowShippingDialog(false);
          showToast(`Balance used: $${data.balanceUsed.toFixed(2)}. Redirecting to Stripe...`, 'info', 5000);
          window.location.href = data.stripeUrl;
        } else if (data.paymentMethod === 'paypal') {
          setPendingPayPalOrder({ orderId: data.order.id, shortfall: data.shortfall });
          showToast(`Balance used: $${data.balanceUsed.toFixed(2)}. Please complete PayPal payment.`, 'info', 5000);
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Checkout failed', 'error');
      }
    } catch (e) {
      showToast('Checkout failed', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const shortfall = Math.max(0, Math.round((totalAmount - userBalance) * 100) / 100);

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
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/shop" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-display text-4xl tracking-tight">My Cart</h1>
            <p className="text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''} in your cart</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-24">
            <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-border-light">
            <ShoppingCart size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-display text-2xl mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6">Browse our shop and add some products.</p>
            <Link href="/shop">
              <Button>Browse Shop →</Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => (
                <div key={item.id} className="border-2 border-foreground flex gap-4 p-4">
                  <Link href={`/shop/${item.product.slug}`} className="shrink-0">
                    <div className="w-20 h-20 border border-foreground overflow-hidden bg-muted">
                      {item.product.mainImage ? (
                        <img src={item.product.mainImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={24} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/shop/${item.product.slug}`} className="font-display text-lg hover:underline">
                      {item.product.title}
                    </Link>
                    {item.variant && (
                      <p className="text-sm text-muted-foreground">Variant: {item.variant.name}</p>
                    )}
                    <p className="font-display text-lg mt-1">
                      ${(item.variant ? item.variant.price : item.product.price).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button onClick={() => removeItem(item.id)}
                      className="p-1 hover:bg-red-100 text-red-600 transition-colors" title="Remove">
                      <Trash2 size={16} />
                    </button>
                    <div className="flex items-center border-2 border-foreground">
                      <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="px-2 py-1 hover:bg-muted transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="px-3 py-1 font-mono text-sm border-x-2 border-foreground">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 hover:bg-muted transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="border-4 border-foreground p-6 sticky top-4">
                <h3 className="font-display text-xl mb-6">Order Summary</h3>
                <div className="space-y-3 mb-6">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="truncate mr-2">{item.product.title} × {item.quantity}</span>
                      <span className="font-mono shrink-0">
                        ${((item.variant ? item.variant.price : item.product.price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t-2 border-foreground pt-4 mb-4">
                  <div className="flex justify-between">
                    <span className="font-display text-lg">Total</span>
                    <span className="font-display text-2xl">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                {/* Balance info */}
                <div className="text-sm mb-4 space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Your Balance</span>
                    <span className="font-mono">${userBalance.toFixed(2)}</span>
                  </div>
                  {shortfall > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Need via Stripe</span>
                      <span className="font-mono">${shortfall.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={openCheckout}
                  disabled={checkingOut || items.length === 0}
                  className="w-full bg-foreground text-background py-3 text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {shortfall > 0 ? 'Checkout → (Balance + Stripe)' : 'Checkout →'}
                </button>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  {shortfall > 0
                    ? `$${userBalance.toFixed(2)} from balance + $${shortfall.toFixed(2)} via Stripe`
                    : 'Payment will be deducted from your account balance.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Shipping Dialog */}
      {showShippingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border-4 border-foreground max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b-2 border-foreground">
              <div className="flex items-center gap-3">
                <MapPin size={20} />
                <h2 className="font-display text-2xl">Shipping Information</h2>
              </div>
              <button onClick={() => { setShowShippingDialog(false); setPendingPayPalOrder(null); }} className="p-1 hover:bg-muted">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="s-name" className="text-xs font-mono uppercase tracking-widest">Full Name *</Label>
                  <Input id="s-name" value={shipping.name}
                    onChange={e => setShipping(s => ({ ...s, name: e.target.value }))}
                    placeholder="John Doe" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-phone" className="text-xs font-mono uppercase tracking-widest">Phone *</Label>
                  <Input id="s-phone" value={shipping.phone}
                    onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))}
                    placeholder="+1 234 567 8900" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="s-address" className="text-xs font-mono uppercase tracking-widest">Address *</Label>
                <Input id="s-address" value={shipping.address}
                  onChange={e => setShipping(s => ({ ...s, address: e.target.value }))}
                  placeholder="123 Main Street, Apt 4" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="s-city" className="text-xs font-mono uppercase tracking-widest">City *</Label>
                  <Input id="s-city" value={shipping.city}
                    onChange={e => setShipping(s => ({ ...s, city: e.target.value }))}
                    placeholder="New York" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-state" className="text-xs font-mono uppercase tracking-widest">State / Province</Label>
                  <Input id="s-state" value={shipping.state}
                    onChange={e => setShipping(s => ({ ...s, state: e.target.value }))}
                    placeholder="NY" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="s-zip" className="text-xs font-mono uppercase tracking-widest">ZIP / Postal Code *</Label>
                  <Input id="s-zip" value={shipping.zip}
                    onChange={e => setShipping(s => ({ ...s, zip: e.target.value }))}
                    placeholder="10001" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-country" className="text-xs font-mono uppercase tracking-widest">Country *</Label>
                  <Input id="s-country" value={shipping.country}
                    onChange={e => setShipping(s => ({ ...s, country: e.target.value }))}
                    placeholder="United States" required />
                </div>
              </div>

              {/* Payment summary */}
              <div className="border-t-2 border-foreground pt-4 mt-6">
                <h3 className="font-display text-lg mb-3">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Order Total</span>
                    <span className="font-mono font-bold">${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>From Balance</span>
                    <span className="font-mono">- ${Math.min(userBalance, totalAmount).toFixed(2)}</span>
                  </div>
                  {shortfall > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Remaining to pay</span>
                      <span className="font-mono">${shortfall.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stripe button */}
              <button
                onClick={() => handleCheckout('stripe')}
                disabled={checkingOut}
                className="w-full bg-foreground text-background py-3 text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                <StripeLogo size={14} />
                {checkingOut ? 'Processing...' : shortfall > 0 ? `Pay $${shortfall.toFixed(2)} via Stripe →` : 'Place Order →'}
              </button>

              {/* PayPal option */}
              {shortfall > 0 && !pendingPayPalOrder && (
                <div className="mt-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px bg-border-light flex-1" />
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">or</span>
                    <div className="h-px bg-border-light flex-1" />
                  </div>
                  <button
                    onClick={() => handleCheckout('paypal')}
                    disabled={checkingOut}
                    className="w-full border-2 border-[#0070ba] text-[#0070ba] py-3 text-sm font-semibold hover:bg-[#0070ba] hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <PayPalLogo size={16} />
                    {checkingOut ? 'Processing...' : `Pay $${shortfall.toFixed(2)} via PayPal`}
                  </button>
                </div>
              )}

              {/* PayPal payment widget */}
              {pendingPayPalOrder && token && (
                <div className="mt-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px bg-border-light flex-1" />
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Complete PayPal Payment</span>
                    <div className="h-px bg-border-light flex-1" />
                  </div>
                  <PayPalButton
                    amount={pendingPayPalOrder.shortfall}
                    type="product_order"
                    orderId={pendingPayPalOrder.orderId}
                    token={token}
                    onSuccess={() => {
                      setShowShippingDialog(false);
                      setPendingPayPalOrder(null);
                      showToast('Order placed successfully!', 'success');
                      router.push('/orders');
                    }}
                    onError={(err) => showToast(err, 'error')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      <AiChat />
    </div>
  );
}
