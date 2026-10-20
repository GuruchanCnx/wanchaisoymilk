import { useId } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../contexts/LanguageContext';
import { triggerHaptic } from '../lib/haptics';

interface LanguageToggleProps {
  compact?: boolean;
  className?: string;
  theme?: 'light' | 'dark';
  instanceId?: string;
}

export default function LanguageToggle({
  compact = false,
  className = '',
  theme = 'light',
  instanceId,
}: LanguageToggleProps) {
  const { lang, setLang } = useLang();
  const reactId = useId();
  const uniqueLayoutId = `lang-pill-${instanceId || reactId}`;

  const handleSelect = (nextLang: 'th' | 'en') => {
    if (lang !== nextLang) {
      triggerHaptic('selection');
      setLang(nextLang);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      role="group"
      aria-label={lang === 'th' ? 'เลือกภาษา (Select language)' : 'Language Selection'}
      className={`relative inline-flex items-center rounded-full p-0.5 text-xs font-semibold shadow-xs select-none transition-colors ${
        isDark
          ? 'border border-cream/20 bg-forest-dark/90 text-cream'
          : 'border border-forest/25 bg-cream/95 backdrop-blur-md text-forest'
      } ${className}`}
    >
      {/* Thai Option */}
      <button
        type="button"
        onClick={() => handleSelect('th')}
        aria-pressed={lang === 'th'}
        aria-label="เปลี่ยนภาษาเป็นไทย (Switch to Thai)"
        className={`relative z-10 transition-colors duration-200 font-bold active:scale-95 flex items-center justify-center rounded-full ${
          compact ? 'px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px]' : 'px-3 py-1 text-xs'
        } ${
          lang === 'th'
            ? isDark
              ? 'text-forest font-extrabold'
              : 'text-cream font-extrabold'
            : isDark
            ? 'text-cream/70 hover:text-cream'
            : 'text-forest/80 hover:text-forest'
        }`}
      >
        <span>ไทย</span>
        {lang === 'th' && (
          <motion.div
            layoutId={uniqueLayoutId}
            className={`absolute inset-0 rounded-full -z-10 shadow-xs ${
              isDark ? 'bg-cream' : 'bg-forest'
            }`}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </button>

      {/* English Option */}
      <button
        type="button"
        onClick={() => handleSelect('en')}
        aria-pressed={lang === 'en'}
        aria-label="Switch to English (เปลี่ยนเป็นภาษาอังกฤษ)"
        className={`relative z-10 transition-colors duration-200 font-bold active:scale-95 flex items-center justify-center rounded-full ${
          compact ? 'px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px]' : 'px-3 py-1 text-xs'
        } ${
          lang === 'en'
            ? isDark
              ? 'text-forest font-extrabold'
              : 'text-cream font-extrabold'
            : isDark
            ? 'text-cream/70 hover:text-cream'
            : 'text-forest/80 hover:text-forest'
        }`}
      >
        <span>EN</span>
        {lang === 'en' && (
          <motion.div
            layoutId={uniqueLayoutId}
            className={`absolute inset-0 rounded-full -z-10 shadow-xs ${
              isDark ? 'bg-cream' : 'bg-forest'
            }`}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </button>
    </div>
  );
}
