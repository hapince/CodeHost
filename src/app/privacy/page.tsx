'use client';

import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen texture-lines flex flex-col">
      {/* Navbar */}
      <nav className="border-b-4 border-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-display text-2xl tracking-tight">CodeHost</Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">Log In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started →</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-8 lg:px-12 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Shield size={28} />
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">Privacy Policy</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8 font-mono">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="prose prose-neutral max-w-none space-y-8">
          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4 border-b-2 border-foreground pb-2">1. Introduction</h2>
            <p className="text-foreground/80 leading-relaxed">
              Welcome to CodeHost, operated by Hapince Technology ("we", "us", or "our"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, how we use it, and what rights you have in relation to it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4 border-b-2 border-foreground pb-2">2. Information We Collect</h2>
            <p className="text-foreground/80 leading-relaxed mb-3">We collect information that you provide directly to us when you:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80">
              <li>Create an account (name, email address, password)</li>
              <li>Update your profile (avatar, bio, contact information)</li>
              <li>Create, upload, or manage code projects</li>
              <li>Make purchases or transactions on our platform</li>
              <li>Purchase products from our shop (shipping address, phone number)</li>
              <li>Communicate with us or other users</li>
              <li>Submit comments or reviews</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4 border-b-2 border-foreground pb-2">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-foreground/80">
              <li>To provide, maintain, and improve our services</li>
              <li>To process transactions and send related information</li>
              <li>To send you technical notices, updates, and support messages</li>
              <li>To respond to your comments, questions, and requests</li>
              <li>To monitor and analyze trends, usage, and activities</li>
              <li>To detect, investigate, and prevent fraudulent or unauthorized activity</li>
              <li>To personalize and improve your experience on our platform</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4 border-b-2 border-foreground pb-2">4. Payment Information</h2>
            <p className="text-foreground/80 leading-relaxed">
              We use Stripe as our payment processor. When you make a payment, your payment information is collected and processed directly by Stripe. We do not store your credit card numbers or full payment details on our servers. Please refer to Stripe's Privacy Policy for more information on how they handle your data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4 border-b-2 border-foreground pb-2">5. Data Security</h2>
            <p className="text-foreground/80 leading-relaxed">
              We implement appropriate technical and organizational measures to protect the security of your personal information. However, please note that no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4 border-b-2 border-foreground pb-2">6. Data Retention</h2>
            <p className="text-foreground/80 leading-relaxed">
              We will retain your personal information for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4 border-b-2 border-foreground pb-2">7. Your Rights</h2>
            <p className="text-foreground/80 leading-relaxed mb-3">Depending on your location, you may have certain rights regarding your personal information, including:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80">
              <li>The right to access your personal data</li>
              <li>The right to correct inaccurate personal data</li>
              <li>The right to request deletion of your personal data</li>
              <li>The right to restrict or object to processing of your personal data</li>
              <li>The right to data portability</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mt-3">
              To exercise any of these rights, please contact us through the platform's settings page or email us directly.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4 border-b-2 border-foreground pb-2">8. Cookies</h2>
            <p className="text-foreground/80 leading-relaxed">
              We use essential cookies and local storage to maintain your authentication session and remember your preferences. We do not use third-party tracking cookies for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4 border-b-2 border-foreground pb-2">9. Third-Party Services</h2>
            <p className="text-foreground/80 leading-relaxed">
              Our service may contain links to third-party websites or services that are not operated by us. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services. We strongly advise you to review the privacy policy of every site you visit.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4 border-b-2 border-foreground pb-2">10. Changes to This Policy</h2>
            <p className="text-foreground/80 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight mb-4 border-b-2 border-foreground pb-2">11. Contact Us</h2>
            <p className="text-foreground/80 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through the platform or email us at support@codehost.dev.
            </p>
          </section>
        </div>
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
    </div>
  );
}
