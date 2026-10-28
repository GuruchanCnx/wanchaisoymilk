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
  Home as HomeIcon,
  Search,
  Mic,
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
import AccessibilitySettings from './AccessibilitySettings';
import NavAccessibilityMenu from './NavAccessibilityMenu';
import CartDrawer from './CartDrawer';
import SmoothScrollMenu from './SmoothScrollMenu';

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
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
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
      {/* Floating Modern Capsule Navbar */}
      <header className="sticky top-2 sm:top-3 z-40 px-2 sm:px-4 max-w-6xl mx-auto w-full transition-all">
        <div
          className={`w-full rounded-full liquid-glass border border-white/80 shadow-md shadow-forest/5 backdrop-blur-xl px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2.5 box-border ${
            isDualScreen ? 'duo-nav-active' : ''
          }`}
        >
          {/* Left Side: Circular Brand Token & Title */}
          <Link
            to="/"
            onClick={() => triggerHaptic('tap')}
            className="flex items-center gap-1.5 sm:gap-2 pl-0.5 group shrink-0 min-w-0"
            aria-label="Wanchai Soy Home"
          >
            <div className="h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 rounded-full bg-forest text-cream flex items-center justify-center shadow-xs relative overflow-hidden group-hover:scale-105 transition shrink-0">
              <span className="font-display italic font-bold text-base sm:text-lg leading-none">
                w
              </span>
            </div>
            <div className="leading-tight truncate">
              <div className="font-display italic font-bold text-forest text-sm sm:text-base leading-none tracking-tight">
                Wanchai
              </div>
              <div className="text-[9px] font-thai text-ink-muted tracking-wide -mt-0.5 hidden xs:block">
                {lang === 'th' ? 'วันใจ Soy · วัวลาย' : 'Wanchai Soy'}
              </div>
            </div>
          </Link>

          {/* Center: Minimalist Text Navigation Links (Adaptive responsive collapsing to never overflow) */}
          {scrollTargets && (
            <nav
              className={`hidden md:flex items-center gap-2 lg:gap-3.5 flex-1 min-w-0 px-1 overflow-hidden ${
                isDualScreen ? 'justify-end pr-2' : 'justify-center'
              }`}
            >
              {scrollTargets.map((s, idx) => {
                // Show core 3-4 sections on md/lg, all on xl+ to completely prevent header overflow
                const isSecondary = idx > 2;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      triggerHaptic('tap');
                      jump(s.id);
                    }}
                    className={`text-xs font-semibold text-ink-muted hover:text-forest transition-colors py-1 px-2 rounded-full hover:bg-forest/5 whitespace-nowrap shrink-0 ${
                      isSecondary ? 'hidden xl:inline-block' : 'inline-block'
                    }`}
                  >
                    {lang === 'th' ? s.label_th : s.label_en}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Side: Capsule Action Pill + Utility Controls (Guaranteed no overflow) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Convenient 1-Click Backend Admin & Inventory Button */}
            <Link
              to="/admin"
              onClick={() => triggerHaptic('tap')}
              title={lang === 'th' ? 'ระบบจัดการหลังร้านและสต็อก (Admin)' : 'Backend Admin & Inventory'}
              className="h-8.5 sm:h-9 px-2 sm:px-3 rounded-full bg-forest/10 hover:bg-forest hover:text-cream text-forest font-bold text-xs flex items-center gap-1.5 transition active:scale-95 border border-forest/20 shrink-0 shadow-2xs group"
              aria-label="Backend Admin"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-forest group-hover:text-cream transition-colors" />
              <span className="hidden xs:inline">{lang === 'th' ? 'แอดมิน' : 'Admin'}</span>
            </Link>

            {/* Accessibility Menu: Elder Mode & High Contrast toggles */}
            <NavAccessibilityMenu />

            {/* Language Switcher - Compact (Bilingual switcher visible on mobile, tablet, and desktop) */}
            <div className="shrink-0 flex items-center">
              <LanguageToggle compact instanceId="nav-top-bar" />
            </div>

            {/* Extra Badges: QR & Points (Visible only on ultra-wide screens to prevent clipping) */}
            <div className="hidden 2xl:flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  triggerHaptic('tap');
                  setShowQrModal(true);
                }}
                title={lang === 'th' ? 'สแกน QR สั่งที่โต๊ะ/หน้าร้าน' : 'Table / Menu QR Code'}
                className="h-9 w-9 rounded-full bg-white/80 border border-forest/20 text-forest hover:bg-forest/10 flex items-center justify-center transition active:scale-95 shadow-2xs"
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
                className="h-9 px-2.5 rounded-full bg-white/80 border border-forest/20 text-forest hover:bg-forest/10 flex items-center gap-1 text-xs font-bold transition active:scale-95 shadow-2xs"
              >
                <Award className="h-3.5 w-3.5 text-honey" />
                <span className="font-mono text-xs text-forest">{points}</span>
              </button>
            </div>

            {/* Signature Right Action Capsule Pill (Cart Drawer & Checkout) - Always guaranteed full width */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setIsCartDrawerOpen(true);
              }}
              className={`relative h-8.5 sm:h-9 px-3 sm:px-3.5 rounded-full bg-forest text-cream flex items-center gap-1.5 shadow-sm hover:bg-forest-dark active:scale-95 transition shrink-0 whitespace-nowrap min-w-fit cursor-pointer ${
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
                <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </motion.div>

              <span className="font-bold text-xs whitespace-nowrap">
                {count > 0 ? `฿${subtotal}` : (lang === 'th' ? 'สั่งซื้อ' : 'Order')}
              </span>

              {count > 0 && (
                <motion.span
                  key={`badge-${count}`}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="h-4.5 min-w-4.5 px-1 rounded-full bg-terracotta text-cream text-[10px] font-bold flex items-center justify-center shadow-xs"
                >
                  {count}
                </motion.span>
              )}
            </button>

            {/* Ergonomic Hamburger Navbar Toggle Button */}
            <button
              type="button"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? t.closeMenu : t.openMenu}
              aria-expanded={isMenuOpen}
              className={`relative h-9 sm:h-10 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 transition active:scale-95 shadow-xs shrink-0 ${
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

              <span className="font-bold text-xs font-thai hidden sm:inline">
                {isMenuOpen
                  ? (lang === 'th' ? 'ปิด' : 'Close')
                  : (lang === 'th' ? 'เมนู' : 'Menu')}
              </span>

              {/* Status indicator dot */}
              {(isElderMode || isHighContrast || points > 0) && !isMenuOpen && (
                <span className="h-2 w-2 rounded-full bg-honey ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>

        {/* Easy Scroll Menu Bar: Frictionless navigation with chevrons & edge gradient masks */}
        {scrollTargets && scrollTargets.length > 0 && (
          <div className="mt-1.5 w-full">
            <div className="rounded-full liquid-glass border border-white/70 shadow-xs py-1 px-1.5 backdrop-blur-md">
              <SmoothScrollMenu arrowTheme="forest" showArrows={true}>
                <div className="flex items-center gap-1.5 py-0.5">
                  {scrollTargets.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        jump(s.id);
                      }}
                      className="h-8 px-3.5 rounded-full text-xs font-semibold text-forest bg-white/70 hover:bg-forest hover:text-cream border border-forest/15 whitespace-nowrap shrink-0 transition active:scale-95 shadow-2xs"
                    >
                      {lang === 'th' ? s.label_th : s.label_en}
                    </button>
                  ))}
                </div>
              </SmoothScrollMenu>
            </div>
          </div>
        )}
      </header>

      {/* Ergonomic One-Hand Mobile Bottom Dock (Thumb Zone Navigation) */}
      <nav
        aria-label="One-Hand Mobile Navigation"
        className="fixed bottom-3 inset-x-3 z-40 sm:hidden pointer-events-auto"
      >
        <div className="max-w-md mx-auto rounded-full liquid-glass border border-white/80 shadow-2xl backdrop-blur-2xl px-3 py-1.5 flex items-center justify-between gap-1 shadow-forest/25">
          {/* 1. Home */}
          <Link
            to="/"
            onClick={() => {
              triggerHaptic('tap');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex-1 flex flex-col items-center justify-center py-1 text-forest hover:text-forest-dark transition active:scale-95"
            aria-label={t.home}
          >
            <HomeIcon className="h-4.5 w-4.5" />
            <span className="text-[10px] font-bold font-thai mt-0.5">
              {lang === 'th' ? 'หน้าแรก' : 'Home'}
            </span>
          </Link>

          {/* 2. Search / Browse Menu */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              const searchEl = document.getElementById('menu-search') || document.getElementById('bestsellers');
              searchEl?.scrollIntoView({ behavior: 'smooth' });
              const input = searchEl?.querySelector('input');
              input?.focus();
            }}
            className="flex-1 flex flex-col items-center justify-center py-1 text-forest hover:text-forest-dark transition active:scale-95"
            aria-label="Search Menu"
          >
            <Search className="h-4.5 w-4.5" />
            <span className="text-[10px] font-bold font-thai mt-0.5">
              {lang === 'th' ? 'ค้นหา' : 'Search'}
            </span>
          </button>

          {/* 3. Center Voice Order Action (Thumb Hero Button) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              window.dispatchEvent(new CustomEvent('open_voice_order'));
            }}
            className="h-11 w-11 -mt-4 rounded-full bg-gradient-to-tr from-terracotta to-amber-600 text-cream flex items-center justify-center shadow-lg active:scale-95 transition ring-3 ring-cream"
            aria-label={t.voiceOrder}
          >
            <Mic className="h-5 w-5 text-honey animate-pulse" />
          </button>

          {/* 4. Cart & Checkout */}
          <Link
            to="/checkout"
            onClick={() => triggerHaptic('tap')}
            className="flex-1 flex flex-col items-center justify-center py-1 text-forest hover:text-forest-dark transition active:scale-95 relative"
            aria-label={t.cart}
          >
            <div className="relative">
              <ShoppingBag className="h-4.5 w-4.5" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-terracotta text-cream text-[9px] font-bold flex items-center justify-center shadow-2xs">
                  {count}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold font-thai mt-0.5">
              {count > 0 ? `฿${subtotal}` : (lang === 'th' ? 'ตะกร้า' : 'Cart')}
            </span>
          </Link>

          {/* 5. Menu Drawer Toggle */}
          <button
            type="button"
            onClick={toggleMenu}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition active:scale-95 ${
              isMenuOpen ? 'text-terracotta font-bold' : 'text-forest'
            }`}
            aria-label={t.menuNavigation}
          >
            <Menu className="h-4.5 w-4.5" />
            <span className="text-[10px] font-bold font-thai mt-0.5">
              {lang === 'th' ? 'เมนู' : 'Menu'}
            </span>
          </button>
        </div>
      </nav>

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

                {/* 1.5 Prominent Backend Admin & Inventory Direct Card */}
                <Link
                  to="/admin"
                  onClick={() => {
                    triggerHaptic('medium');
                    setIsMenuOpen(false);
                  }}
                  className="p-3.5 rounded-2xl bg-forest/10 hover:bg-forest/15 border border-forest/20 flex items-center justify-between transition active:scale-95 shadow-xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-forest text-cream flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                      <ShieldCheck className="h-4.5 w-4.5 text-honey" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-forest flex items-center gap-1.5">
                        <span>{lang === 'th' ? 'ระบบจัดการหลังร้าน (Admin)' : 'Backend Admin & Inventory'}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-forest text-cream font-mono font-bold">STAFF</span>
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        {lang === 'th' ? 'จัดการสต็อก, วางข้อมูลตาราง, POS, และวิเคราะห์' : 'Live inventory, batch paste update & POS'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-forest/50 group-hover:text-forest transition" />
                </Link>

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

                {/* 4. One-Hand Accessibility & Ergonomics Settings */}
                <AccessibilitySettings
                  variant="card"
                />

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
      <CartDrawer isOpen={isCartDrawerOpen} onClose={() => setIsCartDrawerOpen(false)} />
      <MenuQrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} />
      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  );
}

export function DesktopSideActions() {
  return null;
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
