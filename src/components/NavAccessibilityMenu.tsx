import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sliders,
  Eye,
  Type,
  SunMoon,
  Check,
  RotateCcw,
  Sparkles,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';

interface NavAccessibilityMenuProps {
  className?: string;
}

export default function NavAccessibilityMenu({ className = '' }: NavAccessibilityMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const activeCount = (isElderMode ? 1 : 0) + (isHighContrast ? 1 : 0);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggleElder = () => {
    triggerHaptic('medium');
    const nextState = !isElderMode;
    toggleElderMode();

    if (nextState) {
      document.documentElement.classList.add('elder-mode');
      showToast(
        lang === 'th' ? 'เปิดโหมดอ่านง่าย (ตัวอักษรใหญ่)' : 'Elder Mode Enabled',
        lang === 'th'
          ? 'ขยายขนาดตัวหนังสือ 115% และปุ่มสัมผัสขนาดใหญ่'
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
    const nextState = !isHighContrast;
    toggleHighContrast();

    if (nextState) {
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
    triggerHaptic('medium');
    setMode('normal');
    setHighContrast(false);
    document.documentElement.classList.remove('elder-mode');
    document.documentElement.classList.remove('high-contrast-mode');
    showToast(
      lang === 'th' ? 'คืนค่าการแสดงผลเริ่มต้น' : 'Reset Accessibility Defaults',
      lang === 'th' ? 'ขนาดตัวอักษรและสีกลับเป็นค่ามาตรฐานแล้ว' : 'Fonts and contrast reset to standard',
      'info'
    );
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button in Nav Bar - iOS 27 Liquid Glass Styled */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic('tap');
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={lang === 'th' ? 'เมนูการเข้าถึง (ตัวอักษรใหญ่และคอนทราสต์)' : 'Accessibility settings menu'}
        title={lang === 'th' ? 'เมนูการเข้าถึง (Elder Mode & High Contrast)' : 'Accessibility Menu (Elder & High Contrast)'}
        className={`relative h-8.5 sm:h-9 px-2 sm:px-2.5 rounded-full flex items-center gap-1.5 transition active:scale-95 border shadow-2xs ${
          isOpen
            ? 'bg-forest text-cream border-forest shadow-md ring-2 ring-forest/30'
            : activeCount > 0
            ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400/50 shadow-xs font-bold'
            : 'liquid-pill text-forest hover:bg-forest/10 border-forest/20'
        }`}
      >
        <Sliders className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? 'rotate-90 text-honey' : ''}`} />
        
        <span className="hidden md:inline font-bold text-xs tracking-tight">
          {activeCount > 0
            ? isElderMode && isHighContrast
              ? 'A+ · 👁️'
              : isElderMode
              ? 'A+'
              : '👁️'
            : lang === 'th'
            ? 'การเข้าถึง'
            : 'A11y'}
        </span>

        {/* Luminous Active Badge Indicator */}
        {activeCount > 0 && !isOpen && (
          <span className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-cream animate-pulse" />
        )}

        <ChevronDown className={`h-3 w-3 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Liquid Glass Dropdown Menu (iOS 27 Specular Refraction) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', damping: 24, stiffness: 380 }}
            className="absolute right-0 top-11 sm:top-11.5 w-76 sm:w-84 rounded-3xl liquid-glass border border-white/80 shadow-2xl backdrop-blur-2xl p-3.5 sm:p-4 z-50 text-ink space-y-3"
            role="menu"
            aria-orientation="vertical"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 border-b border-forest/10">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-forest text-cream flex items-center justify-center shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 text-honey" />
                </div>
                <div>
                  <h4 className="font-display italic font-bold text-sm text-forest leading-none">
                    {lang === 'th' ? 'เมนูการเข้าถึงและการมองเห็น' : 'Accessibility & Legibility'}
                  </h4>
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    {lang === 'th' ? 'ปรับขนาดและสีสำหรับทุกคน (iOS 27)' : 'Instant font & contrast controls'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-6.5 w-6.5 rounded-full bg-forest/10 hover:bg-forest/20 text-forest flex items-center justify-center transition active:scale-90"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Menu Items (Elder Mode & High Contrast Mode) */}
            <div className="space-y-2">
              {/* 1. Elder Mode Toggle */}
              <div
                onClick={handleToggleElder}
                className={`p-3 rounded-2xl border transition active:scale-[0.98] cursor-pointer flex items-center justify-between gap-3 shadow-xs ${
                  isElderMode
                    ? 'bg-gradient-to-r from-amber-50 to-amber-100/90 border-amber-400 ring-2 ring-amber-400/40'
                    : 'bg-white/70 hover:bg-white border-forest/15'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                      isElderMode
                        ? 'bg-amber-600 text-cream shadow-xs'
                        : 'bg-forest/10 text-forest'
                    }`}
                  >
                    <Type className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs sm:text-sm text-forest">
                        {lang === 'th' ? 'โหมดอ่านง่าย (Elder Mode)' : 'Elder Mode'}
                      </span>
                      {isElderMode && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-cream text-[9px] font-mono font-bold">
                          ON
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-ink-muted mt-0.5 leading-tight">
                      {lang === 'th'
                        ? 'ขยายตัวหนังสือ 115% และปุ่มสัมผัส 46px+'
                        : '+15% larger font & senior touch targets'}
                    </p>
                  </div>
                </div>

                {/* iOS 27 Styled Toggle Switch */}
                <div
                  className={`w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0 p-0.5 ${
                    isElderMode ? 'bg-amber-600' : 'bg-forest/20'
                  }`}
                >
                  <motion.div
                    animate={{ x: isElderMode ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center"
                  >
                    {isElderMode && <Check className="h-3 w-3 text-amber-700" />}
                  </motion.div>
                </div>
              </div>

              {/* 2. High Contrast Mode Toggle */}
              <div
                onClick={handleToggleHighContrast}
                className={`p-3 rounded-2xl border transition active:scale-[0.98] cursor-pointer flex items-center justify-between gap-3 shadow-xs ${
                  isHighContrast
                    ? 'bg-black text-white border-white/40 ring-2 ring-white/60 shadow-lg'
                    : 'bg-white/70 hover:bg-white border-forest/15'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                      isHighContrast
                        ? 'bg-white text-black shadow-xs'
                        : 'bg-forest/10 text-forest'
                    }`}
                  >
                    <Eye className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-xs sm:text-sm ${isHighContrast ? 'text-white' : 'text-forest'}`}>
                        {lang === 'th' ? 'โหมดคอนทราสต์สูง' : 'High Contrast Mode'}
                      </span>
                      {isHighContrast && (
                        <span className="px-1.5 py-0.2 rounded-full bg-yellow-400 text-black text-[9px] font-mono font-black">
                          AAA
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] mt-0.5 leading-tight ${isHighContrast ? 'text-white/80' : 'text-ink-muted'}`}>
                      {lang === 'th'
                        ? 'สีขาวดำคมชัดระดับ WCAG AAA ขอบชัด'
                        : 'Ultra-contrast monochrome & sharp edges'}
                    </p>
                  </div>
                </div>

                {/* iOS 27 Styled Toggle Switch */}
                <div
                  className={`w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0 p-0.5 ${
                    isHighContrast ? 'bg-yellow-400' : 'bg-forest/20'
                  }`}
                >
                  <motion.div
                    animate={{ x: isHighContrast ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`w-5 h-5 rounded-full shadow-md flex items-center justify-center ${
                      isHighContrast ? 'bg-black' : 'bg-white'
                    }`}
                  >
                    {isHighContrast && <Check className="h-3 w-3 text-yellow-400" />}
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Footer with Reset Defaults */}
            <div className="pt-2 border-t border-forest/10 flex items-center justify-between">
              <span className="text-[10px] text-ink-muted">
                {activeCount > 0
                  ? lang === 'th'
                    ? `เปิดใช้งาน ${activeCount} โหมด`
                    : `${activeCount} mode(s) active`
                  : lang === 'th'
                  ? 'ค่ามาตรฐาน'
                  : 'Default theme'}
              </span>

              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1 rounded-lg bg-forest/10 hover:bg-forest/20 text-forest text-[11px] font-semibold flex items-center gap-1 transition active:scale-95"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{lang === 'th' ? 'คืนค่าเริ่มต้น' : 'Reset'}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
