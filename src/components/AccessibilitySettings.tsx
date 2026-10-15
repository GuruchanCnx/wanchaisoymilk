import React from 'react';
import { Type, SunMoon, RotateCcw, Check, Sparkles } from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';

interface AccessibilitySettingsProps {
  variant?: 'card' | 'inline' | 'compact';
  className?: string;
  onSettingChange?: () => void;
}

/**
 * AccessibilitySettings component
 * Uses AccessibilityContext to toggle 'elder-mode' and 'high-contrast-mode'
 * global classes on the <html> element, with elder & child-friendly UX.
 */
export default function AccessibilitySettings({
  variant = 'card',
  className = '',
  onSettingChange,
}: AccessibilitySettingsProps) {
  const {
    isElderMode,
    isHighContrast,
    toggleElderMode,
    toggleHighContrast,
    setMode,
    setHighContrast,
  } = useAccessibility();
  const { lang } = useLang();
  const { showToast } = useToast();

  const handleToggleElder = () => {
    triggerHaptic('medium');
    const willBeElder = !isElderMode;
    toggleElderMode();

    // Ensure <html> class is updated immediately
    if (willBeElder) {
      document.documentElement.classList.add('elder-mode');
      showToast(
        lang === 'th' ? 'เปิดโหมดอ่านง่าย (ตัวหนังสือใหญ่)' : 'Elder Mode Activated',
        lang === 'th' ? 'ปรับขนาดตัวอักษร 115% สำหรับผู้สูงอายุและเด็ก' : 'Enlarged typography by 115% with expanded touch targets',
        'info'
      );
    } else {
      document.documentElement.classList.remove('elder-mode');
      showToast(
        lang === 'th' ? 'คืนสู่ขนาดตัวอักษรปกติ' : 'Default Font Scale',
        lang === 'th' ? 'ปรับขนาดตัวอักษรเป็นค่ามาตรฐาน' : 'Returned to default font size',
        'info'
      );
    }
    onSettingChange?.();
  };

  const handleToggleHighContrast = () => {
    triggerHaptic('medium');
    const willBeHighContrast = !isHighContrast;
    toggleHighContrast();

    // Ensure <html> class is updated immediately
    if (willBeHighContrast) {
      document.documentElement.classList.add('high-contrast-mode');
      showToast(
        lang === 'th' ? 'เปิดโหมดคอนทราสต์สูง (High Contrast)' : 'High Contrast Activated',
        lang === 'th' ? 'ปรับสีและเส้นขอบคมชัดสูงสุด WCAG AAA' : 'High-contrast borders and deep text colors active',
        'info'
      );
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
      showToast(
        lang === 'th' ? 'ปิดโหมดคอนทราสต์สูง' : 'High Contrast Deactivated',
        lang === 'th' ? 'กลับสู่โทนสีร้านวันใจดั้งเดิม' : 'Restored warm store palette',
        'info'
      );
    }
    onSettingChange?.();
  };

  const handleResetDefaults = () => {
    triggerHaptic('tap');
    setMode('normal');
    setHighContrast(false);
    document.documentElement.classList.remove('elder-mode');
    document.documentElement.classList.remove('high-contrast-mode');
    showToast(
      lang === 'th' ? 'คืนค่าเริ่มต้นเรียบร้อย' : 'Settings Reset',
      lang === 'th' ? 'ปิดโหมดพิเศษทั้งหมดแล้ว' : 'Accessibility settings reset to default',
      'info'
    );
    onSettingChange?.();
  };

  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={handleToggleElder}
          className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
            isElderMode
              ? 'bg-amber-600 text-cream shadow-xs ring-1 ring-amber-400'
              : 'bg-white/80 border border-forest/20 text-forest hover:bg-forest/10'
          }`}
          aria-pressed={isElderMode}
        >
          <Type className="h-3.5 w-3.5" />
          <span>{lang === 'th' ? 'ตัวใหญ่ (A+)' : 'Large Font'}</span>
          {isElderMode && <Check className="h-3 w-3 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={handleToggleHighContrast}
          className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
            isHighContrast
              ? 'bg-black text-white shadow-xs ring-1 ring-white'
              : 'bg-white/80 border border-forest/20 text-forest hover:bg-forest/10'
          }`}
          aria-pressed={isHighContrast}
        >
          <SunMoon className="h-3.5 w-3.5" />
          <span>{lang === 'th' ? 'คอนทราสต์สูง' : 'High Contrast'}</span>
          {isHighContrast && <Check className="h-3 w-3 ml-0.5" />}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl liquid-glass border border-white/80 shadow-sm p-4 sm:p-5 text-ink ${className}`}
      role="region"
      aria-label={lang === 'th' ? 'ตั้งค่าการเข้าถึง' : 'Accessibility Settings'}
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-forest/10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-forest text-cream flex items-center justify-center shadow-xs">
            <Sparkles className="h-4 w-4 text-honey" />
          </div>
          <div>
            <h4 className="font-display italic font-bold text-base text-forest leading-tight">
              {lang === 'th' ? 'การเข้าถึงและขนาดตัวอักษร' : 'Accessibility Settings'}
            </h4>
            <p className="text-[11px] text-ink-muted">
              {lang === 'th'
                ? 'ปรับเพื่อความสะดวกสำหรับผู้สูงอายุและเด็ก (WCAG 2.1)'
                : 'Tailored for senior readers & low vision comfort (WCAG 2.1)'}
            </p>
          </div>
        </div>

        {(isElderMode || isHighContrast) && (
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] text-ink-muted hover:text-forest flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-forest/5 transition"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{lang === 'th' ? 'คืนค่าเริ่มต้น' : 'Reset'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3.5">
        {/* Toggle 1: Elder Mode */}
        <button
          type="button"
          onClick={handleToggleElder}
          className={`p-3.5 rounded-xl border text-left flex items-start justify-between gap-3 transition-all active:scale-[0.98] ${
            isElderMode
              ? 'bg-amber-500/15 border-amber-600/50 shadow-xs ring-1 ring-amber-500/30'
              : 'bg-white/70 border-forest/15 hover:border-forest/30 hover:bg-white'
          }`}
          role="switch"
          aria-checked={isElderMode}
        >
          <div className="flex items-start gap-2.5">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                isElderMode ? 'bg-amber-600 text-cream' : 'bg-forest/10 text-forest'
              }`}
            >
              <Type className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold font-thai text-xs text-ink flex items-center gap-1.5">
                <span>{lang === 'th' ? 'โหมดตัวหนังสือใหญ่ (A+)' : 'Elder Font Mode'}</span>
                {isElderMode && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-600 text-cream text-[9px] font-bold">
                    +15%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5 leading-normal">
                {lang === 'th'
                  ? 'ขยายตัวอักษรให้อ่านง่าย สบายตา ไม่ต้องเพ่ง'
                  : 'Larger text and buttons for senior eyes'}
              </p>
            </div>
          </div>

          <div
            className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition ${
              isElderMode
                ? 'bg-amber-600 border-amber-600 text-white'
                : 'border-forest/30 bg-transparent'
            }`}
          >
            {isElderMode && <Check className="h-3 w-3 stroke-[3]" />}
          </div>
        </button>

        {/* Toggle 2: High-Contrast Mode */}
        <button
          type="button"
          onClick={handleToggleHighContrast}
          className={`p-3.5 rounded-xl border text-left flex items-start justify-between gap-3 transition-all active:scale-[0.98] ${
            isHighContrast
              ? 'bg-black text-white border-black shadow-xs ring-1 ring-white/20'
              : 'bg-white/70 border-forest/15 hover:border-forest/30 hover:bg-white'
          }`}
          role="switch"
          aria-checked={isHighContrast}
        >
          <div className="flex items-start gap-2.5">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                isHighContrast ? 'bg-white text-black' : 'bg-forest/10 text-forest'
              }`}
            >
              <SunMoon className="h-4 w-4" />
            </div>
            <div>
              <div
                className={`font-bold font-thai text-xs flex items-center gap-1.5 ${
                  isHighContrast ? 'text-white' : 'text-ink'
                }`}
              >
                <span>{lang === 'th' ? 'โหมดคอนทราสต์สูง' : 'High Contrast'}</span>
                {isHighContrast && (
                  <span className="px-1.5 py-0.2 rounded bg-white text-black text-[9px] font-bold">
                    AAA
                  </span>
                )}
              </div>
              <p
                className={`text-[11px] mt-0.5 leading-normal ${
                  isHighContrast ? 'text-gray-300' : 'text-ink-muted'
                }`}
              >
                {lang === 'th'
                  ? 'เน้นขอบและสีตัวอักษรคมชัดพิเศษ สำหรับที่แจ้ง'
                  : 'Ultra high-contrast borders for outdoor glare'}
              </p>
            </div>
          </div>

          <div
            className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition ${
              isHighContrast
                ? 'bg-white border-white text-black'
                : 'border-forest/30 bg-transparent'
            }`}
          >
            {isHighContrast && <Check className="h-3 w-3 stroke-[3]" />}
          </div>
        </button>
      </div>
    </div>
  );
}
