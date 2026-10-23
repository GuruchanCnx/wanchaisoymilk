import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sliders,
  Type,
  SunMoon,
  Check,
  X,
  RotateCcw,
  Sparkles,
  ChevronUp,
  Globe,
} from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';

export default function QuickSettingsFloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    isElderMode,
    isHighContrast,
    toggleElderMode,
    toggleHighContrast,
    setMode,
    setHighContrast,
  } = useAccessibility();
  const { lang, setLang } = useLang();
  const { showToast } = useToast();

  const handleToggleElder = () => {
    triggerHaptic('medium');
    const willBeElder = !isElderMode;
    toggleElderMode();

    if (willBeElder) {
      document.documentElement.classList.add('elder-mode');
      showToast(
        lang === 'th' ? 'เปิดโหมดตัวหนังสือใหญ่ (A+)' : 'Elder Mode (Large Font) Enabled',
        lang === 'th' ? 'ขยายขนาดตัวอักษร 115% ทั่วทั้งหน้าเว็บ' : 'Enlarged all fonts and touch targets by 115%',
        'info'
      );
    } else {
      document.documentElement.classList.remove('elder-mode');
      showToast(
        lang === 'th' ? 'คืนสู่ขนาดตัวอักษรปกติ' : 'Default Font Scale Restored',
        lang === 'th' ? 'ปรับขนาดตัวอักษรเป็นค่ามาตรฐาน' : 'Returned to default size',
        'info'
      );
    }
  };

  const handleToggleHighContrast = () => {
    triggerHaptic('medium');
    const willBeHigh = !isHighContrast;
    toggleHighContrast();

    if (willBeHigh) {
      document.documentElement.classList.add('high-contrast-mode');
      showToast(
        lang === 'th' ? 'เปิดโหมดคอนทราสต์สูง (High Contrast)' : 'High Contrast Mode Enabled',
        lang === 'th' ? 'ปรับความคมชัดสูงสุด WCAG AAA' : 'Maximized text & border contrast',
        'info'
      );
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
      showToast(
        lang === 'th' ? 'ปิดโหมดคอนทราสต์สูง' : 'High Contrast Disabled',
        lang === 'th' ? 'กลับสู่โทนสีร้านวันใจดั้งเดิม' : 'Restored warm store palette',
        'info'
      );
    }
  };

  const handleResetDefaults = () => {
    triggerHaptic('tap');
    setMode('normal');
    setHighContrast(false);
    document.documentElement.classList.remove('elder-mode');
    document.documentElement.classList.remove('high-contrast-mode');
    showToast(
      lang === 'th' ? 'คืนค่าเริ่มต้นเรียบร้อย' : 'Settings Reset to Default',
      lang === 'th' ? 'ปิดโหมดพิเศษทั้งหมดแล้ว' : 'All accessibility modes disabled',
      'info'
    );
  };

  const handleToggleLang = () => {
    triggerHaptic('tap');
    const newLang = lang === 'th' ? 'en' : 'th';
    setLang(newLang);
    showToast(
      newLang === 'th' ? 'เปลี่ยนเป็นภาษาไทยแล้ว' : 'Switched to English',
      '',
      'info'
    );
  };

  const activeCount = (isElderMode ? 1 : 0) + (isHighContrast ? 1 : 0);

  return (
    <div className="hidden sm:block fixed bottom-6 left-6 z-30">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for click outside dismiss */}
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setIsOpen(false)}
            />

            {/* Floating Action Menu Popover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="absolute bottom-12 left-0 z-50 w-72 sm:w-80 rounded-3xl bg-cream/95 text-ink border border-forest/20 shadow-2xl backdrop-blur-xl p-4 space-y-3"
              role="dialog"
              aria-label={lang === 'th' ? 'เมนูตั้งค่าด่วน' : 'Quick Settings Menu'}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-forest/10">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-forest text-cream flex items-center justify-center shadow-xs">
                    <Sparkles className="h-3.5 w-3.5 text-honey" />
                  </div>
                  <div>
                    <h4 className="font-display italic font-bold text-sm text-forest leading-none">
                      {lang === 'th' ? 'ตั้งค่าการมองเห็นด่วน' : 'Quick Settings'}
                    </h4>
                    <p className="text-[10px] text-ink-muted mt-0.5">
                      {lang === 'th' ? 'ปรับขนาดและสีได้ทันที' : 'Instant font & contrast controls'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 rounded-full bg-forest/10 hover:bg-forest/20 text-forest flex items-center justify-center transition active:scale-90"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Setting 1: Elder Mode Toggle */}
              <button
                type="button"
                onClick={handleToggleElder}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all active:scale-[0.98] ${
                  isElderMode
                    ? 'bg-amber-600 text-cream border-amber-700 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-white/90 text-ink border-forest/15 hover:border-forest/30 shadow-xs'
                }`}
                role="switch"
                aria-checked={isElderMode}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                      isElderMode ? 'bg-white/20 text-white' : 'bg-forest/10 text-forest'
                    }`}
                  >
                    <Type className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>{lang === 'th' ? 'โหมดตัวหนังสือใหญ่ (A+)' : 'Elder Mode (Large Font)'}</span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ${isElderMode ? 'text-white/80' : 'text-ink-muted'}`}>
                      {lang === 'th' ? 'ขยายอักษร 115% สบายตาผู้สูงอายุ' : '+15% font zoom for easy reading'}
                    </p>
                  </div>
                </div>

                <div
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                    isElderMode ? 'bg-white text-amber-900 shadow-xs' : 'bg-forest/10 text-forest'
                  }`}
                >
                  {isElderMode ? (
                    <>
                      <Check className="h-3 w-3 stroke-[3]" />
                      <span>ON</span>
                    </>
                  ) : (
                    <span>OFF</span>
                  )}
                </div>
              </button>

              {/* Setting 2: High Contrast Mode Toggle */}
              <button
                type="button"
                onClick={handleToggleHighContrast}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all active:scale-[0.98] ${
                  isHighContrast
                    ? 'bg-black text-white border-black shadow-md ring-2 ring-white/50'
                    : 'bg-white/90 text-ink border-forest/15 hover:border-forest/30 shadow-xs'
                }`}
                role="switch"
                aria-checked={isHighContrast}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                      isHighContrast ? 'bg-white text-black' : 'bg-forest/10 text-forest'
                    }`}
                  >
                    <SunMoon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>{lang === 'th' ? 'โหมดคอนทราสต์สูง' : 'High Contrast (AAA)'}</span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ${isHighContrast ? 'text-gray-300' : 'text-ink-muted'}`}>
                      {lang === 'th' ? 'คมชัดพิเศษ ไม่สะท้อนแดด' : 'Black/white contrast for glare'}
                    </p>
                  </div>
                </div>

                <div
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                    isHighContrast ? 'bg-white text-black shadow-xs' : 'bg-forest/10 text-forest'
                  }`}
                >
                  {isHighContrast ? (
                    <>
                      <Check className="h-3 w-3 stroke-[3]" />
                      <span>ON</span>
                    </>
                  ) : (
                    <span>OFF</span>
                  )}
                </div>
              </button>

              {/* Footer Utilities: Language Toggle & Reset */}
              <div className="pt-2 border-t border-forest/10 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleToggleLang}
                  className="px-2.5 py-1.5 rounded-xl bg-white/80 border border-forest/15 hover:bg-forest/10 text-forest font-bold text-[11px] flex items-center gap-1.5 transition active:scale-95"
                >
                  <Globe className="h-3 w-3" />
                  <span>{lang === 'th' ? '🇹🇭 ไทย' : '🇬🇧 EN'}</span>
                </button>

                {(isElderMode || isHighContrast) && (
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="px-2.5 py-1.5 rounded-xl text-ink-muted hover:text-forest text-[11px] font-medium flex items-center gap-1 hover:bg-forest/5 transition"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>{lang === 'th' ? 'รีเซ็ต' : 'Reset'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Menu Button (FAB) */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.04 }}
        onClick={() => {
          triggerHaptic('selection');
          setIsOpen(!isOpen);
        }}
        title={lang === 'th' ? 'ตั้งค่าการมองเห็นด่วน (ตัวใหญ่ / คอนทราสต์)' : 'Quick Settings (Large Font / Contrast)'}
        aria-label={lang === 'th' ? 'ตั้งค่าการมองเห็นด่วน' : 'Quick Settings'}
        className={`h-11 px-3.5 rounded-full shadow-xl flex items-center gap-2 font-bold text-xs transition-all border backdrop-blur-xl ${
          isOpen
            ? 'bg-forest-dark text-cream border-white/30 ring-2 ring-forest'
            : activeCount > 0
            ? 'bg-amber-600 text-cream border-amber-400 shadow-amber-900/20 ring-2 ring-amber-300 animate-pulse'
            : 'bg-white/95 text-forest border-forest/20 hover:bg-white shadow-forest/10'
        }`}
      >
        <div className="h-6 w-6 rounded-full bg-forest/10 text-forest flex items-center justify-center shrink-0">
          <Sliders className="h-3.5 w-3.5" />
        </div>

        <span className="font-thai tracking-wide hidden xs:inline">
          {lang === 'th' ? 'ตั้งค่าด่วน' : 'Quick Settings'}
        </span>

        {/* Status badges when active */}
        {activeCount > 0 && !isOpen && (
          <span className="h-5 min-w-5 px-1 rounded-full bg-white text-amber-900 font-mono text-[10px] font-black flex items-center justify-center shadow-xs">
            {activeCount}
          </span>
        )}

        <ChevronUp
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>
    </div>
  );
}
