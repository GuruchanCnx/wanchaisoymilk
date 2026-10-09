import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, Sparkles, X, WifiOff, Wifi, ChevronUp, ChevronDown } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { useLang } from './LanguageContext';

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
  isOnline: boolean;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  removeToast: () => {},
  isOnline: true,
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { lang, t } = useLang();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isOfflineBannerDismissed, setIsOfflineBannerDismissed] = useState(false);

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

  // Monitor navigator.onLine status changes for automatic offline banner & PWA feedback
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsOfflineBannerDismissed(false);
      triggerHaptic('success');
      showToast(
        lang === 'th' ? 'กลับมาออนไลน์แล้ว' : 'Back Online',
        lang === 'th'
          ? 'เชื่อมต่ออินเทอร์เน็ตแล้ว ข้อมูลซิงค์กับเซิร์ฟเวอร์เรียบร้อย'
          : 'Internet restored. Orders & data synced with server.',
        'success'
      );
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsOfflineBannerDismissed(false);
      triggerHaptic('warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [lang, showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, isOnline }}>
      {children}

      {/* Automatic PWA Offline Status Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed top-0 left-0 right-0 z-60 pointer-events-auto"
            role="status"
            aria-live="assertive"
          >
            {!isOfflineBannerDismissed ? (
              <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-terracotta text-cream px-3 sm:px-4 py-2.5 shadow-xl border-b border-white/20 backdrop-blur-md">
                <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-black/20 flex items-center justify-center shrink-0">
                      <WifiOff className="h-4 w-4 text-honey animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-thai font-bold text-xs sm:text-sm text-white">
                          {t.offlineBannerTitle}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/25 text-[10px] font-mono uppercase font-bold text-cream tracking-wide">
                          PWA Cache Active
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-cream/90 truncate sm:whitespace-normal leading-tight mt-0.5">
                        {t.offlineBannerDesc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setIsOfflineBannerDismissed(true);
                      }}
                      title={lang === 'th' ? 'ย่อแถบการแจ้งเตือน' : 'Minimize banner'}
                      className="px-2 py-1 rounded-lg bg-black/20 hover:bg-black/35 text-[11px] font-semibold flex items-center gap-1 transition active:scale-95"
                    >
                      <ChevronUp className="h-3 w-3" />
                      <span className="hidden sm:inline">
                        {lang === 'th' ? 'ย่อ' : 'Minimize'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Collapsed discreet pill when dismissed so user still knows they are offline
              <div className="flex justify-center pt-2 pointer-events-none">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setIsOfflineBannerDismissed(false);
                  }}
                  className="pointer-events-auto px-3 py-1 rounded-full bg-amber-600/95 text-cream text-[11px] font-bold shadow-lg flex items-center gap-1.5 border border-white/30 backdrop-blur-md active:scale-95 transition"
                >
                  <WifiOff className="h-3 w-3 animate-pulse text-honey" />
                  <span>{lang === 'th' ? 'ออฟไลน์ (แตะเพื่อขยาย)' : 'Offline (Tap to expand)'}</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Floating Notification Container */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2.5 w-[92vw] max-w-sm pointer-events-none transition-all duration-300 ${
          !isOnline && !isOfflineBannerDismissed ? 'top-16' : 'top-4'
        }`}
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
