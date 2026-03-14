'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart, Store, Package, ChevronLeft, ChevronRight, MapPin, X, User, ClipboardList, Star, Settings, LogOut, LayoutDashboard, Shield } from 'lucide-react';
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

interface ProductDetail {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  mainImage: string | null;
  status: string;
  createdAt: string;
  images: { id: string; url: string; sortOrder: number }[];
  variants: { id: string; name: string; price: number; stock: number }[];
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { user, token, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const { showToast } = useToast();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [pendingPayPalOrder, setPendingPayPalOrder] = useState<{ orderId: string; shortfall: number } | null>(null);
  const [shipping, setShipping] = useState({
    name: '', phone: '', address: '', city: '', state: '', zip: '', country: '',
  });

  useEffect(() => {
    fetchProduct();
  }, [params.slug]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${params.slug}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      } else {
        router.push('/shop');
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  const allImages = product ? [
    ...(product.mainImage ? [product.mainImage] : []),
    ...product.images.map(img => img.url),
  ] : [];

  const currentVariant = product?.variants?.find(v => v.id === selectedVariant);
  const displayPrice = currentVariant ? currentVariant.price : product?.price || 0;

  const handleAddToCart = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: product!.id,
          variantId: selectedVariant,
          quantity,
        }),
      });
      if (res.ok) {
        showToast('Added to cart!', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to add to cart', 'error');
      }
    } catch (e) { showToast('Failed to add to cart', 'error'); }
    finally { setAdding(false); }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    // Fetch balance and show shipping dialog
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserBalance(data.balance || 0);
      }
    } catch (e) {}
    setShipping(prev => ({ ...prev, name: prev.name || user?.name || '' }));
    setPendingPayPalOrder(null);
    setShowShippingDialog(true);
  };

  const confirmBuyNow = async (paymentMethod: 'stripe' | 'paypal' = 'stripe') => {
    if (!shipping.name || !shipping.phone || !shipping.address || !shipping.city || !shipping.zip || !shipping.country) {
      showToast('Please fill in all required shipping fields.', 'warning');
      return;
    }
    setBuying(true);
    try {
      const res = await fetch('/api/product-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: [{
            productId: product!.id,
            variantId: selectedVariant,
            quantity,
          }],
          fromCart: false,
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
        showToast(data.error || 'Failed to place order', 'error');
      }
    } catch (e) { showToast('Failed to place order', 'error'); }
    finally { setBuying(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center texture-lines">
        <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!product) return null;

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
                  <Link href="/shop">
                    <Button variant="ghost" size="sm">
                      <Store size={16} className="mr-2" />
                      Shop
                    </Button>
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
                  <Link href="/shop">
                    <Button variant="ghost" size="sm">
                      <Store size={16} className="mr-2" />
                      Shop
                    </Button>
                  </Link>
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

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-8 lg:px-12 py-12">
        {/* Breadcrumb */}
        <Link href="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft size={16} />
          Back to Shop
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div>
            <div className="aspect-square border-2 border-foreground overflow-hidden bg-muted mb-4">
              {allImages.length > 0 ? (
                <img
                  src={allImages[currentImageIndex]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={64} className="text-muted-foreground" />
                </div>
              )}
            </div>
            {/* Thumbnail Strip */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`w-16 h-16 border-2 overflow-hidden flex-shrink-0 ${
                      currentImageIndex === i ? 'border-foreground' : 'border-border-light hover:border-foreground'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-4">{product.title}</h1>
            {product.shortDescription && (
              <p className="text-muted-foreground text-lg mb-6">{product.shortDescription}</p>
            )}

            <div className="border-t-2 border-foreground pt-6 mb-6">
              <span className="font-display text-4xl">${displayPrice.toFixed(2)}</span>
            </div>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-mono uppercase tracking-widest mb-2">Variant</label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v.id)}
                      className={`border-2 px-4 py-2 text-sm transition-colors ${
                        selectedVariant === v.id
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border-light hover:border-foreground'
                      }`}
                    >
                      {v.name} — ${v.price.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-8">
              <label className="block text-xs font-mono uppercase tracking-widest mb-2">Quantity</label>
              <div className="flex items-center border-2 border-foreground w-fit">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="px-3 py-2 hover:bg-muted transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-4 py-2 font-mono border-x-2 border-foreground min-w-[50px] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="px-3 py-2 hover:bg-muted transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={adding}
                  className="flex-1 border-2 border-foreground px-6 py-3 text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ShoppingCart size={18} />
                  {adding ? 'Adding...' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={buying}
                  className="flex-1 bg-foreground text-background px-6 py-3 text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {buying ? 'Processing...' : 'Buy Now →'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-16 border-t-4 border-foreground pt-8">
            <h2 className="font-display text-2xl tracking-tight mb-6">Description</h2>
            <div className="prose max-w-none text-foreground whitespace-pre-wrap">
              {product.description}
            </div>
          </div>
        )}
      </main>

      {/* Shipping Dialog for Buy Now */}
      {showShippingDialog && product && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border-4 border-foreground max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b-2 border-foreground">
              <div className="flex items-center gap-3">
                <MapPin size={20} />
                <h2 className="font-display text-2xl">Shipping & Payment</h2>
              </div>
              <button onClick={() => { setShowShippingDialog(false); setPendingPayPalOrder(null); }} className="p-1 hover:bg-muted">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Order preview */}
              <div className="flex gap-3 p-3 border-2 border-foreground bg-muted/30 mb-2">
                {product.mainImage ? (
                  <img src={product.mainImage} alt="" className="w-14 h-14 object-cover border border-foreground" />
                ) : (
                  <div className="w-14 h-14 bg-muted border border-foreground flex items-center justify-center">
                    <Package size={20} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm truncate">{product.title}</p>
                  {currentVariant && <p className="text-xs text-muted-foreground">{currentVariant.name}</p>}
                  <p className="font-mono text-sm">${displayPrice.toFixed(2)} × {quantity} = ${(displayPrice * quantity).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-mono uppercase tracking-widest">Full Name *</Label>
                  <Input value={shipping.name} onChange={e => setShipping(s => ({ ...s, name: e.target.value }))} placeholder="John Doe" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-mono uppercase tracking-widest">Phone *</Label>
                  <Input value={shipping.phone} onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))} placeholder="+1 234 567 8900" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-mono uppercase tracking-widest">Address *</Label>
                <Input value={shipping.address} onChange={e => setShipping(s => ({ ...s, address: e.target.value }))} placeholder="123 Main Street" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-mono uppercase tracking-widest">City *</Label>
                  <Input value={shipping.city} onChange={e => setShipping(s => ({ ...s, city: e.target.value }))} placeholder="New York" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-mono uppercase tracking-widest">State / Province</Label>
                  <Input value={shipping.state} onChange={e => setShipping(s => ({ ...s, state: e.target.value }))} placeholder="NY" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-mono uppercase tracking-widest">ZIP Code *</Label>
                  <Input value={shipping.zip} onChange={e => setShipping(s => ({ ...s, zip: e.target.value }))} placeholder="10001" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-mono uppercase tracking-widest">Country *</Label>
                  <Input value={shipping.country} onChange={e => setShipping(s => ({ ...s, country: e.target.value }))} placeholder="United States" />
                </div>
              </div>

              {/* Payment summary */}
              {(() => {
                const orderTotal = displayPrice * quantity;
                const shortfall = Math.max(0, Math.round((orderTotal - userBalance) * 100) / 100);
                return (
                  <div className="border-t-2 border-foreground pt-4 mt-4">
                    <h3 className="font-display text-lg mb-3">Payment Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Order Total</span>
                        <span className="font-mono font-bold">${orderTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>From Balance</span>
                        <span className="font-mono">- ${Math.min(userBalance, orderTotal).toFixed(2)}</span>
                      </div>
                      {shortfall > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Remaining to pay</span>
                          <span className="font-mono">${shortfall.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Stripe button */}
                    <button
                      onClick={() => confirmBuyNow('stripe')}
                      disabled={buying}
                      className="w-full bg-foreground text-background py-3 text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                    >
                      <StripeLogo size={14} />
                      {buying ? 'Processing...' : shortfall > 0 ? `Pay $${shortfall.toFixed(2)} via Stripe →` : 'Place Order →'}
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
                          onClick={() => confirmBuyNow('paypal')}
                          disabled={buying}
                          className="w-full border-2 border-[#0070ba] text-[#0070ba] py-3 text-sm font-semibold hover:bg-[#0070ba] hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <PayPalLogo size={16} />
                          {buying ? 'Processing...' : `Pay $${shortfall.toFixed(2)} via PayPal`}
                        </button>
                      </div>
                    )}

                    {/* PayPal payment widget after order created */}
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

                    {shortfall <= 0 && (
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Full amount will be paid from your balance.
                      </p>
                    )}
                  </div>
                );
              })()}
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

      {_hasHydrated && isAuthenticated && <AiChat />}
    </div>
  );
}
