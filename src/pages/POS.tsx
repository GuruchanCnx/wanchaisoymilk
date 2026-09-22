import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Check,
  ChefHat,
  Package,
  Clock,
  XCircle,
  Volume2,
  VolumeX,
  Calculator,
  RotateCcw,
} from 'lucide-react';
import type { Order } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { baht, shortId, timeAgo } from '../lib/format';
import LanguageToggle from '../components/LanguageToggle';
import PosDialPad from '../components/PosDialPad';
import { useFoldableSpanning } from '../hooks/useFoldableSpanning';

export default function POS() {
  const { t, lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [sound, setSound] = useState(true);
  const [lastCount, setLastCount] = useState(0);
  const [showDialPad, setShowDialPad] = useState(false);

  // Hook that detects if the foldable device is spanned across two screens
  // and automatically adds scroll-padding to the main content wrapper
  const { isSpanned, isDualScreen, wrapperRef } = useFoldableSpanning<HTMLElement>();

  const load = useCallback(async () => {
    try {
      const data = await fetch('/api/orders').then((r) => r.json());
      const list: Order[] = Array.isArray(data) ? data : [];
      // Ping on new order
      const active = list.filter((o) => ['pending', 'paid', 'preparing'].includes(o.status));
      if (active.length > lastCount && sound && lastCount > 0) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.2;
          o.start(); setTimeout(() => o.stop(), 240);
          navigator.vibrate?.(80);
        } catch {}
      }
      setLastCount(active.length);
      setOrders(list);
    } catch {}
  }, [lastCount, sound]);

  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [load]);

  const update = async (id: number, patch: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...patch } as Order : o));
    await fetch('/api/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) });
  };

  const bucket = (statuses: Order['status'][]) => orders.filter((o) => statuses.includes(o.status));
  const newQueue = bucket(['pending', 'paid']);
  const preparing = bucket(['preparing']);
  const ready = bucket(['ready']);

  return (
    <div className={`min-h-screen bg-forest text-cream ${isSpanned ? 'duo-spanned-active' : ''}`}>
      <header className="sticky top-0 z-30 bg-forest border-b-2 border-cream/10 duo-nav-shell">
        <div className="px-4 py-3 flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3 duo-nav-left">
            <Link to="/admin" className="h-11 w-11 rounded-full bg-forest-dark flex items-center justify-center hover:bg-forest-dark/80 transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="font-display italic font-bold text-2xl flex items-center gap-2">
                POS
                {isSpanned && (
                  <span className="text-[10px] font-mono uppercase bg-honey text-forest font-bold px-2 py-0.5 rounded-full not-italic">
                    Dual-Screen
                  </span>
                )}
              </div>
              <div className="text-xs text-cream/60">Wanchai Soy · Walai</div>
            </div>
          </div>

          <div className="flex items-center gap-2 duo-nav-right">
            {/* Quick Dial Pad Toggle Button */}
            <button
              onClick={() => setShowDialPad(!showDialPad)}
              className="h-11 px-4 rounded-full bg-honey text-forest font-bold text-xs flex items-center gap-1.5 shadow hover:bg-honey-dark transition active:scale-95"
            >
              <Calculator className="h-4 w-4" />
              <span>{lang === 'th' ? 'แป้นคิดเงินหน้าร้าน' : 'Walk-by Dial Pad'}</span>
            </button>

            <button
              onClick={load}
              title="Refresh queue"
              className="h-11 w-11 rounded-full bg-forest-dark flex items-center justify-center hover:bg-forest-dark/80 transition"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setSound(!sound)}
              className="h-11 w-11 rounded-full bg-forest-dark flex items-center justify-center hover:bg-forest-dark/80 transition"
            >
              {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>

            <LanguageToggle compact />
          </div>
        </div>
      </header>

      {/* Main Content Wrapper with scroll-padding automatically managed by useFoldableSpanning */}
      <main
        ref={wrapperRef}
        className={`p-4 transition-all duration-300 ${
          isSpanned
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-8 duo-screen-layout'
            : 'grid grid-cols-1 md:grid-cols-3 gap-4'
        }`}
      >
        {/* Left Segment: Kitchen / Counter Order Columns */}
        <div className={`space-y-4 ${isSpanned ? 'grid grid-cols-1 sm:grid-cols-3 gap-3 duo-hinge-divider' : 'contents'}`}>
          <Column title={t.newOrder} icon={Bell} accent="bg-honey text-forest" count={newQueue.length}>
            {newQueue.map((o) => (
              <PosCard key={o.id} order={o} lang={lang}>
                <button onClick={() => update(o.id, { status: 'preparing', payment_status: 'paid' })} className="pos-btn w-full rounded-2xl bg-honey text-forest active:scale-95"><ChefHat className="inline h-5 w-5 mr-1" /> {t.accept}</button>
              </PosCard>
            ))}
          </Column>

          <Column title={t.preparing} icon={ChefHat} accent="bg-terracotta text-cream" count={preparing.length}>
            {preparing.map((o) => (
              <PosCard key={o.id} order={o} lang={lang}>
                <button onClick={() => update(o.id, { status: 'ready' })} className="pos-btn w-full rounded-2xl bg-terracotta text-cream active:scale-95"><Package className="inline h-5 w-5 mr-1" /> {t.markReady}</button>
              </PosCard>
            ))}
          </Column>

          <Column title={t.ready} icon={Package} accent="bg-cream text-forest" count={ready.length}>
            {ready.map((o) => (
              <PosCard key={o.id} order={o} lang={lang}>
                <button onClick={() => update(o.id, { status: 'done' })} className="pos-btn w-full rounded-2xl bg-cream text-forest active:scale-95"><Check className="inline h-5 w-5 mr-1" /> {t.markDone}</button>
              </PosCard>
            ))}
          </Column>
        </div>

        {/* Right Segment on Foldable Dual-Screen: Docked Walk-by Dial Pad */}
        {isSpanned && (
          <div className="w-full">
            <PosDialPad onOrderCreated={load} isEmbedded />
          </div>
        )}
      </main>

      {/* Modal Walk-by Dial Pad for single-screen view or when manually opened */}
      {showDialPad && !isSpanned && (
        <PosDialPad
          onClose={() => setShowDialPad(false)}
          onOrderCreated={() => {
            load();
            setShowDialPad(false);
          }}
        />
      )}
    </div>
  );
}


