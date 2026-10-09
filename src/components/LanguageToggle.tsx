import { useLang } from '../contexts/LanguageContext';
import { triggerHaptic } from '../lib/haptics';

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();

  const handleSelect = (nextLang: 'th' | 'en') => {
    if (lang !== nextLang) {
      triggerHaptic('tap');
      setLang(nextLang);
    }
  };

  return (
    <div
      role="group"
      aria-label={lang === 'th' ? 'เลือกภาษา (Language selection)' : 'Select language'}
      className={`inline-flex items-center rounded-full border border-forest/25 bg-cream-soft/90 backdrop-blur-md p-0.5 text-xs font-semibold ${
        compact ? 'shadow-2xs' : 'shadow-xs'
      }`}
    >
      <button
        type="button"
        onClick={() => handleSelect('th')}
        aria-pressed={lang === 'th'}
        aria-label="เปลี่ยนเป็นภาษาไทย (Switch to Thai)"
        className={`px-2.5 sm:px-3 py-1 rounded-full transition-all duration-200 font-bold active:scale-95 ${
          lang === 'th'
            ? 'bg-forest text-cream shadow-xs font-bold scale-100'
            : 'text-forest/80 hover:text-forest hover:bg-forest/10'
        }`}
      >
        ไทย
      </button>
      <button
        type="button"
        onClick={() => handleSelect('en')}
        aria-pressed={lang === 'en'}
        aria-label="Switch to English (เปลี่ยนเป็นภาษาอังกฤษ)"
        className={`px-2.5 sm:px-3 py-1 rounded-full transition-all duration-200 font-bold active:scale-95 ${
          lang === 'en'
            ? 'bg-forest text-cream shadow-xs font-bold scale-100'
            : 'text-forest/80 hover:text-forest hover:bg-forest/10'
        }`}
      >
        EN
      </button>
    </div>
  );
}

