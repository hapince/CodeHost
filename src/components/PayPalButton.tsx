'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';

// Global singleton to prevent multiple SDK loads
let paypalPromise: Promise<any> | null = null;
let lastErrorMsg = '';

function buildSdkUrl(): { url: string; clientId: string } {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error('PayPal Client ID not configured (NEXT_PUBLIC_PAYPAL_CLIENT_ID)');
  const mode = process.env.NEXT_PUBLIC_PAYPAL_MODE || 'live';
  const base = mode === 'sandbox'
    ? 'https://www.sandbox.paypal.com/sdk/js'
    : 'https://www.paypal.com/sdk/js';
  return { url: `${base}?client-id=${clientId}&currency=USD`, clientId };
}

function loadPayPalManually(): Promise<any> {
  return new Promise((resolve, reject) => {
    const { url } = buildSdkUrl();
    // Check if script already exists and paypal is available
    const existing = document.querySelector(`script[src^="${url.split('?')[0]}"]`);
    if (existing && (window as any).paypal) {
      return resolve((window as any).paypal);
    }
    // Remove stale scripts
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => {
      const pp = (window as any).paypal;
      if (pp) {
        resolve(pp);
      } else {
        reject(new Error(`SDK script loaded but window.paypal is undefined. Mode: ${process.env.NEXT_PUBLIC_PAYPAL_MODE || 'live'}, URL: ${url}`));
      }
    };
    script.onerror = () => {
      reject(new Error(`Failed to fetch PayPal SDK script. URL: ${url}`));
    };
    document.head.appendChild(script);
  });
}

function getPayPal(): Promise<any> {
  if (paypalPromise) return paypalPromise;
  paypalPromise = loadPayPalManually()
    .then((paypal) => {
      if (!paypal) throw new Error('PayPal SDK returned null after loading');
      console.log('[PayPal] SDK loaded successfully');
      return paypal;
    })
    .catch((err) => {
      paypalPromise = null; // allow retry on failure
      lastErrorMsg = err?.message || String(err);
      console.error('[PayPal] SDK load failed:', lastErrorMsg);
      throw err;
    });
  return paypalPromise;
}

interface PayPalButtonProps {
  amount: number;
  type: 'product_order' | 'topup';
  orderId?: string;
  topUpId?: string;
  token: string;
  onSuccess: (data: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function PayPalButton({
  amount,
  type,
  orderId,
  topUpId,
  token,
  onSuccess,
  onError,
  disabled,
  className,
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [paypal, setPaypal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sdkError, setSdkError] = useState(false);
  const { showToast } = useToast();
  const buttonsRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    getPayPal()
      .then((pp) => {
        if (!cancelled) {
          setPaypal(pp);
          setSdkReady(true);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err?.message || String(err);
          console.error('PayPal SDK load error:', msg);
          setLoading(false);
          setSdkError(true);
          showToast(`PayPal SDK error: ${msg}`, 'error');
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!sdkReady || !paypal || !containerRef.current || disabled) return;

    // Close previous buttons instance
    if (buttonsRef.current) {
      try { buttonsRef.current.close(); } catch (e) {}
    }
    // Clear container
    containerRef.current.innerHTML = '';

    const buttons = paypal.Buttons({
      style: {
        layout: 'horizontal',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
        height: 45,
      },
      createOrder: async () => {
        try {
          const res = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ type, amount, orderId, topUpId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          return data.paypalOrderId;
        } catch (err: any) {
          showToast(err.message || 'Failed to create PayPal order', 'error');
          throw err;
        }
      },
      onApprove: async (data: any) => {
        try {
          const res = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              paypalOrderId: data.orderID,
              type,
              orderId,
              topUpId,
              amount,
            }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error);
          showToast('Payment successful!', 'success');
          onSuccess(result);
        } catch (err: any) {
          const msg = err.message || 'Payment capture failed';
          showToast(msg, 'error');
          onError?.(msg);
        }
      },
      onCancel: () => {
        showToast('Payment cancelled', 'warning');
      },
      onError: (err: any) => {
        console.error('PayPal error:', err);
        showToast('PayPal payment error', 'error');
        onError?.('PayPal payment error');
      },
    });

    buttonsRef.current = buttons;

    if (buttons.isEligible()) {
      buttons.render(containerRef.current);
    }

    return () => {
      if (buttonsRef.current) {
        try { buttonsRef.current.close(); } catch (e) {}
        buttonsRef.current = null;
      }
    };
  }, [sdkReady, paypal, amount, type, orderId, topUpId, token, disabled]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-3 text-sm text-muted-foreground ${className || ''}`}>
        <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="50" strokeDashoffset="20"/></svg>
        Loading PayPal...
      </div>
    );
  }

  if (sdkError) {
    return (
      <button
        onClick={() => {
          setSdkError(false);
          setLoading(true);
          paypalPromise = null;
          getPayPal()
            .then((pp) => { setPaypal(pp); setSdkReady(true); setLoading(false); })
            .catch(() => { setLoading(false); setSdkError(true); showToast(`PayPal retry failed: ${lastErrorMsg}`, 'error'); });
        }}
        className={`w-full border-2 border-dashed border-[#0070ba] text-[#0070ba] py-3 text-xs hover:bg-[#0070ba]/5 transition-colors ${className || ''}`}
        title={lastErrorMsg}
      >
        PayPal load failed — Click to retry
        {lastErrorMsg && <span className="block text-[10px] mt-0.5 opacity-70 truncate max-w-full">{lastErrorMsg}</span>}
      </button>
    );
  }

  return <div ref={containerRef} className={className || ''} />;
}
