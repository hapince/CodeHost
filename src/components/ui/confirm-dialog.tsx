'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

interface ConfirmContextType {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType>({
  showConfirm: () => Promise.resolve(false),
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    dialog?.resolve(true);
    setDialog(null);
  };

  const handleCancel = () => {
    dialog?.resolve(false);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={handleCancel} />
          <div className="relative bg-background border-4 border-foreground max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-start gap-4">
              {dialog.variant === 'danger' && (
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border-2 border-red-600 bg-red-50 dark:bg-red-950">
                  <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                </div>
              )}
              <div className="flex-1">
                {dialog.title && (
                  <h3 className="font-display text-lg tracking-tight mb-2">{dialog.title}</h3>
                )}
                <p className="text-sm text-muted-foreground leading-relaxed">{dialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancel}
                className="border-2 border-foreground px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
              >
                {dialog.cancelText || 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  dialog.variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700 border-2 border-red-600'
                    : 'bg-foreground text-background hover:opacity-90 border-2 border-foreground'
                }`}
              >
                {dialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
