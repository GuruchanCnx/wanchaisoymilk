import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, QrCode, Check, Clock, ChefHat, Package, XCircle, RefreshCw } from 'lucide-react';
import type { Order } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { baht, shortId, timeAgo } from '../lib/format';
import { useCart } from '../contexts/CartContext';

const STEPS: { key: Order['status']; icon: any }[] = [
  { key: 'pending', icon: Clock },
  { key: 'paid', icon: Check },
  { key: 'preparing', icon: ChefHat },
  { key: 'ready', icon: Package },
  { key: 'done', icon: Check },
];

export default function OrderStatus() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const { add } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/orders?id=${id}`)
      .then((r) => r.json())
      .then((data) => setOrder(Array.isArray(data) ? data[0] : data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const reorder = () => {
    if (!order) return;
    order.items.forEach((it) => add({
      key: `${it.slug}-reorder-${Date.now()}-${Math.random()}`,
      product_id: it.product_id,
      slug: it.slug,
      name_th: it.name_th,
      name_en: it.name_en,
      image_url: '',
      base_price: it.unit_price,
      vessel: (it.vessel as any) || 'bag',
      sweetness: (it.sweetness as any) || 'normal',
      temp: (it.temp as any) || 'na',
      extras: it.extras || [],
      qty: it.qty,
      unit_price: it.unit_price,
      notes: it.notes,
    }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-muted">{t.loading}</div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center text-ink-muted">{lang === 'th' ? 'ไม่พบออเดอร์' : 'Order not found'}</div>;

  const currentIndex = order.status === 'cancelled' ? -1 : STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b-2 border-forest/10">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <Link to="/" className="h-10 w-10 rounded-full bg-cream-soft border border-forest/15 flex items-center justify-center"><ArrowLeft className="h-4 w-4 text-forest" /></Link>
          <div>
            <div className="font-display italic font-bold text-forest text-xl leading-none">{t.orderStatus}</div>
            <div className="text-xs text-ink-muted">{shortId(order.id)} · {timeAgo(order.created_at, lang)}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Big status card */}
        <div className="rounded-3xl bg-forest text-cream p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-forest-light/40" />
          <div className="relative">
            <div className="text-xs uppercase tracking-widest text-honey">{t.status}</div>
            <div className="font-display italic font-bold text-4xl mt-1 capitalize">
              {order.status === 'pending' && (lang === 'th' ? 'รอชำระเงิน' : 'Waiting for payment')}
              {order.status === 'paid' && (lang === 'th' ? 'ชำระแล้ว' : 'Payment received')}
              {order.status === 'preparing' && (lang === 'th' ? 'กำลังเตรียม' : 'Preparing your order')}
              {order.status === 'ready' && (lang === 'th' ? 'พร้อมรับที่ร้าน' : 'Ready for pickup')}
              {order.status === 'done' && t.done}
              {order.status === 'cancelled' && t.cancelled}
            </div>
            <div className="mt-2 flex items-center gap-2 text-cream/80 text-sm">
              <Clock className="h-4 w-4" /> {t.pickupTime}: <span className="font-semibold">{order.pickup_time}</span>
            </div>
            {/* Progress */}
            <div className="mt-6 grid grid-cols-5 gap-1">
              {STEPS.map((s, i) => (
                <div key={s.key} className={`h-2 rounded-full ${i <= currentIndex ? 'bg-honey' : 'bg-cream/20'}`} />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              {STEPS.map((s, i) => {
                const Ic = s.icon;
                return (
                  <div key={s.key} className={`flex flex-col items-center gap-1 text-[10px] ${i <= currentIndex ? 'text-cream' : 'text-cream/40'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${i <= currentIndex ? 'bg-honey text-forest' : 'bg-cream/10'}`}>
                      <Ic className="h-4 w-4" />
                    </div>
                    {s.key === 'pending' && t.pending}
                    {s.key === 'paid' && t.paid}
                    {s.key === 'preparing' && t.preparing}
                    {s.key === 'ready' && t.ready}
                    {s.key === 'done' && t.done}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Payment status */}
        <section className="mt-4 rounded-2xl border-2 border-forest/15 bg-cream-soft p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${order.payment_status === 'paid' ? 'bg-forest text-cream' : 'bg-terracotta text-cream'}`}>
            {order.payment_status === 'paid' ? <Check className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="text-xs text-ink-muted uppercase tracking-widest">{lang === 'th' ? 'การชำระเงิน' : 'Payment'}</div>
            <div className="font-semibold text-ink">
              {order.payment_method === 'promptpay' ? 'PromptPay' : (lang === 'th' ? 'เงินสด' : 'Cash')} · <span className={order.payment_status === 'paid' ? 'text-forest' : 'text-terracotta'}>{order.payment_status === 'paid' ? t.paid : t.pending}</span>
            </div>
          </div>
          <div className="font-display italic font-bold text-forest text-2xl">{baht(order.total)}</div>
        </section>

        {/* Items */}
        <section className="mt-4 rounded-2xl bg-cream-soft border-2 border-forest/10 p-4">
          <div className="text-xs uppercase tracking-widest text-ink-muted mb-2">{t.yourItems}</div>
          <ul className="space-y-2">
            {order.items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-forest text-cream flex items-center justify-center font-mono font-bold text-xs">{it.qty}×</div>
                <div className="flex-1">
                  <div className="font-thai font-semibold text-ink">{lang === 'th' ? it.name_th : it.name_en}</div>
                  <div className="text-[11px] text-ink-muted">{it.vessel} · {it.sweetness}{it.temp !== 'na' ? ` · ${it.temp}` : ''}{it.notes ? ` · ${it.notes}` : ''}</div>
                </div>
                <div className="font-display italic font-bold text-forest">{baht(it.unit_price * it.qty)}</div>
              </li>
            ))}
          </ul>
        </section>

        {/* Pickup address */}
        <section className="mt-4 rounded-2xl bg-forest/5 border-2 border-forest/15 p-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-terracotta mt-0.5" />
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-ink-muted">{t.pickupOnly}</div>
              <div className="font-thai font-semibold text-ink">15/4 ซอย 2 ถ.วัวลัย ต.หายยา อ.เมือง จ.เชียงใหม่</div>
              <a href="https://maps.google.com/?q=15%2F4+Soi+2+Walai+Rd+Chiang+Mai" target="_blank" rel="noreferrer" className="mt-2 inline-flex h-9 items-center gap-2 rounded-full bg-forest text-cream px-4 text-sm font-semibold">
                <MapPin className="h-4 w-4" /> {t.directions}
              </a>
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={reorder} className="h-12 rounded-full bg-terracotta text-cream font-semibold flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4" /> {t.reorder}
          </button>
          <Link to="/" className="h-12 rounded-full bg-cream border-2 border-forest text-forest font-semibold flex items-center justify-center gap-2">
            {t.home}
          </Link>
        </div>

        {order.status === 'cancelled' && (
          <div className="mt-4 rounded-2xl bg-chili/10 border-2 border-chili/30 p-4 text-chili font-semibold flex items-center gap-2">
            <XCircle className="h-5 w-5" /> {t.cancelled}
          </div>
        )}
      </main>
    </div>
  );
}
