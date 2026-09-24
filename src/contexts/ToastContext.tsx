import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

export type ToastType = 'success' | 'info' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  icon?: string;
}

interface ToastContextValue {
  showToast: (title: string, description?: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  removeToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, description?: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    // Tactile haptic pulse
    if (type === 'success') {
      triggerHaptic('success');
    } else if (type === 'error') {
      triggerHaptic('error');
    } else {
      triggerHaptic('light');
    }

    setToasts((prev) => [...prev.slice(-3), { id, title, description, type }]);

    // Auto dismiss after 3.2s
    setTimeout(() => {
      removeToast(id);
    }, 3200);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Floating Notification Container */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2.5 w-[92vw] max-w-sm pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.92 }}
              transition={{ type: 'spring', damping: 22, stiffness: 350 }}
              className={`pointer-events-auto rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl border flex items-center gap-3 ${
                toast.type === 'success'
                  ? 'bg-forest/95 text-cream border-emerald-500/40'
                  : toast.type === 'error'
                  ? 'bg-chili/95 text-cream border-red-500/40'
                  : 'bg-cream/95 text-forest border-forest/20'
              }`}
            >
              <div className="shrink-0">
                {toast.type === 'success' ? (
                  <div className="h-8 w-8 rounded-full bg-emerald-500/25 flex items-center justify-center text-honey">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : toast.type === 'error' ? (
                  <div className="h-8 w-8 rounded-full bg-red-500/25 flex items-center justify-center text-white">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-forest/15 flex items-center justify-center text-forest">
                    <Sparkles className="h-5 w-5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="font-thai font-bold text-sm leading-tight truncate">
                  {toast.title}
                </div>
                {toast.description && (
                  <div className="text-xs opacity-85 mt-0.5 leading-snug line-clamp-2">
                    {toast.description}
                  </div>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-black/10 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
