import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare, Sparkles, CheckCircle2, Smartphone } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const { lang } = useLang();
  const { showToast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone PWA mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // 2. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !/crios|fxios|opios/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Check dismissal expiry (suppress for 3 days after user closes)
    try {
      const dismissedAt = localStorage.getItem('wanchai_pwa_dismissed_at');
      if (dismissedAt) {
        const diffDays = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
        if (diffDays < 3) return;
      }
    } catch {}

    // 4. Capture Chromium beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Give the user a pleasant moment before surfacing the prompt
      setTimeout(() => setShowPrompt(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Track successful install
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      showToast(
        lang === 'th' ? 'ติดตั้งแอปวันใจสำเร็จแล้ว!' : 'Wanchai Soy App Installed!',
        lang === 'th'
          ? 'คุณสามารถเปิดใช้งานจากหน้าจอหลักได้ตลอดเวลา'
          : 'You can now launch the app directly from your home screen',
        'info'
      );
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // If on iOS and not standalone, show prompt after initial engagement
    if (isIosDevice && !isStandaloneMode) {
      const timer = setTimeout(() => {
        try {
          const dismissedAt = localStorage.getItem('wanchai_pwa_dismissed_at');
          if (!dismissedAt) {
            setShowPrompt(true);
          }
        } catch {}
      }, 4000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [lang, showToast]);

  const handleInstallClick = async () => {
    triggerHaptic('medium');

    if (isIOS) {
      // Toggle iOS instruction guide
      setShowIOSInstructions((prev) => !prev);
      return;
    }

    if (!deferredPrompt) {
      showToast(
        lang === 'th' ? 'กำลังเตรียมการติดตั้ง' : 'Preparing installation',
        lang === 'th'
          ? 'หากป๊อปอัพไม่แสดง ให้กดเมนูเบราว์เซอร์แล้วเลือก "ติดตั้งแอป"'
          : 'If popup does not appear, tap your browser menu and choose "Install App"',
        'info'
      );
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      } else {
        dismissPrompt();
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
      dismissPrompt();
    }
  };

  const dismissPrompt = () => {
    triggerHaptic('tap');
    setShowPrompt(false);
    setShowIOSInstructions(false);
    try {
      localStorage.setItem('wanchai_pwa_dismissed_at', String(Date.now()));
    } catch {}
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-45"
        role="dialog"
        aria-label={lang === 'th' ? 'ติดตั้งแอปพลิเคชัน' : 'Install Web App'}
      >
        <div className="rounded-3xl bg-forest-dark/95 text-cream border border-emerald-500/30 shadow-2xl backdrop-blur-xl p-4 sm:p-5 relative overflow-hidden">
          {/* Subtle brand glow ornament */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={dismissPrompt}
            className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-cream/80 hover:text-white flex items-center justify-center transition active:scale-90"
            aria-label={lang === 'th' ? 'ปิด' : 'Dismiss'}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            {/* App Icon */}
            <div className="h-12 w-12 rounded-2xl bg-cream text-forest flex items-center justify-center shrink-0 shadow-md relative overflow-hidden">
              <span className="font-display italic font-bold text-2xl leading-none">w</span>
              <div className="absolute inset-0.5 rounded-xl border border-forest/10" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-display italic font-bold text-base text-cream">
                  {lang === 'th' ? 'ติดตั้งแอป วันใจ Soy' : 'Install Wanchai Soy App'}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-semibold uppercase">
                  PWA
                </span>
              </div>
              <p className="text-xs text-cream/80 mt-1 leading-snug">
                {lang === 'th'
                  ? 'สั่งสะดวก สัมผัสลื่นไหล เปิดได้ทันทีแม้สัญญาณเน็ตไม่เสถียร'
                  : 'Fast 1-tap launch from home screen. Works even on spotty market Wi-Fi.'}
              </p>
            </div>
          </div>

          {/* iOS Instructions Drawer if expanded */}
          {showIOSInstructions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3.5 pt-3 border-t border-white/15 text-xs text-cream/90 space-y-2"
            >
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <Smartphone className="h-4 w-4" />
                <span>{lang === 'th' ? 'วิธีติดตั้งบน iOS (iPhone/iPad):' : 'Install on iOS Safari:'}</span>
              </div>
              <ol className="list-decimal pl-5 space-y-1 text-[11px] text-cream/80">
                <li className="flex items-center gap-1.5">
                  <span>{lang === 'th' ? 'กดปุ่มแชร์' : 'Tap the Share icon'}</span>
                  <span className="inline-flex items-center px-1 py-0.5 rounded bg-white/15 text-white">
                    <Share className="h-3 w-3 inline" />
                  </span>
                  <span>{lang === 'th' ? 'ที่แถบด้านล่างของ Safari' : 'in Safari toolbar'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span>{lang === 'th' ? 'เลื่อนลงแล้วเลือก' : 'Scroll down & tap'}</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/15 text-white font-semibold">
                    <PlusSquare className="h-3 w-3 inline" />
                    <span>{lang === 'th' ? 'เพิ่มไปยังหน้าจอโฮม' : 'Add to Home Screen'}</span>
                  </span>
                </li>
                <li>{lang === 'th' ? 'กด "เพิ่ม" (Add) ที่มุมขวาบน' : 'Tap "Add" in top right corner'}</li>
              </ol>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-forest-dark font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
            >
              <Download className="h-4 w-4 stroke-[2.5]" />
              <span>
                {isIOS
                  ? showIOSInstructions
                    ? (lang === 'th' ? 'ซ่อนวิธีติดตั้ง' : 'Hide Guide')
                    : (lang === 'th' ? 'ดูวิธีติดตั้งบน iPhone' : 'How to Install on iPhone')
                  : (lang === 'th' ? 'ติดตั้งลงเครื่องทันที' : 'Install App Now')}
              </span>
            </button>

            <button
              type="button"
              onClick={dismissPrompt}
              className="h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-cream/80 text-xs font-semibold active:scale-95 transition"
            >
              {lang === 'th' ? 'ไว้คราวหน้า' : 'Not Now'}
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
