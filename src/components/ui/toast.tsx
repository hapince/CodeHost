'use client';

import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors: Record<ToastType, string> = {
  success: 'border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100 dark:border-green-500',
  error: 'border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100 dark:border-red-500',
  warning: 'border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-500',
  info: 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-500',
};

const iconColors: Record<ToastType, string> = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
};

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const Icon = icons[toast.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 border-2 shadow-lg max-w-sm w-full
        transition-all duration-300 ease-out
        ${colors[toast.type]}
        ${visible && !exiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <Icon size={18} className={`mt-0.5 flex-shrink-0 ${iconColors[toast.type]}`} />
      <p className="text-sm flex-1 font-medium">{toast.message}</p>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 300); }}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