function Column({ title, icon: Ic, accent, count, children }: { title: string; icon: any; accent: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className={`rounded-2xl px-4 py-3 mb-3 flex items-center justify-between ${accent}`}>
        <div className="font-display italic font-bold text-2xl flex items-center gap-2"><Ic className="h-5 w-5" /> {title}</div>
        <div className="font-mono text-xl font-bold">{count}</div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function PosCard({ order, lang, children }: { order: Order; lang: 'th' | 'en'; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-forest-dark border-2 border-cream/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono font-bold text-honey text-lg">{shortId(order.id)}</div>
        <div className="text-xs text-cream/60 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {timeAgo(order.created_at, lang)}</div>
      </div>
      <div className="font-thai font-semibold">{order.customer_name || (lang === 'th' ? 'ลูกค้าเดินมาซื้อ' : 'Walk-up')}</div>
      <div className="text-xs text-cream/70">{order.phone}</div>
      <ul className="mt-3 space-y-1.5">
        {order.items.map((i, k) => (
          <li key={k} className="flex items-start gap-2 text-base">
            <span className="font-mono font-bold text-honey w-8 shrink-0">{i.qty}×</span>
            <div>
              <div className="font-thai font-semibold leading-tight">{lang === 'th' ? i.name_th : i.name_en}</div>
              <div className="text-xs text-cream/60">{i.vessel} · {i.sweetness}{i.temp !== 'na' ? ` · ${i.temp}` : ''}{i.notes ? ` — ${i.notes}` : ''}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-cream/70">Pickup <b className="text-cream">{order.pickup_time}</b></div>
        <div className="font-display italic font-bold text-honey text-xl">{baht(order.total)}</div>
      </div>
      <div className="mt-3">{children}</div>
      {order.status !== 'cancelled' && order.status !== 'done' && (
        <button onClick={async () => { await fetch('/api/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: order.id, status: 'cancelled' }) }); }} className="mt-2 w-full h-10 rounded-full bg-cream/5 text-cream/60 text-xs flex items-center justify-center gap-1">
          <XCircle className="h-3.5 w-3.5" /> cancel
        </button>
      )}
    </div>
  );
}
