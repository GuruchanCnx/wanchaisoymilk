import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Heart } from 'lucide-react';
import type { Product } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { useCart, type CartItem } from '../contexts/CartContext';
import { baht } from '../lib/format';

type Vessel = 'bag' | 'cup' | 'bottle' | 'own';
type Sweet = 'none' | 'less' | 'normal' | 'extra';
type Temp = 'hot' | 'cold' | 'na';

const VESSEL_MOD: Record<Vessel, number> = { bag: 0, cup: 0, bottle: 5, own: -2 };

export default function OrderModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { t, lang } = useLang();
  const { add } = useCart();
  const isDrink = product.category === 'drinks';
  const [vessel, setVessel] = useState<Vessel>('bag');
  const [sweet, setSweet] = useState<Sweet>('normal');
  const [temp, setTemp] = useState<Temp>(isDrink ? 'cold' : 'na');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

  const unit = useMemo(() => product.price + (isDrink ? VESSEL_MOD[vessel] : 0), [product.price, vessel, isDrink]);

  const saveUsual = (item: CartItem) => {
    try {
      const usuals: CartItem[] = JSON.parse(localStorage.getItem('my-usual') || '[]');
      const withoutSame = usuals.filter((u) => !(u.slug === item.slug && u.vessel === item.vessel && u.sweetness === item.sweetness && u.temp === item.temp));
      const next = [{ ...item, key: `usual-${Date.now()}` }, ...withoutSame].slice(0, 6);
      localStorage.setItem('my-usual', JSON.stringify(next));
    } catch {}
  };

  const buildItem = (): CartItem => ({
    key: `${product.slug}-${vessel}-${sweet}-${temp}-${Date.now()}`,
    product_id: product.id,
    slug: product.slug,
    name_th: product.name_th,
    name_en: product.name_en,
    image_url: product.image_url,
    base_price: product.price,
    vessel,
    sweetness: sweet,
    temp,
    extras: [],
    qty,
    unit_price: unit,
    notes: notes.trim() || undefined,
  });

  const addAndClose = (asUsual = false) => {
    const item = buildItem();
    add(item);
    if (asUsual) saveUsual(item);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-cream rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border-t-4 sm:border-4 border-forest max-h-[92dvh] flex flex-col"
        >
          <div className="relative shrink-0">
            <img src={product.image_url} alt={product.name_th} className="w-full h-40 object-cover" />
            <button onClick={onClose} aria-label={t.cancel} className="absolute top-3 right-3 h-9 w-9 rounded-full bg-cream/95 flex items-center justify-center shadow-md">
              <X className="h-5 w-5 text-ink" />
            </button>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
              <div className="bg-cream/95 px-3 py-1.5 rounded-full">
                <div className="font-thai font-bold text-ink text-sm leading-tight">{lang === 'th' ? product.name_th : product.name_en}</div>
              </div>
              <div className="bg-forest text-cream px-3 py-1.5 rounded-full font-display italic font-bold">{baht(unit)}</div>
            </div>
          </div>

          <div className="p-5 overflow-y-auto">
            {isDrink && (
              <>
                <Section label={t.vessel}>
                  <ChipGroup
                    value={vessel}
                    onChange={(v) => setVessel(v as Vessel)}
                    options={[
                      { v: 'bag', label: t.bag, hint: lang === 'th' ? 'ถุงใส' : 'clear bag' },
                      { v: 'cup', label: t.cup },
                      { v: 'bottle', label: t.bottle },
                      { v: 'own', label: t.ownVessel },
                    ]}
                  />
                </Section>

                <Section label={t.sweetness}>
                  <ChipGroup
                    value={sweet}
                    onChange={(v) => setSweet(v as Sweet)}
                    options={[
                      { v: 'none', label: t.noSugar },
                      { v: 'less', label: t.lessSugar },
                      { v: 'normal', label: t.normalSugar },
                      { v: 'extra', label: t.extraSugar },
                    ]}
                  />
                </Section>

                <Section label={lang === 'th' ? 'อุณหภูมิ' : 'Temperature'}>
                  <ChipGroup
                    value={temp}
                    onChange={(v) => setTemp(v as Temp)}
                    options={[
                      { v: 'hot', label: t.hotDrink },
                      { v: 'cold', label: t.coldDrink },
                    ]}
                  />
                </Section>
              </>
            )}

            <Section label={t.notes}>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={lang === 'th' ? 'เช่น เพิ่มน้ำแข็ง, ไม่ใสนมสด...' : 'e.g. extra ice, no fresh milk...'}
                className="w-full rounded-xl border-2 border-forest/15 bg-cream-soft px-4 py-3 text-ink font-thai focus:outline-none focus:border-forest"
              />
            </Section>

            <Section label={t.quantity}>
              <div className="flex items-center gap-4">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-12 w-12 rounded-full bg-cream-soft border-2 border-forest/15 flex items-center justify-center active:scale-95">
                  <Minus className="h-5 w-5 text-forest" />
                </button>
                <div className="font-display italic font-bold text-3xl text-forest w-12 text-center">{qty}</div>
                <button onClick={() => setQty(qty + 1)} className="h-12 w-12 rounded-full bg-forest text-cream flex items-center justify-center active:scale-95">
                  <Plus className="h-5 w-5" />
                </button>
                <div className="ml-auto text-right">
                  <div className="text-xs text-ink-muted">{t.total}</div>
                  <div className="font-display italic font-bold text-2xl text-terracotta">{baht(unit * qty)}</div>
                </div>
              </div>
            </Section>
          </div>

          <div className="shrink-0 p-4 pt-2 border-t-2 border-forest/10 bg-cream-soft grid grid-cols-3 gap-2">
            <button onClick={() => addAndClose(true)} className="col-span-1 h-14 rounded-xl bg-cream border-2 border-terracotta text-terracotta font-semibold text-sm flex items-center justify-center gap-1 active:scale-95">
              <Heart className="h-4 w-4" /> {t.saveMyUsual}
            </button>
            <button onClick={() => addAndClose(false)} className="col-span-2 h-14 rounded-xl bg-forest text-cream font-bold text-lg flex items-center justify-center gap-2 active:scale-95 hover:bg-forest-dark transition">
              {t.addToCart} · {baht(unit * qty)}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-xs uppercase tracking-wider text-ink-muted font-semibold mb-2">{label}</div>
      {children}
    </div>
  );
}

function ChipGroup({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; label: string; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`h-14 rounded-xl border-2 px-3 text-left transition active:scale-95 ${value === o.v ? 'border-forest bg-forest text-cream' : 'border-forest/15 bg-cream-soft text-ink'}`}
        >
          <div className="font-semibold text-sm leading-tight">{o.label}</div>
          {o.hint && <div className="text-[10px] opacity-70">{o.hint}</div>}
        </button>
      ))}
    </div>
  );
}
