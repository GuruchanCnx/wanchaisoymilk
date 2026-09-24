import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  MapPin,
  Phone,
  Settings,
  ClipboardList,
  History,
  Smartphone,
  QrCode,
  Award,
  Type,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLang } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useFoldable } from '../contexts/FoldableContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { triggerHaptic } from '../lib/haptics';
import { getLoyaltyProfile } from '../lib/loyalty';
import LanguageToggle from './LanguageToggle';
import MenuQrModal from './MenuQrModal';
import UserProfileModal from './UserProfileModal';

export default function Nav({ scrollTargets }: { scrollTargets?: { id: string; label_th: string; label_en: string }[] }) {
  const { lang, t } = useLang();
  const { count, bumpKey } = useCart();
  const { isFolded, isDualScreen, toggleSimulatedFold, isSimulated } = useFoldable();
  const { isElderMode, toggleElderMode } = useAccessibility();
  const loc = useLocation();

  const [showQrModal, setShowQrModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isCartShaking, setIsCartShaking] = useState(false);
  const [points, setPoints] = useState(() => getLoyaltyProfile().availablePoints);

  // Trigger CSS shake animation on cart button whenever bumpKey updates
  useEffect(() => {
    if (bumpKey > 0) {
      setIsCartShaking(true);
      triggerHaptic('medium');
      const timer = setTimeout(() => setIsCartShaking(false), 650);
      return () => clearTimeout(timer);
    }
  }, [bumpKey]);

  // Refresh loyalty points periodically or on navigation
  useEffect(() => {
    setPoints(getLoyaltyProfile().availablePoints);
  }, [loc.pathname]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Precise coordinates for 18°46'47.4"N 98°59'04.1"E
  const directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=18.779833,98.984472';

  return (
    <>
      <header className="sticky top-0 z-30 liquid-glass border-b border-white/60 shadow-xs">
        <div className={`mx-auto max-w-6xl px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 duo-nav-shell ${isDualScreen ? 'duo-nav-active' : ''}`}>
          {/* Left Side: Brand Logo */}
          <div className="duo-nav-left flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/"
              onClick={() => triggerHaptic('tap')}
              className="flex items-center gap-2 sm:gap-2.5 shrink-0 group"
            >
              <div className="h-10 w-10 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-md relative overflow-hidden group-hover:scale-105 transition">
                <div className="absolute inset-1 rounded-xl bg-cream milk-bag opacity-95"></div>
                <span className="relative font-display italic font-bold text-forest text-xl leading-none">w</span>
              </div>
              <div className="leading-tight">
                <div className="font-display italic font-bold text-forest text-lg sm:text-xl leading-none tracking-tight">
                  Wanchai
                </div>
                <div className="text-[10px] font-thai text-ink-muted tracking-wide -mt-0.5">
                  {lang === 'th' ? 'วันใจ Soy · ถนนวัวลาย' : 'Wanchai Soy · Walai'}
                </div>
              </div>
            </Link>
          </div>

          {/* Center / Navigation Links */}
          {scrollTargets && (
            <nav className={`hidden lg:flex items-center gap-1.5 flex-1 ${isDualScreen ? 'justify-end pr-6' : 'justify-center'}`}>
              {scrollTargets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    triggerHaptic('tap');
                    jump(s.id);
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-forest hover:bg-forest/10 liquid-pill transition"
                >
                  {lang === 'th' ? s.label_th : s.label_en}
                </button>
              ))}
            </nav>
          )}

          {/* Right Side Controls */}
          <div className="duo-nav-right flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            {/* Elder / Large Text Accessibility Toggle */}
            <button
              onClick={() => {
                triggerHaptic('tap');
                toggleElderMode();
              }}
              title={
                isElderMode
                  ? lang === 'th'
                    ? 'โหมดอ่านง่ายเปิดอยู่ (คลิกเพื่อกลับขนาดปกติ)'
                    : 'Large Text Active (Click for standard)'
                  : lang === 'th'
                  ? 'โหมดอ่านง่าย ตัวหนังสือใหญ่สำหรับผู้ใหญ่'
                  : 'Elder-friendly Large Text Mode'
              }
              className={`h-9 px-2.5 sm:px-3 rounded-full text-xs font-bold flex items-center gap-1 transition ${
                isElderMode
                  ? 'bg-amber-600 text-cream shadow-sm scale-105'
                  : 'liquid-pill text-forest hover:bg-forest/10'
              }`}
              aria-label="Toggle text size mode"
            >
              <Type className="h-3.5 w-3.5" />
              <span className="text-[11px] font-mono">{isElderMode ? 'A+' : 'A'}</span>
            </button>

            {/* Menu QR Code Button */}
            <button
              onClick={() => {
                triggerHaptic('tap');
                setShowQrModal(true);
              }}
              title={lang === 'th' ? 'สแกน QR สั่งที่โต๊ะ/หน้าร้าน' : 'Table / Menu QR Code'}
              className="h-9 w-9 rounded-full liquid-pill text-forest hover:bg-forest/10 flex items-center justify-center transition active:scale-95"
              aria-label="Open Menu QR"
            >
              <QrCode className="h-4 w-4" />
            </button>

            {/* Loyalty Points Tracker */}
            <button
              onClick={() => {
                triggerHaptic('tap');
                setShowProfileModal(true);
              }}
              title={lang === 'th' ? 'แต้มสะสมวันใจคลับ' : 'Loyalty Points Tracker'}
              className="h-9 px-2.5 sm:px-3 rounded-full liquid-pill text-forest hover:bg-forest/10 flex items-center gap-1.5 text-xs font-bold transition active:scale-95 border border-forest/15"
            >
              <Award className="h-3.5 w-3.5 text-honey" />
              <span className="font-mono text-[11px] text-forest">{points}</span>
              <span className="text-[10px] hidden sm:inline text-ink-muted">
                {lang === 'th' ? 'แต้ม' : 'pts'}
              </span>
            </button>

            {/* Language Switcher */}
            <LanguageToggle compact />

            {/* Admin Fast Access */}
            <Link
              to="/admin"
              onClick={() => triggerHaptic('tap')}
              title={lang === 'th' ? 'ระบบจัดการหลังร้าน (Admin)' : 'Admin Dashboard'}
              className={`h-9 w-9 rounded-full flex items-center justify-center transition active:scale-95 ${
                loc.pathname.startsWith('/admin')
                  ? 'bg-forest text-cream shadow-xs'
                  : 'liquid-pill text-forest/70 hover:text-forest hover:bg-forest/10'
              }`}
              aria-label="Admin Access"
            >
              <ShieldCheck className="h-4 w-4" />
            </Link>

            {/* Cart Button with CSS Shake Animation & Tactile Spring */}
            <Link
              to="/checkout"
              onClick={() => triggerHaptic('medium')}
              className={`relative h-10 w-10 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-md hover:bg-forest-dark active:scale-95 transition ${
                isCartShaking ? 'animate-cart-shake ring-2 ring-terracotta' : ''
              }`}
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

        {/* Mobile Horizontal Category Rail */}
        {scrollTargets && (
          <div className="lg:hidden border-t border-forest/10 no-scrollbar overflow-x-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap">
              {scrollTargets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    triggerHaptic('tap');
                    jump(s.id);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-forest liquid-pill"
                >
                  {lang === 'th' ? s.label_th : s.label_en}
                </button>
              ))}
              <button
                onClick={() => {
                  triggerHaptic('tap');
                  setShowQrModal(true);
                }}
                className="px-3 py-1.5 rounded-full text-xs text-forest liquid-pill font-semibold flex items-center gap-1"
              >
                <QrCode className="h-3 w-3" /> {lang === 'th' ? 'QR เมนู' : 'Menu QR'}
              </button>
              <button
                onClick={() => {
                  triggerHaptic('tap');
                  setShowProfileModal(true);
                }}
                className="px-3 py-1.5 rounded-full text-xs text-forest liquid-pill font-semibold flex items-center gap-1"
              >
                <Award className="h-3 w-3 text-honey" /> {lang === 'th' ? 'แต้มสะสม' : 'Points'}
              </button>
              <Link
                to="/history"
                onClick={() => triggerHaptic('tap')}
                className="px-3 py-1.5 rounded-full text-xs text-forest liquid-pill font-semibold flex items-center gap-1"
              >
                <History className="h-3 w-3" /> {lang === 'th' ? 'ประวัติสั่งซื้อ' : 'History'}
              </Link>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => triggerHaptic('tap')}
                className="px-3 py-1.5 rounded-full text-xs text-terracotta liquid-pill font-semibold flex items-center gap-1"
              >
                <MapPin className="h-3 w-3" /> {t.directions}
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Global Modals Mounted from Nav */}
      <MenuQrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} />
      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
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
