import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  MapPin,
  Phone,
  ClipboardList,
  History,
  QrCode,
  Award,
  ShieldCheck,
  Sliders,
  X,
  Menu,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Volume2,
  Check,
  Database,
  ArrowRight,
  Coffee,
  Heart,
  Eye,
  Type,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useFoldable } from '../contexts/FoldableContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { triggerHaptic } from '../lib/haptics';
import { getLoyaltyProfile } from '../lib/loyalty';
import LanguageToggle from './LanguageToggle';
import MenuQrModal from './MenuQrModal';
import UserProfileModal from './UserProfileModal';
import AccessibilitySettingsMenu from './AccessibilitySettingsMenu';

export default function Nav({
  scrollTargets,
}: {
  scrollTargets?: { id: string; label_th: string; label_en: string }[];
}) {
  const { lang, setLang, t } = useLang();
  const { count, subtotal, bumpKey } = useCart();
  const { isDualScreen } = useFoldable();
  const {
    isElderMode,
    toggleElderMode,
    isHighContrast,
    toggleHighContrast,
  } = useAccessibility();
  const loc = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAccessibilityMenu, setShowAccessibilityMenu] = useState(false);
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

  // Close menu on location change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [loc.pathname]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMenuOpen(false);
    }
  };

  // Precise coordinates for 18°46'47.4"N 98°59'04.1"E (Wualai Rd, Chiang Mai)
  const directionsUrl =
    'https://www.google.com/maps/dir/?api=1&destination=18.779833,98.984472';

  const toggleMenu = () => {
    triggerHaptic('selection');
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <>
      <header className="sticky top-0 z-30 liquid-glass border-b border-white/60 shadow-xs">
        <div
          className={`mx-auto max-w-6xl px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 duo-nav-shell ${
            isDualScreen ? 'duo-nav-active' : ''
          }`}
        >
          {/* Left Side: Brand Logo */}
          <div className="duo-nav-left flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/"
              onClick={() => triggerHaptic('tap')}
              className="flex items-center gap-2 sm:gap-2.5 shrink-0 group"
            >
              <div className="h-10 w-10 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-md relative overflow-hidden group-hover:scale-105 transition">
                <div className="absolute inset-1 rounded-xl bg-cream milk-bag opacity-95"></div>
                <span className="relative font-display italic font-bold text-forest text-xl leading-none">
                  w
                </span>
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

          {/* Desktop Center Navigation Links */}
          {scrollTargets && (
            <nav
              className={`hidden lg:flex items-center gap-1.5 flex-1 ${
                isDualScreen ? 'justify-end pr-6' : 'justify-center'
              }`}
            >
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

          {/* Right Side Navigation Controls (Minimalist, Elder & Child Friendly) */}
          <div className="duo-nav-right flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            {/* Quick Large Font / Elder Mode Toggle (Visible on all devices for seniors & kids) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                toggleElderMode();
              }}
              title={
                isElderMode
                  ? lang === 'th'
                    ? 'โหมดตัวหนังสือใหญ่ (เปิดใช้งานอยู่) - แตะเพื่อปรับขนาดปกติ'
                    : 'Large Font Mode (Active) - Tap for normal'
                  : lang === 'th'
                  ? 'ขยายขนาดตัวหนังสือ (สำหรับผู้สูงอายุและเด็ก)'
                  : 'Enlarge Text (For Seniors & Kids)'
              }
              className={`h-10 px-2.5 sm:px-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-2xs ${
                isElderMode
                  ? 'bg-amber-600 text-cream shadow-sm ring-2 ring-amber-400'
                  : 'bg-white/80 border border-forest/20 text-forest hover:bg-forest/10'
              }`}
              aria-label={lang === 'th' ? 'โหมดตัวหนังสือใหญ่' : 'Large Font'}
            >
              <span className="font-display font-bold text-sm sm:text-base leading-none">A+</span>
              <span className="hidden sm:inline font-thai text-[11px]">
                {isElderMode ? (lang === 'th' ? 'ตัวใหญ่' : 'Large') : (lang === 'th' ? 'ขยายอักษร' : 'Font+')}
              </span>
            </button>

            {/* Language Switcher */}
            <LanguageToggle compact />

            {/* Desktop Only Extra Badges: QR & Points */}
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                onClick={() => {
                  triggerHaptic('tap');
                  setShowQrModal(true);
                }}
                title={lang === 'th' ? 'สแกน QR สั่งที่โต๊ะ/หน้าร้าน' : 'Table / Menu QR Code'}
                className="h-10 w-10 rounded-2xl bg-white/80 border border-forest/20 text-forest hover:bg-forest/10 flex items-center justify-center transition active:scale-95 shadow-2xs"
                aria-label="Open Menu QR"
              >
                <QrCode className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  triggerHaptic('tap');
                  setShowProfileModal(true);
                }}
                title={lang === 'th' ? 'แต้มสะสมวันใจคลับ' : 'Loyalty Points Tracker'}
                className="h-10 px-3 rounded-2xl bg-white/80 border border-forest/20 text-forest hover:bg-forest/10 flex items-center gap-1.5 text-xs font-bold transition active:scale-95 shadow-2xs"
              >
                <Award className="h-4 w-4 text-honey" />
                <span className="font-mono text-xs text-forest">{points}</span>
                <span className="text-[10px] text-ink-muted">{lang === 'th' ? 'แต้ม' : 'pts'}</span>
              </button>
            </div>

            {/* Cart Button with CSS Shake Animation & Clear Label for Elders & Kids */}
            <Link
              to="/checkout"
              onClick={() => triggerHaptic('medium')}
              className={`relative h-10 px-3 sm:px-3.5 rounded-2xl bg-forest text-cream flex items-center gap-1.5 shadow-md hover:bg-forest-dark active:scale-95 transition ${
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
                <ShoppingBag className="h-4 w-4" />
              </motion.div>

              <span className="font-bold text-xs">
                {count > 0 ? `฿${subtotal}` : (lang === 'th' ? 'ตะกร้า' : 'Cart')}
              </span>

              {count > 0 && (
                <motion.span
                  key={`badge-${count}`}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="h-5 min-w-5 px-1 rounded-full bg-terracotta text-cream text-[10px] font-bold flex items-center justify-center shadow-xs"
                >
                  {count}
                </motion.span>
              )}
            </Link>

            {/* Ergonomic Hamburger Navbar Toggle Button with Plain-Text Label for Elders & Children */}
            <button
              type="button"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? t.closeMenu : t.openMenu}
              aria-expanded={isMenuOpen}
              className={`relative h-10 px-3 rounded-2xl flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                isMenuOpen
                  ? 'bg-terracotta text-cream ring-2 ring-terracotta/40'
                  : 'bg-white/80 border border-forest/20 text-forest hover:bg-forest/10'
              }`}
            >
              <div className="w-4 h-4 relative flex items-center justify-center">
                <span
                  className={`absolute block h-0.5 w-4 rounded-full bg-current transition-all duration-300 ease-in-out ${
                    isMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-1.5'
                  }`}
                />
                <span
                  className={`absolute block h-0.5 w-4 rounded-full bg-current transition-all duration-300 ease-in-out ${
                    isMenuOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
                  }`}
                />
                <span
                  className={`absolute block h-0.5 w-4 rounded-full bg-current transition-all duration-300 ease-in-out ${
                    isMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-1.5'
                  }`}
                />
              </div>

              <span className="font-bold text-xs font-thai">
                {isMenuOpen
                  ? (lang === 'th' ? 'ปิด' : 'Close')
                  : (lang === 'th' ? 'เมนู' : 'Menu')}
              </span>

              {/* Status indicator dot if accessibility or points are active */}
              {(isElderMode || isHighContrast || points > 0) && !isMenuOpen && (
                <span className="h-2 w-2 rounded-full bg-honey ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Category Quick Rail (kept on Home page) */}
        {scrollTargets && (
          <div className="lg:hidden border-t border-forest/10 no-scrollbar overflow-x-auto bg-cream/40">
            <div className="flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap">
              {scrollTargets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    triggerHaptic('tap');
                    jump(s.id);
                  }}
                  className="px-3 py-1 rounded-full text-xs font-semibold text-forest liquid-pill"
                >
                  {lang === 'th' ? s.label_th : s.label_en}
                </button>
              ))}
              <button
                onClick={() => {
                  triggerHaptic('tap');
                  setShowQrModal(true);
                }}
                className="px-3 py-1 rounded-full text-xs text-forest liquid-pill font-semibold flex items-center gap-1"
              >
                <QrCode className="h-3 w-3" /> {lang === 'th' ? 'QR เมนู' : 'Menu QR'}
              </button>
              <Link
                to="/history"
                onClick={() => triggerHaptic('tap')}
                className="px-3 py-1 rounded-full text-xs text-forest liquid-pill font-semibold flex items-center gap-1"
              >
                <History className="h-3 w-3" /> {lang === 'th' ? 'ประวัติ' : 'History'}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ONE-HANDED HAMBURGER DRAWER (Bottom Sheet on Mobile, Slide Drawer on Desktop) */}
      <AnimatePresence>
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end"
            role="dialog"
            aria-modal="true"
            aria-label={t.menuNavigation}
          >
            {/* Backdrop Dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                triggerHaptic('tap');
                setIsMenuOpen(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Ergonomic One-Hand Drawer Container */}
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full sm:max-w-md sm:h-full bg-cream text-ink border-t sm:border-l sm:border-t-0 border-forest/20 shadow-2xl rounded-t-3xl sm:rounded-none flex flex-col max-h-[92vh] sm:max-h-screen overflow-hidden z-10"
            >
              {/* Tactile Pull / Drag Handle (Mobile Ergonomics) */}
              <div className="w-full pt-3 pb-1 flex justify-center sm:hidden shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-forest/25" />
              </div>

              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-forest/10 flex items-center justify-between shrink-0 bg-white/40">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-md">
                    <span className="font-display italic font-bold text-xl leading-none">w</span>
                  </div>
                  <div>
                    <h3 className="font-display italic font-bold text-lg text-forest leading-tight">
                      {lang === 'th' ? 'วันใจ Soy (ถนนวัวลาย)' : 'Wanchai Soy · Walai'}
                    </h3>
                    <p className="text-[11px] font-thai text-ink-muted">
                      {lang === 'th' ? 'เมนูนำทางด่วน · สั่งง่ายมือเดียว' : 'One-Hand Navigation Hub'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setIsMenuOpen(false);
                  }}
                  className="h-10 w-10 rounded-2xl bg-forest/10 hover:bg-forest/20 text-forest flex items-center justify-center transition active:scale-95"
                  aria-label={t.closeMenu}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body (Thumb Zone Optimized) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 1. Quick Cart & Checkout Card (Prominent Thumb Action) */}
                <div className="rounded-2xl bg-gradient-to-br from-forest to-forest-dark text-cream p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-honey flex items-center gap-1.5">
                      <ShoppingBag className="h-4 w-4" />
                      <span>{t.cart}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-mono font-bold">
                      {count} {lang === 'th' ? 'รายการ' : 'items'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-sm text-cream/80">{t.total}:</span>
                    <span className="text-2xl font-bold font-mono text-honey">
                      ฿{subtotal}
                    </span>
                  </div>

                  <Link
                    to="/checkout"
                    onClick={() => {
                      triggerHaptic('medium');
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-11 rounded-xl bg-terracotta hover:bg-terracotta-dark text-cream font-bold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                  >
                    <span>{t.checkout}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* 2. Menu Categories Quick Jump (if on Home page or available) */}
                {scrollTargets && scrollTargets.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-forest/70 px-1">
                      {lang === 'th' ? 'หมวดหมู่เมนูต้มสด' : 'Menu Categories'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {scrollTargets.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            triggerHaptic('tap');
                            jump(s.id);
                          }}
                          className="h-12 px-3 rounded-xl bg-white/70 hover:bg-forest/10 border border-forest/15 text-forest font-semibold text-xs flex items-center justify-between text-left transition active:scale-95 shadow-xs"
                        >
                          <span className="truncate">{lang === 'th' ? s.label_th : s.label_en}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-forest/40 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Primary Customer Navigation Grid (48px+ Easy Thumb Targets) */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-forest/70 px-1">
                    {lang === 'th' ? 'บริการและคำสั่งด่วน' : 'Quick Actions'}
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Order History */}
                    <Link
                      to="/history"
                      onClick={() => {
                        triggerHaptic('tap');
                        setIsMenuOpen(false);
                      }}
                      className="p-3 rounded-2xl bg-white/80 hover:bg-white border border-forest/15 shadow-xs flex flex-col justify-between h-20 active:scale-95 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded-xl bg-forest/10 text-forest flex items-center justify-center">
                          <History className="h-4 w-4" />
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-forest/30" />
                      </div>
                      <span className="text-xs font-bold text-forest">
                        {lang === 'th' ? 'ประวัติสั่งซื้อ' : 'Order History'}
                      </span>
                    </Link>

                    {/* Table QR Modal */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setIsMenuOpen(false);
                        setShowQrModal(true);
                      }}
                      className="p-3 rounded-2xl bg-white/80 hover:bg-white border border-forest/15 shadow-xs flex flex-col justify-between h-20 text-left active:scale-95 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center">
                          <QrCode className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] text-terracotta font-bold">QR</span>
                      </div>
                      <span className="text-xs font-bold text-forest">
                        {lang === 'th' ? 'QR สั่งที่โต๊ะ' : 'Table QR Code'}
                      </span>
                    </button>

                    {/* Loyalty Points */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setIsMenuOpen(false);
                        setShowProfileModal(true);
                      }}
                      className="p-3 rounded-2xl bg-white/80 hover:bg-white border border-forest/15 shadow-xs flex flex-col justify-between h-20 text-left active:scale-95 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded-xl bg-amber-100 text-honey flex items-center justify-center">
                          <Award className="h-4 w-4 text-amber-700" />
                        </div>
                        <span className="font-mono text-xs font-bold text-forest">
                          {points} pts
                        </span>
                      </div>
                      <span className="text-xs font-bold text-forest">
                        {lang === 'th' ? 'แต้มวันใจคลับ' : 'Loyalty Points'}
                      </span>
                    </button>

                    {/* Directions Google Maps */}
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        triggerHaptic('tap');
                        setIsMenuOpen(false);
                      }}
                      className="p-3 rounded-2xl bg-white/80 hover:bg-white border border-forest/15 shadow-xs flex flex-col justify-between h-20 active:scale-95 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <ExternalLink className="h-3 w-3 text-ink-muted" />
                      </div>
                      <span className="text-xs font-bold text-terracotta">
                        {lang === 'th' ? 'นำทางไปร้าน' : 'Get Directions'}
                      </span>
                    </a>
                  </div>
                </div>

                {/* 4. One-Hand Accessibility & Ergonomics Toggles */}
                <div className="rounded-2xl bg-white/90 p-3.5 border border-forest/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5" />
                      <span>{t.accessibility}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setIsMenuOpen(false);
                        setShowAccessibilityMenu(true);
                      }}
                      className="text-[11px] text-terracotta font-bold underline"
                    >
                      {lang === 'th' ? 'ปรับแต่งเพิ่มเติม' : 'All Settings'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Elder Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        toggleElderMode();
                      }}
                      className={`h-11 px-3 rounded-xl border flex items-center justify-between text-xs font-bold transition active:scale-95 ${
                        isElderMode
                          ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                          : 'bg-white text-forest border-forest/20 hover:bg-forest/5'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Type className="h-3.5 w-3.5" />
                        <span>{t.elderModeShort}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/10">
                        {isElderMode ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    {/* High Contrast Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        toggleHighContrast();
                      }}
                      className={`h-11 px-3 rounded-xl border flex items-center justify-between text-xs font-bold transition active:scale-95 ${
                        isHighContrast
                          ? 'bg-black text-white border-white ring-1 ring-black shadow-sm'
                          : 'bg-white text-forest border-forest/20 hover:bg-forest/5'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{t.highContrastShort}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/10">
                        {isHighContrast ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 5. Language Switcher & Quick Call */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Language Switch */}
                  <div className="p-2.5 rounded-2xl bg-white/80 border border-forest/15 flex items-center justify-between">
                    <span className="text-xs font-bold text-forest">
                      {lang === 'th' ? 'ภาษา' : 'Lang'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setLang('th');
                        }}
                        className={`h-7 px-2 rounded-lg text-xs font-bold transition ${
                          lang === 'th' ? 'bg-forest text-cream shadow-xs' : 'text-forest hover:bg-forest/10'
                        }`}
                      >
                        TH
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setLang('en');
                        }}
                        className={`h-7 px-2 rounded-lg text-xs font-bold transition ${
                          lang === 'en' ? 'bg-forest text-cream shadow-xs' : 'text-forest hover:bg-forest/10'
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </div>

                  {/* Direct Phone Call */}
                  <a
                    href="tel:053000000"
                    onClick={() => triggerHaptic('tap')}
                    className="p-2.5 rounded-2xl bg-white/80 border border-forest/15 flex items-center justify-center gap-1.5 text-xs font-bold text-forest hover:bg-forest/10 transition active:scale-95"
                  >
                    <Phone className="h-3.5 w-3.5 text-terracotta" />
                    <span>053-000-000</span>
                  </a>
                </div>

                {/* 6. Staff / Store Management Tools */}
                <div className="pt-2 border-t border-forest/10 flex items-center justify-between text-xs">
                  <Link
                    to="/pos"
                    onClick={() => {
                      triggerHaptic('tap');
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-1.5 text-forest/80 hover:text-forest font-semibold p-2 rounded-xl hover:bg-forest/10 transition"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span>{t.posMode}</span>
                  </Link>

                  <Link
                    to="/admin"
                    onClick={() => {
                      triggerHaptic('tap');
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-1.5 text-forest/80 hover:text-forest font-semibold p-2 rounded-xl hover:bg-forest/10 transition"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{t.admin}</span>
                  </Link>
                </div>
              </div>

              {/* Bottom Drawer Footer */}
              <div className="p-3 bg-forest-dark text-cream text-[11px] text-center font-thai shrink-0 flex items-center justify-center gap-2">
                <span>วันใจ Soy · ต้มสดใหม่รอบเช้า 06:00-11:30 & บ่าย 16:30-21:00</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Modals Mounted from Nav */}
      <AccessibilitySettingsMenu
        isOpen={showAccessibilityMenu}
        onClose={() => setShowAccessibilityMenu(false)}
      />
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
