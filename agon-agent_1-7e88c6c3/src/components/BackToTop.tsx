import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';

export default function BackToTop() {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t.backToTop}
      className="fixed bottom-24 right-4 z-40 h-12 w-12 rounded-full bg-forest text-cream shadow-xl shadow-forest/30 flex items-center justify-center hover:bg-forest-dark active:scale-95 transition"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
