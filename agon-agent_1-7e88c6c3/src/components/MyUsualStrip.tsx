import { useEffect, useState } from 'react';
import { Heart, Zap } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { useCart, type CartItem } from '../contexts/CartContext';
import { baht } from '../lib/format';

export default function MyUsualStrip() {
  const { t, lang } = useLang();
  const { add } = useCart();
  const [usuals, setUsuals] = useState<CartItem[]>([]);

  useEffect(() => {
    try { setUsuals(JSON.parse(localStorage.getItem('my-usual') || '[]')); } catch {}
    const onStorage = () => {
      try { setUsuals(JSON.parse(localStorage.getItem('my-usual') || '[]')); } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const oneTap = (u: CartItem) => {
    const item: CartItem = { ...u, key: `${u.slug}-usual-${Date.now()}`, qty: 1 };
    add(item);
    // subtle haptic if available
    if ('vibrate' in navigator) navigator.vibrate?.(15);
  };

  if (usuals.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="h-4 w-4 text-terracotta" fill="currentColor" />
        <h2 className="font-display italic font-bold text-xl text-ink">{t.myUsual}</h2>
        <span className="text-xs text-ink-muted">· {t.orderAgain}</span>
      </div>
      <div className="no-scrollbar overflow-x-auto -mx-4 px-4">
        <div className="flex gap-3 pb-1">
          {usuals.map((u) => (
            <button
              key={u.key}
              onClick={() => oneTap(u)}
              className="shrink-0 w-56 rounded-2xl bg-forest text-cream p-3 shadow-md text-left hover:bg-forest-dark active:scale-95 transition"
            >
              <div className="flex items-center gap-3">
                <img src={u.image_url} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="font-thai font-semibold text-sm truncate">{lang === 'th' ? u.name_th : u.name_en}</div>
                  <div className="text-xs opacity-70 truncate">{u.vessel} · {u.sweetness}{u.temp !== 'na' ? ` · ${u.temp}` : ''}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-display italic font-bold text-honey">{baht(u.unit_price)}</span>
                <span className="inline-flex items-center gap-1 text-xs bg-cream/15 rounded-full px-2 py-1 font-semibold">
                  <Zap className="h-3 w-3" /> {lang === 'th' ? 'แตะเดียว' : '1-tap'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
