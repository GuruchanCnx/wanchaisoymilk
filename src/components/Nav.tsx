import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, MapPin, Phone, Settings, ClipboardList, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLang } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import LanguageToggle from './LanguageToggle';

export default function Nav({ scrollTargets }: { scrollTargets?: { id: string; label_th: string; label_en: string }[] }) {
  const { lang, t } = useLang();
  const { count, bumpKey } = useCart();
  const loc = useLocation();
  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <header className="sticky top-0 z-30 liquid-glass border-b border-white/60 shadow-xs">
      <div className="mx-auto max-w-6xl px-4 py-2.5 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="h-10 w-10 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-md relative overflow-hidden group-hover:scale-105 transition">
            <div className="absolute inset-1 rounded-xl bg-cream milk-bag opacity-95"></div>
            <span className="relative font-display italic font-bold text-forest text-xl leading-none">w</span>
          </div>
          <div className="leading-tight">
            <div className="font-display italic font-bold text-forest text-xl leading-none tracking-tight">Wanchai</div>
            <div className="text-[10px] font-thai text-ink-muted tracking-wide -mt-0.5">วันใจ Soy · Walai</div>
          </div>
        </Link>

        {scrollTargets && (
          <nav className="hidden md:flex items-center gap-1.5 flex-1 justify-center">
            {scrollTargets.map((s) => (
              <button
                key={s.id}
                onClick={() => jump(s.id)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-forest hover:bg-forest/10 liquid-pill transition"
              >
                {lang === 'th' ? s.label_th : s.label_en}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Link
            to="/history"
            className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition ${
              loc.pathname === '/history'
                ? 'bg-forest text-cream border-forest shadow-xs'
                : 'liquid-pill text-forest hover:bg-forest/10'
            }`}
            title={lang === 'th' ? 'ประวัติการสั่งซื้อ' : 'Order History'}
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{lang === 'th' ? 'ประวัติสั่งซื้อ' : 'Order History'}</span>
          </Link>
          <LanguageToggle compact />
          <Link
            to="/checkout"
            className="relative h-10 w-10 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-md hover:bg-forest-dark active:scale-95 transition"
            aria-label={t.cart}
          >
            <motion.div
              key={bumpKey}
              initial={bumpKey > 0 ? { scale: 1, rotate: 0 } : false}
              animate={
                bumpKey > 0
                  ? {
                      scale: [1, 1.35, 0.88, 1.18, 0.96, 1],
                      rotate: [0, -12, 12, -7, 7, 0],
                    }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="flex items-center justify-center"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
            </motion.div>
            {count > 0 && (
              <motion.span
                key={`badge-${count}`}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-terracotta text-cream text-[11px] font-bold flex items-center justify-center shadow-md"
              >
                {count}
              </motion.span>
            )}
          </Link>
        </div>
      </div>

      {scrollTargets && (
        <div className="md:hidden border-t border-forest/10 no-scrollbar overflow-x-auto">
          <div className="flex items-center gap-1.5 px-3 py-2 whitespace-nowrap">
            {scrollTargets.map((s) => (
              <button
                key={s.id}
                onClick={() => jump(s.id)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-forest liquid-pill"
              >
                {lang === 'th' ? s.label_th : s.label_en}
              </button>
            ))}
            <Link
              to="/history"
              className="px-3 py-1.5 rounded-full text-xs text-forest liquid-pill font-semibold flex items-center gap-1"
            >
              <History className="h-3 w-3" /> {lang === 'th' ? 'ประวัติสั่งซื้อ' : 'History'}
            </Link>
            <a
              href="https://maps.google.com/?q=15%2F4+Soi+2+Walai+Rd+Chiang+Mai"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-full text-xs text-terracotta liquid-pill font-semibold flex items-center gap-1"
            >
              <MapPin className="h-3 w-3" /> {t.directions}
            </a>
            {loc.pathname !== '/admin' && (
              <Link
                to="/admin"
                className="px-3 py-1.5 rounded-full text-xs text-ink-muted liquid-pill font-semibold flex items-center gap-1"
              >
                <Settings className="h-3 w-3" /> {t.admin}
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
    <div className="hidden md:flex fixed bottom-6 left-6 z-30 flex-col gap-2.5">
      <a
        href="https://maps.google.com/?q=15%2F4+Soi+2+Walai+Rd+Chiang+Mai"
        target="_blank"
        rel="noreferrer"
        className="h-11 px-4.5 rounded-full bg-terracotta text-cream shadow-lg flex items-center gap-2 font-semibold text-xs hover:bg-terracotta-dark active:scale-95 transition"
      >
        <MapPin className="h-4 w-4" /> {t.directions}
      </a>
      <Link
        to="/pos"
        className="h-11 px-4.5 rounded-full bg-forest text-cream shadow-lg flex items-center gap-2 font-semibold text-xs hover:bg-forest-dark active:scale-95 transition"
      >
        <ClipboardList className="h-4 w-4" /> {t.posMode}
      </Link>
    </div>
  );
}

export function CallShopBtn() {
  return (
    <a
      href="tel:+66530000000"
      className="h-9 px-3.5 rounded-full liquid-pill text-forest text-xs flex items-center gap-1.5 font-semibold hover:bg-forest/10 transition"
    >
      <Phone className="h-3.5 w-3.5" /> 053-000-000
    </a>
  );
}
