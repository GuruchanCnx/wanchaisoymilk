import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Sparkles, Instagram, Phone, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { useLang } from '../contexts/LanguageContext';
import Nav, { DesktopSideActions } from '../components/Nav';
import OnlineBadge from '../components/OnlineBadge';
import BackToTop from '../components/BackToTop';
import ProductCard from '../components/ProductCard';
import OrderModal from '../components/OrderModal';
import MyUsualStrip from '../components/MyUsualStrip';
import RecentOrdersStrip from '../components/RecentOrdersStrip';
import OrderHistory from '../components/OrderHistory';
import { cacheGet, cacheSet } from '../lib/cache';

export default function Home() {
  const { t, lang } = useLang();
  const [products, setProducts] = useState<Product[]>(() => cacheGet<Product[]>('menu', 30_000) || []);
  const [loading, setLoading] = useState(products.length === 0);
  const [modal, setModal] = useState<Product | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>(() => cacheGet('settings', 60_000) || {});

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

  const drinks = products.filter((p) => p.category === 'drinks');
  const snacks = products.filter((p) => p.category === 'snacks');
  const bestsellers = products.filter((p) => ['soy-milk', 'cow-milk', 'ginger-tea'].includes(p.slug));

  const shopStatus = settings.shop_status || 'open';

  return (
    <div className="min-h-screen pb-24">
      <OnlineBadge />
      <Nav scrollTargets={[
        { id: 'bestsellers', label_th: 'ขายดี', label_en: 'Bestsellers' },
        { id: 'drinks', label_th: 'เครื่องดื่ม', label_en: 'Drinks' },
        { id: 'snacks', label_th: 'ของว่าง', label_en: 'Snacks' },
        { id: 'history', label_th: 'ประวัติสั่งซื้อ', label_en: 'History' },
        { id: 'about', label_th: 'เกี่ยวกับเรา', label_en: 'About' },
        { id: 'visit', label_th: 'มาหาเรา', label_en: 'Visit' },
      ]} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-forest/15">
        <div className="absolute inset-0">
          <img src="/images/hero.jpg" alt="" className="w-full h-full object-cover opacity-25" />
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
                onClick={() => document.getElementById('bestsellers')?.scrollIntoView({ behavior: 'smooth' })}
                className="h-12 px-6 rounded-full bg-forest text-cream font-bold text-xs shadow-md hover:bg-forest-dark active:scale-95 transition flex items-center gap-2"
              >
                {t.tapToOrder} <ChevronDown className="h-4 w-4" />
              </button>
              <a
                href="https://maps.google.com/?q=15%2F4+Soi+2+Walai+Rd+Chiang+Mai"
                target="_blank" rel="noreferrer"
                className="h-12 px-5 rounded-full liquid-pill text-forest font-bold text-xs flex items-center gap-2 active:scale-95 shadow-xs"
              >
                <MapPin className="h-4 w-4" /> {t.directions}
              </a>
              <Link to="/checkout" className="h-12 px-5 rounded-full bg-terracotta text-cream font-bold text-xs flex items-center gap-2 active:scale-95 shadow-md hover:bg-terracotta-dark transition">
                {t.walkupOrder}
              </Link>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 text-xs sm:text-sm liquid-pill rounded-full px-3.5 py-1.5 text-ink-muted">
              <MapPin className="h-3.5 w-3.5 text-terracotta" /> {t.address} · <span className="text-forest font-semibold">{t.pickupOnly}</span>
            </div>
          </motion.div>
        </div>

        {/* Ticker */}
        <div className="relative border-t border-forest/15 bg-forest text-cream overflow-hidden">
          <div className="flex whitespace-nowrap marquee py-2.5 text-xs font-semibold tracking-wide">
            {Array(2).fill(0).map((_, k) => (
              <span key={k} className="flex items-center">
                {['นมถั่วเหลือง ต้นตำรับ', 'Made this morning · clear-bag tradition', 'ปาท่องโก ซาลาเปา ชิ้นละ ฿3', 'Patongko & Salapao · ฿3 each', 'เอาภาชนะมาเอง ลด 2 บาท', 'BYO container: – ฿2'].map((s, i) => (
                  <span key={i} className="px-6 flex items-center gap-3"><Sparkles className="h-3.5 w-3.5 text-honey" /> {s}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8 apple-duo-container">
        <MyUsualStrip />
        <RecentOrdersStrip />

        {/* Bestsellers */}
        <section id="bestsellers" className="mb-12">
          <SectionHeading eyebrow={lang === 'th' ? 'ขายดีที่สุด' : 'Fastest movers'} title={lang === 'th' ? 'อันดับหนึ่งของเจ้า' : 'Our bestsellers'} />
          {loading ? <SkeletonGrid /> : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 apple-duo-grid">
              {bestsellers.map((p) => <ProductCard key={p.id} product={p} onTap={() => setModal(p)} />)}
            </div>
          )}
        </section>

        {/* Drinks */}
        <section id="drinks" className="mb-12">
          <SectionHeading eyebrow="🥛" title={t.drinks} sub={lang === 'th' ? 'เลือกภาชนะ · ความหวาน · ร้อน/เย็น' : 'Choose vessel · sweetness · hot/cold'} />
          {loading ? <SkeletonGrid /> : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 apple-duo-grid">
              {drinks.map((p) => <ProductCard key={p.id} product={p} onTap={() => setModal(p)} />)}
            </div>
          )}
        </section>

        {/* Snacks */}
        <section id="snacks" className="mb-12">
          <SectionHeading eyebrow="⚡" title={t.snacks} sub={lang === 'th' ? 'บวกเข้ากับเครื่องดื่ม — ชิ้นละ ฿3' : 'Grab-and-go add-ons — ฿3 each'} />
          {loading ? <SkeletonGrid /> : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 apple-duo-grid">
              {snacks.map((p) => <ProductCard key={p.id} product={p} onTap={() => setModal(p)} />)}
            </div>
          )}
        </section>

        {/* About */}
        <section id="about" className="mb-12 grid md:grid-cols-2 gap-6 apple-duo-split">
          <div className="rounded-3xl liquid-glass border border-white/60 p-6 sm:p-8 relative overflow-hidden shadow-sm apple-duo-col-1">
            <div className="absolute -right-8 -bottom-8 h-48 w-48 rounded-full bg-forest/10" />
            <div className="absolute right-6 top-6 opacity-80">
              <div className="h-20 w-16 rounded-3xl bg-forest/20 milk-bag border border-forest/20"></div>
            </div>
            <div className="relative">
              <div className="text-xs uppercase tracking-widest text-forest font-bold">{lang === 'th' ? 'เรื่องราวของเรา' : 'Our story'}</div>
              <h3 className="font-display italic font-bold text-3xl text-forest mt-2">{t.aboutBags}</h3>
              <p className="mt-3 text-ink leading-relaxed text-sm font-thai">{t.aboutBagsBody}</p>
            </div>
          </div>
          <div className="rounded-3xl liquid-glass border border-white/60 p-6 sm:p-8 shadow-sm apple-duo-col-2">
            <div className="text-xs uppercase tracking-widest text-ink-muted font-bold">{lang === 'th' ? 'ชุดต่อไปทำเมื่อ' : 'Next batches today'}</div>
            <h3 className="font-display italic font-bold text-2xl mt-1 text-forest">{lang === 'th' ? 'พร้อมเสิร์ฟเมื่อ' : 'When we serve'}</h3>
            <ul className="mt-4 space-y-3">
              {[['06:00', lang === 'th' ? 'นมถั่วชุดแรก' : 'First soy batch'], ['07:30', lang === 'th' ? 'นมวัวสด + ซาลาเปาออกเตา' : 'Fresh cow milk + salapao out of steamer'], ['09:00', lang === 'th' ? 'น้ำขิงร้อนชุดใหม่' : 'Fresh ginger tea']].map(([time, label]) => (
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

        {/* Visit */}
        <section id="visit" className="mb-12">
          <SectionHeading eyebrow={lang === 'th' ? 'มาหาเรา' : 'Come visit'} title={lang === 'th' ? 'สาขาเดียว — หน้าม.ช.เชียงใหม่' : 'One shop — near CMU'} />
          <div className="rounded-3xl overflow-hidden liquid-glass border border-white/60 grid md:grid-cols-2 shadow-sm apple-duo-split">
            <div className="p-6 sm:p-8 apple-duo-col-1">
              <div className="font-display italic font-bold text-2xl text-forest">Wanchai Soy</div>
              <div className="font-thai text-ink mt-1 text-sm">{t.address}</div>
              <ul className="mt-4 space-y-2.5 text-xs text-ink">
                <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-terracotta" /> {lang === 'th' ? 'ทุกวัน 06:00 – 11:00' : 'Daily 06:00 – 11:00'}</li>
                <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-terracotta" /> 053-000-000</li>
                <li className="flex items-center gap-2"><Instagram className="h-4 w-4 text-terracotta" /> @wanchai.soy</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <a href="https://maps.google.com/?q=15%2F4+Soi+2+Walai+Rd+Chiang+Mai" target="_blank" rel="noreferrer" className="h-11 px-5 rounded-full bg-forest text-cream font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-forest-dark transition active:scale-95">
                  <MapPin className="h-4 w-4" /> {t.directions}
                </a>
                <a href="tel:+66530000000" className="h-11 px-5 rounded-full liquid-pill text-forest font-bold text-xs flex items-center gap-2 active:scale-95">
                  <Phone className="h-4 w-4" /> {t.callShop}
                </a>
              </div>
            </div>
            <div className="bg-forest text-cream p-6 sm:p-8 relative overflow-hidden apple-duo-col-2">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,180,74,0.4),transparent_40%)]" />
              </div>
              <div className="relative">
                <div className="text-xs uppercase tracking-widest text-honey font-bold">{lang === 'th' ? 'สิ่งที่ขายดี' : 'Bestsellers'}</div>
                <ul className="mt-3 space-y-1.5 font-display italic font-bold text-2xl">
                  <li>— {lang === 'th' ? 'น้ำเต้าหู้' : 'Soy milk (bag)'}</li>
                  <li>— {lang === 'th' ? 'นมวัวสด' : 'Fresh cow milk'}</li>
                  <li>— {lang === 'th' ? 'น้ำขิง' : 'Ginger tea'}</li>
                </ul>
                <div className="mt-6 text-cream/80">
                  <span className="text-xs uppercase tracking-wider font-semibold">{lang === 'th' ? 'ซาลาเปา · ปาท่องโก' : 'Salapao · Patongko'}</span>
                  <div className="font-display italic font-bold text-3xl text-honey mt-0.5">฿3 {lang === 'th' ? '/ชิ้น' : 'each'}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="pt-6 pb-6 text-center text-xs text-ink-muted">
          © Wanchai Soy · 15/4 Soi 2 Walai Rd, Haiya, Muang, Chiang Mai ·
          <Link to="/admin" className="ml-2 underline hover:text-forest">{t.admin}</Link>
        </footer>
      </main>

      {modal && <OrderModal product={modal} onClose={() => setModal(null)} />}
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
