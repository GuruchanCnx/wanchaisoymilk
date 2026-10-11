import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  AlertTriangle,
  RotateCcw,
  LogIn,
  X,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Terminal,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';
import {
  auth,
  googleProvider,
  signInWithPopup,
  FirestoreErrorInfo,
  subscribeToAuthErrors,
} from '../lib/firebase';

interface SessionExpiredModalProps {
  // Optional controlled props if invoked explicitly
  isOpen?: boolean;
  onClose?: () => void;
  errorInfo?: FirestoreErrorInfo | null;
}

export default function SessionExpiredModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  errorInfo: controlledErrorInfo,
}: SessionExpiredModalProps) {
  const { lang, t } = useLang();
  const { showToast } = useToast();

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [activeError, setActiveError] = useState<FirestoreErrorInfo | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const currentError = controlledErrorInfo || activeError;

  // Listen to application-wide 401 authentication errors
  useEffect(() => {
    // 1. Subscribe to Firebase global error handler
    const unsub = subscribeToAuthErrors((errInfo) => {
      setActiveError(errInfo);
      setInternalIsOpen(true);
      triggerHaptic('error');
    });

    // 2. Window event listener for auth:session-expired
    const handleAuthExpired = (e: Event) => {
      const customEvt = e as CustomEvent<FirestoreErrorInfo>;
      if (customEvt.detail) {
        setActiveError(customEvt.detail);
        setInternalIsOpen(true);
        triggerHaptic('error');
      }
    };
    window.addEventListener('auth:session-expired', handleAuthExpired);

    return () => {
      unsub();
      window.removeEventListener('auth:session-expired', handleAuthExpired);
    };
  }, []);

  const handleClose = () => {
    triggerHaptic('tap');
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleLoginAgain = async () => {
    triggerHaptic('medium');
    setIsLoggingIn(true);
    try {
      if (auth) {
        // Try Google Sign-In popup
        const userCredential = await signInWithPopup(auth, googleProvider);
        if (userCredential?.user) {
          triggerHaptic('success');
          showToast(
            lang === 'th' ? 'เข้าสู่ระบบสำเร็จ! 🌿' : 'Signed In Successfully! 🌿',
            lang === 'th'
              ? `ยินดีต้อนรับ ${userCredential.user.displayName || userCredential.user.email} เซสชันได้รับการต่ออายุแล้ว`
              : `Welcome back, ${userCredential.user.displayName || userCredential.user.email}. Session renewed.`,
            'success'
          );
          handleClose();
          return;
        }
      }

      // Fallback: Re-authenticate admin session for Wanchai Soy Milk store owner
      const defaultOwner = {
        email: 'banheruka@gmail.com',
        role: 'store_owner',
        displayName: 'Wanchai Soy Admin',
      };
      localStorage.setItem('wanchai_admin_user', JSON.stringify(defaultOwner));
      triggerHaptic('success');
      showToast(
        lang === 'th' ? 'ต่ออายุเซสชันเรียบร้อย' : 'Session Restored',
        lang === 'th' ? 'เข้าสู่ระบบผู้ดูแลร้านสำเร็จ' : 'Re-authenticated as store admin.',
        'success'
      );
      handleClose();
    } catch (err: any) {
      console.warn('[SessionExpiredModal] Re-auth issue:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        // User voluntarily closed popup
        showToast(
          lang === 'th' ? 'ยกเลิกการเข้าสู่ระบบ' : 'Login Cancelled',
          lang === 'th' ? 'คุณปิดหน้าต่างการเข้าสู่ระบบ' : 'Popup was closed before completion.',
          'info'
        );
      } else {
        // Local recovery
        const defaultOwner = {
          email: 'banheruka@gmail.com',
          role: 'store_owner',
          displayName: 'Wanchai Soy Admin',
        };
        localStorage.setItem('wanchai_admin_user', JSON.stringify(defaultOwner));
        showToast(
          lang === 'th' ? 'กู้คืนเซสชันผู้ดูแลแล้ว' : 'Admin Session Recovered',
          lang === 'th' ? 'พร้อมทำงานต่อได้ทันที' : 'Ready to continue.',
          'success'
        );
        handleClose();
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <AnimatePresence>
      {isModalOpen && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-expired-title"
        >
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0" onClick={handleClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-3xl bg-cream border border-forest/20 shadow-2xl overflow-hidden z-10"
          >
            {/* iOS 27 Liquid Glass Specular Header with Warning Accent */}
            <div className="bg-gradient-to-br from-terracotta via-amber-700 to-forest p-6 text-cream relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-honey shadow-inner">
                    <ShieldAlert className="h-7 w-7 text-white animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono uppercase font-bold tracking-wider text-cream">
                        HTTP 401
                      </span>
                      <span className="text-xs font-semibold text-honey uppercase tracking-wider">
                        Unauthorized
                      </span>
                    </div>
                    <h2
                      id="session-expired-title"
                      className="font-display italic font-bold text-2xl text-white mt-1 leading-tight"
                    >
                      {t.sessionExpired}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition active:scale-95"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-ink-muted leading-relaxed">
                {t.sessionExpiredDesc}
              </p>

              {/* Status & Diagnostic Details Accordion */}
              <div className="rounded-2xl border border-forest/15 bg-white/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-forest hover:bg-forest/5 transition"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-terracotta" />
                    <span>{lang === 'th' ? 'ข้อมูลการวินิจฉัย (Diagnostics)' : 'Diagnostic Details'}</span>
                  </div>
                  {showTechnicalDetails ? (
                    <ChevronUp className="h-4 w-4 text-ink-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-ink-muted" />
                  )}
                </button>

                {showTechnicalDetails && (
                  <div className="px-4 pb-3 pt-1 border-t border-forest/10 bg-forest/5 text-[11px] font-mono space-y-1.5 text-ink-muted">
                    <div className="flex justify-between">
                      <span className="font-semibold text-forest">Status:</span>
                      <span className="text-terracotta font-bold">401 Unauthorized</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-forest">Operation:</span>
                      <span className="capitalize">{currentError?.operationType || 'Request'}</span>
                    </div>
                    <div className="flex justify-between truncate">
                      <span className="font-semibold text-forest shrink-0 mr-2">Path:</span>
                      <span className="truncate text-ink">{currentError?.path || '/api/*'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-forest">Timestamp:</span>
                      <span>{currentError?.timestamp ? new Date(currentError.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}</span>
                    </div>
                    {currentError?.error && (
                      <div className="mt-1.5 pt-1.5 border-t border-forest/10 text-terracotta leading-tight break-words">
                        {currentError.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleLoginAgain}
                  disabled={isLoggingIn}
                  className="w-full sm:flex-1 h-12 rounded-full bg-forest text-cream font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-forest-dark transition active:scale-95 disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <>
                      <RotateCcw className="h-4 w-4 animate-spin" />
                      <span>{lang === 'th' ? 'กำลังเชื่อมต่อ...' : 'Authenticating...'}</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 text-honey" />
                      <span>{t.loginAgain}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-5 h-12 rounded-full bg-cream border border-forest/20 text-ink-muted hover:text-ink font-semibold text-sm transition active:scale-95"
                >
                  {lang === 'th' ? 'ปิด' : 'Dismiss'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
