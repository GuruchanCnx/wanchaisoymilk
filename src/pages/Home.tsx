import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Clock,
  Sparkles,
  Instagram,
  Phone,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Mic,
  Search,
  X,
  Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { useLang } from '../contexts/LanguageContext';
import Nav, { DesktopSideActions } from '../components/Nav';
import OnlineBadge from '../components/OnlineBadge';
import BackToTop from '../components/BackToTop';
import ProductCard from '../components/ProductCard';
import OrderModal from '../components/OrderModal';
import MenuQrModal from '../components/MenuQrModal';
import VoiceOrderModal from '../components/VoiceOrderModal';
import MyUsualStrip from '../components/MyUsualStrip';
import RecentOrdersStrip from '../components/RecentOrdersStrip';
import AccessibilitySettings from '../components/AccessibilitySettings';
import OrderHistory from '../components/OrderHistory';
import { cacheGet, cacheSet } from '../lib/cache';
import { triggerHaptic } from '../lib/haptics';

export default function Home() {
  const { t, lang } = useLang();
  const [products, setProducts] = useState<Product[]>(() => cacheGet<Product[]>('menu', 30_000) || []);
  const [loading, setLoading] = useState(products.length === 0);
  const [modal, setModal] = useState<Product | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>(() => cacheGet('settings', 60_000) || {});
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'bestsellers' | 'drinks' | 'snacks'>('all');

  // Exact coordinates: 18°46'47.4"N 98°59'04.1"E (Lat: 18.779833, Lng: 98.984472)
  const coordsText = '18°46\'47.4"N 98°59\'04.1"E';
  const osmUrl = 'https://www.openstreetmap.org/?mlat=18.779833&mlon=98.984472#map=19/18.779833/98.984472';
  const directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=18.779833,98.984472';
  const osmEmbedUrl = 'https://www.openstreetmap.org/export/embed.html?bbox=98.981472%2C18.776833%2C98.987472%2C18.782833&layer=mapnik&marker=18.779833%2C98.984472';

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
      ]);
      if (Array.isArray(pRes)) { setProducts(pRes); cacheSet('menu', pRes); }
      if (sRes && typeof sRes === 'object') { setSettings(sRes); cacheSet('settings', sRes); }
    } catch (e) {
      console.warn('fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const copyCoordinates = () => {
    navigator.clipboard.writeText(coordsText);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const drinks = products.filter((p) => p.category === 'drinks');
  const snacks = products.filter((p) => p.category === 'snacks');
  const bestsellers = products.filter((p) => ['soy-milk', 'cow-milk', 'ginger-tea'].includes(p.slug));

  const isFilteringActive = searchQuery.trim().length > 0 || selectedCategory !== 'all';

  const filteredProducts = products.filter((p) => {
    // Category check
    if (selectedCategory === 'drinks' && p.category !== 'drinks') return false;
    if (selectedCategory === 'snacks' && p.category !== 'snacks') return false;
    if (selectedCategory === 'bestsellers' && !['soy-milk', 'cow-milk', 'ginger-tea'].includes(p.slug)) return false;

    // Search query check
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchNameTh = p.name_th?.toLowerCase().includes(q);
    const matchNameEn = p.name_en?.toLowerCase().includes(q);
    const matchDescTh = p.description_th?.toLowerCase().includes(q);
    const matchDescEn = p.description_en?.toLowerCase().includes(q);
    const matchCategory = p.category?.toLowerCase().includes(q);
    const matchSlug = p.slug?.toLowerCase().includes(q);

    // Common synonyms / search terms in Thai & English
    const matchDrinkSynonyms =
      (q.includes('น้ำ') || q.includes('นม') || q.includes('เต้าหู้') || q.includes('ขิง') || q.includes('ดื่ม') || q.includes('soy') || q.includes('milk') || q.includes('tea')) &&
      p.category === 'drinks';
    const matchSnackSynonyms =
      (q.includes('ของว่าง') || q.includes('ขนม') || q.includes('ปาท่องโก๋') || q.includes('ซาลาเปา') || q.includes('snack') || q.includes('patongko') || q.includes('bun')) &&
      p.category === 'snacks';

    return (
      matchNameTh ||
      matchNameEn ||
      matchDescTh ||
      matchDescEn ||
      matchCategory ||
      matchSlug ||
      matchDrinkSynonyms ||
      matchSnackSynonyms
    );
  });

  const shopStatus = settings.shop_status || 'open';
  const shopAddress = lang === 'th'
    ? settings.address_th || '15/4 ซอย 2 ถนนวัวลาย ตำบลหายยา อำเภอเมือง เชียงใหม่ 50100'
    : settings.address_en || '15/4 Soi 2, Walai Rd, Haiya, Mueang Chiang Mai 50100';
  const shopHours = lang === 'th'
    ? settings.open_hours_th || 'ทุกวัน 06:00 – 11:00 น.'
    : settings.open_hours_en || 'Daily 06:00 – 11:00 AM';
  const shopPhone = settings.shop_phone || '053-000-000';
  const heroWallPicture = settings.hero_image_url || '/images/hero.jpg';

  // Pure localized ticker phrases with NO mixed language
  const tickerPhrases = lang === 'th'
    ? [
        'นมถั่วเหลือง ทำสดใหม่ทุกเช้า',
        'น้ำเต้าหู้สูตรดั้งเดิม บรรจุถุงเย็นสบาย',
        'ปาท่องโก๋ ซาลาเปาร้อน ชิ้นละ ฿3',
        'นมวัวสดแท้ ส่งตรงจากฟาร์ม',
        'น้ำขิงแก่ต้มสด หวานหอมไล่ลม',
        'นำภาชนะมาเอง ลดทันที 2 บาท',
      ]
    : [
        'Fresh soy milk made fresh every morning',
        'Traditional Chiang Mai clear-bag milk',
        'Crispy Patongko & steamed Salapao ฿3 each',
        'Fresh farm cow milk boiled warm',
        'Spicy aromatic boiled ginger tea',
        'Bring your own container: save 2 baht',
      ];

  return (
    <div className="min-h-screen pb-24">
      <OnlineBadge />
      <Nav scrollTargets={[
        { id: 'bestsellers', label_th: 'ขายดี', label_en: 'Bestsellers' },
        { id: 'drinks', label_th: 'เครื่องดื่ม', label_en: 'Drinks' },
        { id: 'snacks', label_th: 'ของว่าง', label_en: 'Snacks' },
        { id: 'about', label_th: 'เรื่องราว', label_en: 'About' },
        { id: 'visit', label_th: 'มาหาเรา', label_en: 'Visit' },
      ]} />

      {/* Hero Section with Editable Hero Wall Picture */}
      <section className="relative overflow-hidden border-b border-forest/15">
        <div className="absolute inset-0">
          <img
            src={heroWallPicture}
            alt="Wanchai Soy Hero Wall"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-cream/70 via-cream/40 to-cream" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pt-8 pb-10 sm:pt-14 sm:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full liquid-pill px-3.5 py-1.5 text-xs font-semibold text-forest shadow-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${shopStatus === 'open' ? 'bg-forest pulse-dot' : 'bg-chili'}`} />
              {shopStatus === 'open' ? t.open : shopStatus === 'closed' ? t.closed : t.onBreak}
              <span className="opacity-60 font-mono">· {settings.hours_today || '06:00 – 11:00'}</span>
            </div>
            <h1 className="mt-4 font-display italic font-bold text-forest text-5xl sm:text-7xl leading-[0.9] tracking-tight">
              {lang === 'th' ? 'น้ำเต้าหู้' : 'Fresh soy,'}
              <br />
              <span className="text-terracotta">{lang === 'th' ? 'ถุงเดียว' : 'in a bag.'}</span>
            </h1>
            <p className="mt-4 text-ink-muted max-w-xl text-base sm:text-lg">{t.tagline}</p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  triggerHaptic('tap');
                  document.getElementById('bestsellers')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="h-12 px-6 rounded-full bg-forest text-cream font-bold text-xs shadow-md hover:bg-forest-dark active:scale-95 transition flex items-center gap-2"
              >
                {t.tapToOrder} <ChevronDown className="h-4 w-4" />
              </button>
              {/* Voice-to-Text Order Button using browser SpeechRecognition */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setVoiceModalOpen(true);
                }}
                className="h-12 px-5 rounded-full bg-terracotta text-cream font-bold text-xs flex items-center gap-2 active:scale-95 shadow-md hover:bg-terracotta-dark transition group"
              >
                <Mic className="h-4 w-4 text-honey animate-pulse" />
                <span>{t.voiceOrder}</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setQrModalOpen(true);
                }}
                className="h-12 px-5 rounded-full liquid-pill text-forest font-bold text-xs flex items-center gap-2 active:scale-95 shadow-xs hover:bg-forest/10 transition"
              >
                <QrCode className="h-4 w-4 text-forest" />
                <span>{t.tableQr}</span>
              </button>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => triggerHaptic('tap')}
                className="h-12 px-5 rounded-full liquid-pill text-forest font-bold text-xs flex items-center gap-2 active:scale-95 shadow-xs"
              >
                <MapPin className="h-4 w-4 text-terracotta" /> {t.directions}
              </a>
              <Link
                to="/checkout"
                onClick={() => triggerHaptic('tap')}
                className="h-12 px-5 rounded-full liquid-pill text-forest font-bold text-xs flex items-center gap-2 active:scale-95 shadow-xs hover:bg-forest/10 transition"
              >
                {t.walkupOrder}
              </Link>
            </div>

            <div className="mt-6 inline-flex flex-wrap items-center gap-2 text-xs sm:text-sm liquid-pill rounded-full px-3.5 py-1.5 text-ink-muted">
              <MapPin className="h-3.5 w-3.5 text-terracotta shrink-0" />
              <span>{shopAddress}</span>
              <span className="text-forest font-semibold">· {t.pickupOnly}</span>
            </div>
          </motion.div>
        </div>

        {/* Pure localized Marquee Ticker */}
        <div className="relative border-t border-forest/15 bg-forest text-cream overflow-hidden">
          <div className="flex whitespace-nowrap marquee py-2.5 text-xs font-semibold tracking-wide">
            {Array(2).fill(0).map((_, k) => (
              <span key={k} className="flex items-center">
                {tickerPhrases.map((phrase, i) => (
                  <span key={i} className="px-6 flex items-center gap-3">
                    <Sparkles className="h-3.5 w-3.5 text-honey" /> {phrase}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8 apple-duo-container">
        <MyUsualStrip />
        <RecentOrdersStrip />

        {/* Search Input Bar (Elder & Child Friendly, Instant Filter by Name or Category) */}
        <section id="menu-search" className="mb-8">
          <div className="rounded-3xl liquid-glass border border-white/60 p-4 sm:p-5 shadow-sm">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-forest/70 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'th'
                    ? '🔍 ค้นหาเมนู เช่น น้ำเต้าหู้, ปาท่องโก๋, นมสด, น้ำขิง...'
                    : '🔍 Search menu: Soy milk, Patongko, Cow milk, Ginger...'
                }
                className="w-full h-13 pl-12 pr-28 rounded-2xl bg-white/90 border border-forest/20 text-forest text-base sm:text-lg font-medium placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent transition shadow-xs"
              />
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setSearchQuery('');
                    }}
                    className="h-9 w-9 rounded-xl bg-forest/10 hover:bg-forest/20 flex items-center justify-center text-forest transition"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    setVoiceModalOpen(true);
                  }}
                  title={lang === 'th' ? 'ค้นหาด้วยเสียง' : 'Voice Search'}
                  className="h-9 px-2.5 rounded-xl bg-terracotta text-cream flex items-center gap-1 text-xs font-bold hover:bg-terracotta-dark transition shadow-2xs"
                >
                  <Mic className="h-3.5 w-3.5 text-honey animate-pulse" />
                  <span className="hidden sm:inline">{lang === 'th' ? 'พูดสั่ง' : 'Voice'}</span>
                </button>
              </div>
            </div>

            {/* Quick Category Filter Pills */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Filter className="h-3 w-3 text-forest" />
                <span className="hidden sm:inline">{lang === 'th' ? 'หมวดหมู่:' : 'Filter:'}</span>
              </span>
              {[
                { id: 'all', labelTh: 'ทั้งหมด', labelEn: 'All' },
                { id: 'bestsellers', labelTh: '⭐ เมนูขายดี', labelEn: '⭐ Bestsellers' },
                { id: 'drinks', labelTh: '🥛 เครื่องดื่ม', labelEn: '🥛 Drinks' },
                { id: 'snacks', labelTh: '🥟 ของว่าง', labelEn: '🥟 Snacks' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setSelectedCategory(cat.id as any);
                  }}
                  className={`h-9 px-4 rounded-full text-xs font-bold transition active:scale-95 shrink-0 flex items-center gap-1 ${
                    selectedCategory === cat.id
                      ? 'bg-forest text-cream shadow-sm ring-1 ring-forest'
                      : 'bg-white/80 border border-forest/15 text-forest hover:bg-forest/10'
                  }`}
                >
                  {lang === 'th' ? cat.labelTh : cat.labelEn}
                </button>
              ))}

              {isFilteringActive && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="h-9 px-3 rounded-full text-xs font-medium text-terracotta hover:bg-terracotta/10 transition shrink-0 ml-auto flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  <span>{lang === 'th' ? 'ล้างตัวกรอง' : 'Reset'}</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {isFilteringActive ? (
          <section id="search-results" className="mb-12">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-terracotta">
                  {lang === 'th' ? 'ผลการค้นหาเมนู' : 'Search Results'}
                </div>
                <h2 className="font-display italic font-bold text-2xl text-forest mt-0.5">
                  {searchQuery ? `"${searchQuery}"` : selectedCategory.toUpperCase()}
                </h2>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-forest/10 text-forest border border-forest/20">
                {lang === 'th' ? `พบ ${filteredProducts.length} รายการ` : `Found ${filteredProducts.length} items`}
              </span>
            </div>

            {loading ? (
              <SkeletonGrid />
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 apple-duo-grid">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} onTap={() => setModal(p)} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl liquid-glass border border-white/60 p-8 text-center">
                <p className="text-forest font-semibold text-lg">
                  {lang === 'th' ? 'ไม่พบเมนูที่ตรงกับการค้นหา' : 'No menu items found'}
                </p>
                <p className="text-xs text-ink-muted mt-1">
                  {lang === 'th'
                    ? 'ลองค้นหาคำอื่นๆ เช่น "น้ำเต้าหู้", "ปาท่องโก๋", "นมวัว", หรือ "น้ำขิง"'
                    : 'Try searching for "Soy milk", "Patongko", "Cow milk", or "Ginger"'}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {['น้ำเต้าหู้', 'ปาท่องโก๋', 'นมวัวสด', 'น้ำขิง'].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setSearchQuery(sample);
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-forest/10 text-forest hover:bg-forest/20 transition"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-5 px-5 py-2 rounded-full bg-forest text-cream text-xs font-bold hover:bg-forest-dark transition"
                >
                  {lang === 'th' ? 'แสดงเมนูทั้งหมด' : 'Show All Menu'}
                </button>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Bestsellers */}
            <section id="bestsellers" className="mb-12">
              <SectionHeading eyebrow={t.bestsellers} title={lang === 'th' ? 'อันดับหนึ่งของร้าน' : 'Our bestsellers'} />
              {loading ? <SkeletonGrid /> : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 apple-duo-grid">
                  {bestsellers.map((p) => <ProductCard key={p.id} product={p} onTap={() => setModal(p)} />)}
                </div>
              )}
            </section>

            {/* Drinks */}
            <section id="drinks" className="mb-12">
              <SectionHeading eyebrow="🥛" title={t.drinks} sub={lang === 'th' ? 'เลือกภาชนะ · ความหวาน · ร้อนหรือเย็น' : 'Choose vessel · sweetness · hot or cold'} />
              {loading ? <SkeletonGrid /> : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 apple-duo-grid">
                  {drinks.map((p) => <ProductCard key={p.id} product={p} onTap={() => setModal(p)} />)}
                </div>
              )}
            </section>

            {/* Snacks */}
            <section id="snacks" className="mb-12">
              <SectionHeading eyebrow="⚡" title={t.snacks} sub={lang === 'th' ? 'ทานคู่กับเครื่องดื่ม — ชิ้นละ ฿3' : 'Grab-and-go add-ons — ฿3 each'} />
              {loading ? <SkeletonGrid /> : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 apple-duo-grid">
                  {snacks.map((p) => <ProductCard key={p.id} product={p} onTap={() => setModal(p)} />)}
                </div>
              )}
            </section>
          </>
        )}

        {/* About */}
        <section id="about" className="mb-12 grid md:grid-cols-2 gap-6 apple-duo-split">
          <div className="rounded-3xl liquid-glass border border-white/60 p-6 sm:p-8 relative overflow-hidden shadow-sm apple-duo-col-1">
            <div className="absolute -right-8 -bottom-8 h-48 w-48 rounded-full bg-forest/10" />
            <div className="absolute right-6 top-6 opacity-80">
              <div className="h-20 w-16 rounded-3xl bg-forest/20 milk-bag border border-forest/20"></div>
            </div>
            <div className="relative">
              <div className="text-xs uppercase tracking-widest text-forest font-bold">{t.ourStory}</div>
              <h3 className="font-display italic font-bold text-3xl text-forest mt-2">{t.aboutBags}</h3>
              <p className="mt-3 text-ink leading-relaxed text-sm font-thai">{t.aboutBagsBody}</p>
            </div>
          </div>
          <div className="rounded-3xl liquid-glass border border-white/60 p-6 sm:p-8 shadow-sm apple-duo-col-2">
            <div className="text-xs uppercase tracking-widest text-ink-muted font-bold">{t.nextBatches}</div>
            <h3 className="font-display italic font-bold text-2xl mt-1 text-forest">{lang === 'th' ? 'เวลาพร้อมเสิร์ฟ' : 'When we serve'}</h3>
            <ul className="mt-4 space-y-3">
              {[
                ['06:00', lang === 'th' ? 'น้ำเต้าหู้หม้อแรก' : 'First soy milk batch'],
                ['07:30', lang === 'th' ? 'นมวัวสดต้มร้อน + ซาลาเปาพร้อมเสิร์ฟ' : 'Fresh cow milk + hot steamed salapao'],
                ['09:00', lang === 'th' ? 'น้ำขิงต้มสดชุดใหม่' : 'Fresh boiled ginger tea'],
              ].map(([time, label]) => (
                <li key={time} className="flex items-center gap-3">
                  <div className="h-10 w-16 rounded-xl bg-forest text-cream flex items-center justify-center font-mono font-bold text-xs shadow-xs">{time}</div>
                  <div className="font-thai text-ink text-sm font-medium">{label}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Order History */}
        <section id="history" className="mb-12">
          <OrderHistory />
        </section>

        {/* Visit Section with Accurate Coordinates 18°46'47.4"N 98°59'04.1"E and OSM Map */}
        <section id="visit" className="mb-12">
          <SectionHeading
            eyebrow={t.locationDirections}
            title={lang === 'th' ? 'ร้านวันใจ Soy · ถนนวัวลาย' : 'Wanchai Soy · Walai Road'}
            sub={lang === 'th' ? 'พิกัดร้านชัดเจน 18°46\'47.4"N 98°59\'04.1"E' : 'Accurate GPS: 18°46\'47.4"N 98°59\'04.1"E'}
          />
          <div className="rounded-3xl overflow-hidden liquid-glass border border-white/60 grid lg:grid-cols-12 shadow-sm apple-duo-split">
            {/* Left: Contact Info & Action Buttons (5 cols) */}
            <div className="p-6 sm:p-8 lg:col-span-5 apple-duo-col-1 flex flex-col justify-between">
              <div>
                <div className="font-display italic font-bold text-3xl text-forest">Wanchai Soy</div>
                <div className="font-thai text-ink mt-2 text-sm leading-relaxed">{shopAddress}</div>

                <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest/10 border border-forest/15 font-mono text-xs text-forest">
                  <MapPin className="h-3.5 w-3.5 text-terracotta shrink-0" />
                  <span className="font-bold">{coordsText}</span>
                  <button
                    onClick={copyCoordinates}
                    className="ml-1 p-1 rounded-md hover:bg-forest/20 text-forest transition"
                    title={lang === 'th' ? 'คัดลอกพิกัด' : 'Copy coordinates'}
                  >
                    {copiedCoords ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>

                <ul className="mt-5 space-y-3 text-xs text-ink font-medium">
                  <li className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-terracotta shrink-0" />
                    <span>{shopHours}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-terracotta shrink-0" />
                    <a href={`tel:${shopPhone.replace(/[^0-9+]/g, '')}`} className="hover:underline text-forest font-bold">
                      {shopPhone}
                    </a>
                  </li>
                </ul>

                {/* Social Media & Platforms */}
                <div className="mt-6 pt-4 border-t border-forest/10">
                  <div className="text-[11px] font-bold text-forest uppercase tracking-wider mb-2">
                    {lang === 'th' ? 'ช่องทางโซเชียลมีเดีย' : 'Social Platforms'}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {settings.tiktok_url && (
                      <a
                        href={settings.tiktok_url}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-3 rounded-full liquid-pill text-forest flex items-center gap-1.5 hover:bg-forest/10 transition"
                      >
                        <span>TikTok</span>
                      </a>
                    )}
                    {settings.facebook_url && (
                      <a
                        href={settings.facebook_url}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-3 rounded-full liquid-pill text-forest flex items-center gap-1.5 hover:bg-forest/10 transition"
                      >
                        <span>Facebook</span>
                      </a>
                    )}
                    {settings.instagram_url && (
                      <a
                        href={settings.instagram_url}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-3 rounded-full liquid-pill text-forest flex items-center gap-1.5 hover:bg-forest/10 transition"
                      >
                        <Instagram className="h-3.5 w-3.5 text-terracotta" />
                        <span>Instagram</span>
                      </a>
                    )}
                    {settings.line_id && (
                      <div className="h-8 px-3 rounded-full liquid-pill text-forest flex items-center gap-1 font-mono text-[11px]">
                        <span className="font-bold text-emerald-600">LINE:</span> {settings.line_id}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-forest/10 flex flex-wrap gap-2.5">
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 px-5 rounded-full bg-forest text-cream font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-forest-dark transition active:scale-95"
                >
                  <MapPin className="h-4 w-4" /> {t.directions}
                </a>
                <a
                  href={osmUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 px-4.5 rounded-full liquid-pill text-forest font-bold text-xs flex items-center gap-1.5 active:scale-95"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {lang === 'th' ? 'เปิดแผนที่ OSM' : 'Open in OSM'}
                </a>
                <a
                  href={`tel:${shopPhone.replace(/[^0-9+]/g, '')}`}
                  className="h-11 px-4.5 rounded-full liquid-pill text-forest font-bold text-xs flex items-center gap-1.5 active:scale-95"
                >
                  <Phone className="h-3.5 w-3.5" /> {t.callShop}
                </a>
              </div>
            </div>

            {/* Right: Embedded OpenStreetMap showing exact 18°46'47.4"N 98°59'04.1"E pin (7 cols) */}
            <div className="lg:col-span-7 p-4 sm:p-6 bg-forest/5 flex flex-col justify-between apple-duo-col-2">
              <div className="rounded-2xl overflow-hidden border border-forest/20 shadow-md bg-white">
                <iframe
                  title="OpenStreetMap Location 18°46'47.4N 98°59'04.1E"
                  width="100%"
                  height="320"
                  className="w-full h-72 sm:h-80 border-0"
                  src={osmEmbedUrl}
                  loading="lazy"
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted">
                <span>
                  {lang === 'th' ? 'แผนที่ดาวเทียม OpenStreetMap พิกัดร้านวันใจ' : 'OpenStreetMap exact location pin'}
                </span>
                <a
                  href={osmUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-forest font-bold underline hover:text-terracotta flex items-center gap-1"
                >
                  {lang === 'th' ? 'ดูแผนที่ขนาดใหญ่' : 'View larger map'} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility & Legibility Settings Panel */}
        <section className="mt-12 mb-6 max-w-2xl mx-auto">
          <AccessibilitySettings variant="card" />
        </section>

        <footer className="pt-4 pb-6 text-center text-xs text-ink-muted">
          © Wanchai Soy · {shopAddress} · {coordsText} ·
          <Link to="/admin" className="ml-2 underline hover:text-forest">{t.admin}</Link>
        </footer>
      </main>

      {/* Floating Quick Voice Order Action */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic('medium');
          setVoiceModalOpen(true);
        }}
        title={t.voiceOrder}
        className="fixed bottom-24 right-4 z-40 h-12 px-4 rounded-full bg-forest text-cream shadow-2xl flex items-center gap-2 hover:bg-forest-dark active:scale-95 transition border border-white/50 backdrop-blur-md group"
      >
        <div className="h-7 w-7 rounded-full bg-forest-dark flex items-center justify-center text-honey group-hover:scale-110 transition">
          <Mic className="h-4 w-4" />
        </div>
        <span className="text-xs font-bold font-thai hidden sm:inline">
          {t.voiceOrder}
        </span>
      </button>

      {modal && <OrderModal product={modal} onClose={() => setModal(null)} />}
      <MenuQrModal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} />
      <VoiceOrderModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        products={products}
      />
      <BackToTop />
      <DesktopSideActions />
    </div>
  );
}

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-widest text-terracotta font-semibold">{eyebrow}</div>
        <h2 className="font-display italic font-bold text-3xl sm:text-4xl text-ink leading-tight">{title}</h2>
        {sub && <div className="text-sm text-ink-muted mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="rounded-2xl bg-cream-soft border-2 border-forest/10 overflow-hidden">
          <div className="aspect-square bg-beige animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-beige rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-beige rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
