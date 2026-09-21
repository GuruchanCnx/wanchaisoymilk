import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, RefreshCw } from 'lucide-react';
import type { Order } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { baht, shortId, timeAgo } from '../lib/format';

export default function RecentOrdersStrip() {
  const { t, lang } = useLang();
  const { add } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const phone = localStorage.getItem('customer_phone');
    if (!phone) return;
    fetch(`/api/orders?phone=${encodeURIComponent(phone)}`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setOrders(d.slice(0, 5)))
      .catch(() => {});
  }, []);

  const reorder = (o: Order) => {
    o.items.forEach((it) => {
      add({
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
      });
    });
    if ('vibrate' in navigator) navigator.vibrate?.(15);
  };

  if (orders.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-forest" />
        <h2 className="font-display italic font-bold text-xl text-ink">{t.recentOrders}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl bg-cream-soft border-2 border-forest/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-ink-muted">{shortId(o.id)} · {timeAgo(o.created_at, lang)}</div>
              <div className="text-xs font-semibold text-forest capitalize">{o.status}</div>
            </div>
            <div className="text-sm text-ink line-clamp-2 mb-3">
              {o.items.map((i) => `${i.qty}× ${lang === 'th' ? i.name_th : i.name_en}`).join(', ')}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => reorder(o)} className="flex-1 h-10 rounded-xl bg-forest text-cream text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95">
                <RefreshCw className="h-3.5 w-3.5" /> {t.reorder} · {baht(o.total)}
              </button>
              <Link to={`/order/${o.id}`} className="h-10 px-3 rounded-xl bg-cream border-2 border-forest/15 text-forest text-sm font-semibold flex items-center">→</Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
