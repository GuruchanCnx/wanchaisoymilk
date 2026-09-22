import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, MapPin, Phone, Settings, ClipboardList, History, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLang } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useFoldable } from '../contexts/FoldableContext';
import LanguageToggle from './LanguageToggle';

export default function Nav({ scrollTargets }: { scrollTargets?: { id: string; label_th: string; label_en: string }[] }) {
  const { lang, t } = useLang();
  const { count, bumpKey } = useCart();
  const { isFolded, isDualScreen, toggleSimulatedFold, isSimulated } = useFoldable();
  const loc = useLocation();

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Precise coordinates for 18°46'47.4"N 98°59'04.1"E
  const osmUrl = 'https://www.openstreetmap.org/?mlat=18.779833&mlon=98.984472#map=19/18.779833/98.984472';
  const directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=18.779833,98.984472';

  return (
    <header className="sticky top-0 z-30 liquid-glass border-b border-white/60 shadow-xs">
      <div className={`mx-auto max-w-6xl px-4 py-2.5 flex items-center gap-3 duo-nav-shell ${isDualScreen ? 'duo-nav-active' : ''}`}>
        {/* Left Side: Repositions on Left Segment of Dual-Screen */}
        <div className="duo-nav-left flex items-center gap-3 shrink-0">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="h-10 w-10 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-md relative overflow-hidden group-hover:scale-105 transition">
              <div className="absolute inset-1 rounded-xl bg-cream milk-bag opacity-95"></div>
              <span className="relative font-display italic font-bold text-forest text-xl leading-none">w</span>
            </div>
            <div className="leading-tight">
              <div className="font-display italic font-bold text-forest text-xl leading-none tracking-tight">Wanchai</div>
              <div className="text-[10px] font-thai text-ink-muted tracking-wide -mt-0.5">
                {lang === 'th' ? 'วันใจ Soy · ถนนวัวลาย' : 'Wanchai Soy · Walai'}
              </div>
            </div>
          </Link>
        </div>

        {/* Center / Navigation Links (Repositions cleanly away from the hinge) */}
        {scrollTargets && (
          <nav className={`hidden md:flex items-center gap-1.5 flex-1 ${isDualScreen ? 'justify-end pr-6' : 'justify-center'}`}>
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

        {/* Right Side: Repositions onto Right Segment of Dual-Screen away from hinge */}
        <div className="duo-nav-right flex items-center gap-2 ml-auto shrink-0">
          {/* Dual-Screen Fold Simulation Toggle for testing Apple Duo */}
          <button
            onClick={toggleSimulatedFold}
            title={
              isDualScreen
                ? lang === 'th'
                  ? 'โหมดจอคู่กางออก (คลิกเพื่อพับจอ)'
                  : 'Dual-Screen Unfolded (Click to fold)'
                : lang === 'th'
                ? 'โหมดจอพับ (คลิกเพื่อจำลองกางจอคู่ Apple Duo)'
                : 'Folded Screen (Click to simulate Apple Duo unfolded)'
            }
            className={`h-9 px-2.5 rounded-full text-xs font-semibold flex items-center gap-1 transition ${
              isSimulated
                ? 'bg-amber-500 text-cream shadow-xs animate-pulse'
                : 'liquid-pill text-forest hover:bg-forest/10'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="text-[10px] hidden lg:inline">
              {isDualScreen
                ? lang === 'th'
                  ? 'จอคู่กางออก'
                  : 'Duo Spanning'
                : lang === 'th'
                ? 'จอพับ'
                : 'Folded'}
            </span>
          </button>

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
              href={directionsUrl}
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
  // Coordinates 18°46'47.4"N 98°59'04.1"E
  const directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=18.779833,98.984472';

  return (
    <div className="hidden md:flex fixed bottom-6 left-6 z-30 flex-col gap-2.5">
      <a
        href={directionsUrl}
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

export function CallShopBtn({ phone }: { phone?: string }) {
  const shopPhone = phone || '053-000-000';
  return (
    <a
      href={`tel:${shopPhone.replace(/[^0-9+]/g, '')}`}
      className="h-9 px-3.5 rounded-full liquid-pill text-forest text-xs flex items-center gap-1.5 font-semibold hover:bg-forest/10 transition"
    >
      <Phone className="h-3.5 w-3.5" /> {shopPhone}
    </a>
  );
}
