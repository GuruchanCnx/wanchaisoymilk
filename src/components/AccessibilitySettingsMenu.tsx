import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Sliders,
  Type,
  SunMoon,
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';

interface AccessibilitySettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccessibilitySettingsMenu({
  isOpen,
  onClose,
}: AccessibilitySettingsMenuProps) {
  const {
    isElderMode,
    isHighContrast,
    toggleElderMode,
    toggleHighContrast,
    setMode,
    setHighContrast,
  } = useAccessibility();
  const { lang, t } = useLang();
  const { showToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggleElder = () => {
    triggerHaptic('medium');
    const willBeElder = !isElderMode;
    toggleElderMode();

    // Directly ensure <html> classList is updated in coordination with AccessibilityProvider
    if (willBeElder) {
      document.documentElement.classList.add('elder-mode');
      showToast(
        lang === 'th' ? 'เปิดโหมดอ่านง่าย (ตัวอักษรใหญ่)' : 'Elder Mode Enabled',
        lang === 'th'
          ? 'ขยายตัวหนังสือ 115% และปุ่มสัมผัสขนาดใหญ่'
          : 'Enlarged fonts 115% with larger touch targets',
        'info'
      );
    } else {
      document.documentElement.classList.remove('elder-mode');
      showToast(
        lang === 'th' ? 'กลับสู่ขนาดตัวอักษรปกติ' : 'Standard Font Size',
        lang === 'th' ? 'ปรับขนาดตัวอักษรเป็นมาตรฐาน' : 'Returned to default font scale',
        'info'
      );
    }
  };

  const handleToggleHighContrast = () => {
    triggerHaptic('medium');
    const willBeHighContrast = !isHighContrast;
    toggleHighContrast();

    // Directly ensure <html> classList is updated in coordination with AccessibilityProvider
    if (willBeHighContrast) {
      document.documentElement.classList.add('high-contrast-mode');
      showToast(
        lang === 'th' ? 'เปิดโหมดคอนทราสต์สูง (High Contrast)' : 'High Contrast Mode Enabled',
        lang === 'th'
          ? 'ปรับชุดสีคมชัดสูงสุด WCAG AAA สำหรับสายตาเลือนราง'
          : 'High contrast black/white borders & text active',
        'info'
      );
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
      showToast(
        lang === 'th' ? 'ปิดโหมดคอนทราสต์สูง' : 'High Contrast Disabled',
        lang === 'th' ? 'กลับสู่โทนสีร้านวันใจดั้งเดิม' : 'Returned to default warm palette',
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
      lang === 'th' ? 'คืนค่าการแสดงผลเริ่มต้น' : 'Reset to Defaults',
      lang === 'th' ? 'ปิดโหมดพิเศษทั้งหมดแล้ว' : 'All accessibility modes disabled',
      'info'
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
        aria-labelledby="accessibility-menu-title"
      >
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl liquid-glass border border-white/70 shadow-2xl p-5 sm:p-6 text-ink relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-forest/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-xs">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3
                    id="accessibility-menu-title"
                    className="font-display italic font-bold text-xl text-forest leading-none"
                  >
                    {t.accessibilityMenu}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-forest/10 text-forest text-[10px] font-mono font-bold uppercase">
                    WCAG 2.1
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  {lang === 'th'
                    ? 'ปรับแต่งการแสดงผลให้อ่านง่ายและสบายตายิ่งขึ้น'
                    : 'Personalize legibility & contrast preferences'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                onClose();
              }}
              className="h-8 w-8 rounded-full bg-forest/10 hover:bg-forest/20 text-forest flex items-center justify-center transition active:scale-95"
              aria-label={t.cancel}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Settings Options */}
          <div className="mt-4 space-y-3.5">
            {/* Setting 1: Elder Mode (Large Font & Expanded Touch Targets) */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isElderMode
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-xs'
                  : 'bg-white/60 border-forest/10 hover:border-forest/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                      isElderMode
                        ? 'bg-amber-600 text-cream shadow-xs'
                        : 'bg-forest/10 text-forest'
                    }`}
                  >
                    <Type className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-thai font-bold text-sm text-ink">
                        {t.elderMode}
                      </span>
                      {isElderMode && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-600 text-cream text-[10px] font-bold">
                          A+ (115%)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                      {t.elderModeDesc}
                    </p>
                  </div>
                </div>

                {/* Switch toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isElderMode}
                  onClick={handleToggleElder}
                  className={`relative shrink-0 inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${
                    isElderMode ? 'bg-amber-600' : 'bg-gray-300'
                  }`}
                  aria-label={t.elderMode}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform ${
                      isElderMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Live Preview Sample */}
              <div className="mt-3 pt-2.5 border-t border-current/10 flex items-center justify-between text-xs">
                <span className="text-[11px] text-ink-muted">
                  {lang === 'th' ? 'ตัวอย่างการแสดงผล:' : 'Sample preview:'}
                </span>
                <span
                  className={`font-semibold font-thai transition-all ${
                    isElderMode ? 'text-base font-bold text-amber-900' : 'text-xs text-ink'
                  }`}
                >
                  {lang === 'th' ? 'น้ำเต้าหู้สดถุงละ ฿15' : 'Fresh Soy Milk ฿15 / Bag'}
                </span>
              </div>
            </div>

            {/* Setting 2: High Contrast Mode (Monochrome / Color Impairment) */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isHighContrast
                  ? 'bg-black/5 border-black shadow-xs ring-1 ring-black'
                  : 'bg-white/60 border-forest/10 hover:border-forest/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                      isHighContrast
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-forest/10 text-forest'
                    }`}
                  >
                    <SunMoon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-thai font-bold text-sm text-ink">
                        {t.highContrastMode}
                      </span>
                      {isHighContrast && (
                        <span className="px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-bold">
                          AAA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                      {t.highContrastDesc}
                    </p>
                  </div>
                </div>

                {/* Switch toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isHighContrast}
                  onClick={handleToggleHighContrast}
                  className={`relative shrink-0 inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                    isHighContrast ? 'bg-black' : 'bg-gray-300'
                  }`}
                  aria-label={t.highContrastMode}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform ${
                      isHighContrast ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Contrast preview */}
              <div className="mt-3 pt-2.5 border-t border-current/10 flex items-center justify-between text-xs">
                <span className="text-[11px] text-ink-muted">
                  {lang === 'th' ? 'คอนทราสต์ที่วัดได้:' : 'Measured contrast:'}
                </span>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                    isHighContrast
                      ? 'bg-black text-white'
                      : 'bg-forest/10 text-forest'
                  }`}
                >
                  {isHighContrast ? '21:1 (Max AAA)' : '9.2:1 (Standard)'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-5 pt-3.5 border-t border-forest/10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink hover:bg-black/5 flex items-center gap-1.5 transition active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t.resetDefaults}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                onClose();
              }}
              className="h-9 px-5 rounded-full bg-forest text-cream font-bold text-xs hover:bg-forest-dark transition active:scale-95 shadow-sm"
            >
              {lang === 'th' ? 'เสร็จสิ้น' : 'Done'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
