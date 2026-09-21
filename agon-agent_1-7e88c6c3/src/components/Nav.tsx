import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, MapPin, Phone, Settings, ClipboardList } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import LanguageToggle from './LanguageToggle';

export default function Nav({ scrollTargets }: { scrollTargets?: { id: string; label_th: string; label_en: string }[] }) {
  const { lang, t } = useLang();
  const { count } = useCart();
  const loc = useLocation();
  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b-2 border-forest/10">
      <div className="mx-auto max-w-6xl px-4 py-2.5 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-10 w-10 rounded-xl bg-forest text-cream flex items-center justify-center shadow-sm relative overflow-hidden">
            <div className="absolute inset-1 rounded-lg bg-cream milk-bag"></div>
            <span className="relative font-display italic font-bold text-forest text-lg leading-none">w</span>
          </div>
          <div className="leading-tight">
            <div className="font-display italic font-bold text-forest text-xl leading-none">Wanchai</div>
            <div className="text-[10px] font-thai text-ink-muted tracking-wide -mt-0.5">วันใจ Soy · Walai</div>
          </div>
        </Link>

        {scrollTargets && (
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {scrollTargets.map((s) => (
              <button
                key={s.id}
                onClick={() => jump(s.id)}
                className="px-3 py-1.5 rounded-full text-sm text-forest hover:bg-forest/10 transition font-medium"
              >
                {lang === 'th' ? s.label_th : s.label_en}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <LanguageToggle compact />
          <Link
            to="/checkout"
            className="relative h-10 w-10 rounded-full bg-forest text-cream flex items-center justify-center shadow-sm hover:bg-forest-dark active:scale-95 transition"
            aria-label={t.cart}
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-terracotta text-cream text-[11px] font-bold flex items-center justify-center">{count}</span>
            )}
          </Link>
        </div>
      </div>

      {scrollTargets && (
        <div className="md:hidden border-t border-forest/10 no-scrollbar overflow-x-auto">
          <div className="flex items-center gap-1 px-3 py-2 whitespace-nowrap">
            {scrollTargets.map((s) => (
              <button
                key={s.id}
                onClick={() => jump(s.id)}
                className="px-3 py-1.5 rounded-full text-sm text-forest bg-cream-soft border border-forest/15 font-medium"
              >{lang === 'th' ? s.label_th : s.label_en}</button>
            ))}
            <a
              href="https://maps.google.com/?q=15%2F4+Soi+2+Walai+Rd+Chiang+Mai"
              target="_blank" rel="noreferrer"
              className="px-3 py-1.5 rounded-full text-sm text-terracotta bg-cream-soft border border-terracotta/30 font-medium flex items-center gap-1"
            ><MapPin className="h-3.5 w-3.5" /> {t.directions}</a>
            {loc.pathname !== '/admin' && (
              <Link to="/admin" className="px-3 py-1.5 rounded-full text-sm text-ink-muted bg-cream-soft border border-forest/10 font-medium flex items-center gap-1">
                <Settings className="h-3.5 w-3.5" /> {t.admin}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function DesktopSideActions() {
  const { t } = useLang();
  return (
    <div className="hidden md:flex fixed bottom-6 left-6 z-30 flex-col gap-2">
      <a
        href="https://maps.google.com/?q=15%2F4+Soi+2+Walai+Rd+Chiang+Mai"
        target="_blank" rel="noreferrer"
        className="h-11 px-4 rounded-full bg-terracotta text-cream shadow-lg flex items-center gap-2 font-semibold text-sm hover:bg-terracotta-dark transition"
      ><MapPin className="h-4 w-4" /> {t.directions}</a>
      <Link to="/pos" className="h-11 px-4 rounded-full bg-forest text-cream shadow-lg flex items-center gap-2 font-semibold text-sm hover:bg-forest-dark transition">
        <ClipboardList className="h-4 w-4" /> {t.posMode}
      </Link>
    </div>
  );
}

export function CallShopBtn() {
  return (
    <a href="tel:+66530000000" className="h-9 px-3 rounded-full bg-cream-soft border border-forest/15 text-forest text-sm flex items-center gap-1.5 font-medium">
      <Phone className="h-3.5 w-3.5" /> 053-000-000
    </a>
  );
}
