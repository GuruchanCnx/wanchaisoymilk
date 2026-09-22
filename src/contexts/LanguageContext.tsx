import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { dict, type Lang } from '../lib/i18n';

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: typeof dict.th };
const LanguageContext = createContext<Ctx>({ lang: 'th', setLang: () => {}, t: dict.th });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'th');
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: Lang) => { localStorage.setItem('lang', l); setLangState(l); };
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dict[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
