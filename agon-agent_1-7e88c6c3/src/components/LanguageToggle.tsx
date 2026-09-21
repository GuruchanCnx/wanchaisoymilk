import { useLang } from '../contexts/LanguageContext';

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`inline-flex items-center rounded-full border-2 border-forest bg-cream-soft p-0.5 text-sm font-semibold ${compact ? '' : 'shadow-sm'}`}>
      <button
        onClick={() => setLang('th')}
        aria-pressed={lang === 'th'}
        className={`px-3 py-1 rounded-full transition ${lang === 'th' ? 'bg-forest text-cream' : 'text-forest'}`}
      >ไทย</button>
      <button
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`px-3 py-1 rounded-full transition ${lang === 'en' ? 'bg-forest text-cream' : 'text-forest'}`}
      >EN</button>
    </div>
  );
}
