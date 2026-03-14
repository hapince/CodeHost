'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, GitBranch, Shield, Users, Code, History, Globe, DollarSign, Upload, TrendingUp, ShieldCheck, Sparkles, Package, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch featured products for homepage
    fetch('/api/products?limit=6&sort=latest')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.products) setFeaturedProducts(data.products); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (isAuthenticated) {
      router.push('/dashboard');
      return;
    }
    setReady(true);
  }, [_hasHydrated, isAuthenticated, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center texture-lines">
        <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen texture-lines">
      {/* Navigation */}
      <nav className="border-b-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-display text-2xl tracking-tight">
              CodeHost
            </Link>
            <div className="flex items-center gap-2 md:gap-4">
              <Link href="/explore" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <Globe size={16} className="mr-2" />
                  Projects
                </Button>
              </Link>
              <Link href="/shop" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <Store size={16} className="mr-2" />
                  Shop
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  Get Started →
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Mobile: Browse Public Projects row */}
        <div className="md:hidden border-t-2 border-foreground">
          <div className="max-w-6xl mx-auto px-6 py-2">
            <Link href="/explore" className="block">
              <Button variant="ghost" size="sm" className="w-full justify-center">
                <Globe size={16} className="mr-2" />
                Projects
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-24 md:py-32 lg:py-40">
        <div className="space-y-12">
          {/* Decorative element */}
          <div className="flex items-center gap-4">
            <div className="h-px bg-foreground flex-1" />
            <div className="w-3 h-3 border-2 border-foreground" />
          </div>
          
          {/* Main heading */}
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl tracking-tighter leading-none">
            Code.<br />
            Collaborate.<br />
            Create.
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl max-w-2xl leading-relaxed">
            By Hapince Technology — A minimalist code hosting platform designed for teams that value clarity, precision, and real-time collaboration.
          </p>
          
          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8">
            <Link href="/register">
              <Button size="lg">
                Start Building →
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Divider */}
      <div className="h-1 bg-foreground" />
      
      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-24 md:py-32">
        <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-16">
          Built for Teams
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div 
              key={feature.title}
              className="group border-2 border-foreground p-8 transition-colors duration-100 hover:bg-foreground hover:text-background cursor-pointer"
            >
              <feature.icon size={32} strokeWidth={1.5} className="mb-6 group-hover:text-background" />
              <h3 className="font-display text-2xl tracking-tight mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground group-hover:text-background">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-border-light" />

      {/* More features */}
      <section className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-8">
              Powerful Features,<br />Simple Experience
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Hapince Technology believes the best tools are the ones that stay out of your way. CodeHost gives you everything you need,
              nothing you don't.
            </p>
            <Link href="/register">
              <Button>
                Try for Free →
              </Button>
            </Link>
          </div>
          <div className="space-y-6">
            {moreFeatures.map((feature) => (
              <div key={feature.title} className="flex gap-4 items-start">
                <div className="w-8 h-8 border-2 border-foreground flex items-center justify-center shrink-0">
                  <feature.icon size={16} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-lg mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sell your Code Section */}
      <section className="border-t-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-24 md:py-32">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-3 h-3 bg-foreground" />
            <h2 className="font-display text-4xl md:text-5xl tracking-tight">
              Sell your Code
            </h2>
          </div>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl">
            Publish your public projects on CodeHost. Every paid download means revenue that's all yours. Turn quality code into your passive income source.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {sellFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group border-2 border-foreground p-8 transition-colors duration-100 hover:bg-foreground hover:text-background cursor-pointer"
              >
                <feature.icon size={32} strokeWidth={1.5} className="mb-6 group-hover:text-background" />
                <h3 className="font-display text-2xl tracking-tight mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground group-hover:text-background">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* How It Works */}
          <div className="border-2 border-foreground">
            <div className="border-b-2 border-foreground px-8 py-4">
              <h3 className="font-display text-2xl tracking-tight">How It Works</h3>
            </div>
            <div className="grid md:grid-cols-4 divide-y-2 md:divide-y-0 md:divide-x-2 divide-foreground">
              {sellSteps.map((step, index) => (
                <div key={step.title} className="p-6">
                  <div className="font-mono text-xs tracking-widest uppercase text-muted-foreground mb-3">
                    Step {index + 1}
                  </div>
                  <h4 className="font-display text-lg mb-2">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="border-t-4 border-foreground">
          <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-24 md:py-32">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-3 h-3 bg-foreground" />
              <h2 className="font-display text-4xl md:text-5xl tracking-tight">
                Featured Products
              </h2>
            </div>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl">
              Discover tools, templates, and resources to accelerate your development workflow.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {featuredProducts.map((product: any) => (
                <Link key={product.id} href={`/shop/${product.slug}`}>
                  <div className="group border-2 border-foreground transition-colors duration-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
                    <div className="aspect-[4/3] overflow-hidden border-b-2 border-foreground bg-muted">
                      {product.mainImage ? (
                        <img src={product.mainImage} alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={48} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-xl tracking-tight mb-1">{product.title}</h3>
                      {product.shortDescription && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.shortDescription}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-display text-2xl">${product.price.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">View →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center">
              <Link href="/shop">
                <Button size="lg">
                  Browse All Products →
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="border-t-4 border-foreground bg-muted">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-24 md:py-32 text-center">
          <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join the teams already building with CodeHost. Powered by Hapince Technology.
          </p>
          <Link href="/register">
            <Button size="lg">
              Create Free Account →
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-display text-xl">CodeHost</div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Powered by <span className="font-semibold">Hapince Technology</span></span>
              <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
            </div>
            <div className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
              © {new Date().getFullYear()} Hapince Tech. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: 'Real-time Editing',
    description: 'See changes instantly when collaborating with your team, with support for simultaneous multi-user editing.',
    icon: Zap,
  },
  {
    title: 'Version Control',
    description: 'Built-in commit history tracks every change, allowing you to revert code state at any time.',
    icon: GitBranch,
  },
  {
    title: 'Role Management',
    description: 'Fine-grained permission control for owners, editors, and viewers.',
    icon: Shield,
  },
];

const moreFeatures = [
  {
    title: 'Team Collaboration',
    description: 'Invite team members, assign roles, and manage projects together.',
    icon: Users,
  },
  {
    title: 'Code Highlighting',
    description: 'Syntax highlighting and smart suggestions for 50+ programming languages.',
    icon: Code,
  },
  {
    title: 'Commit History',
    description: 'A clear timeline showing all changes with version comparison support.',
    icon: History,
  },
];

const sellFeatures = [
  {
    title: 'Publish & Earn',
    description: 'Upload your code project and make it public. When other users pay to download, all revenue goes directly to your account balance.',
    icon: DollarSign,
  },
  {
    title: 'Automatic Build & Publish',
    description: 'No manual packaging needed — the system automatically handles the build and publish process, so you can focus on writing better code.',
    icon: Sparkles,
  },
  {
    title: 'Secure & Trusted',
    description: 'The platform provides comprehensive code copyright protection and transaction security mechanisms, making every transaction safe and reliable.',
    icon: ShieldCheck,
  },
];

const sellSteps = [
  {
    title: 'Create Project',
    description: 'Create a new code project on the platform and upload your source code.',
  },
  {
    title: 'Make Public',
    description: 'Set your project visibility to public so everyone can browse it.',
  },
  {
    title: 'Wait for Revenue',
    description: 'When someone pays to download your project, the revenue is automatically added to your balance.',
  },
  {
    title: 'Withdraw to Account',
    description: 'View your balance on the profile page and request a withdrawal to your account at any time.',
  },
];
