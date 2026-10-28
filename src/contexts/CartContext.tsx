import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { triggerHaptic } from '../lib/haptics';

export type CartItem = {
  key: string;              // unique cart line id
  product_id: number;
  slug: string;
  name_th: string;
  name_en: string;
  image_url: string;
  base_price: number;
  vessel: 'bag' | 'cup' | 'bottle' | 'own';
  sweetness: 'none' | 'less' | 'normal' | 'extra';
  temp: 'hot' | 'cold' | 'na';
  extras: string[];         // extra flags like 'ice'
  qty: number;
  unit_price: number;       // computed with modifiers
  notes?: string;
};

type Ctx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  updateQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  subtotal: number;
  count: number;
  bumpKey: number;
  specialInstructions: string;
  setSpecialInstructions: (notes: string) => void;
};

const CartContext = createContext<Ctx>({
  items: [],
  add: () => {},
  updateQty: () => {},
  remove: () => {},
  clear: () => {},
  subtotal: 0,
  count: 0,
  bumpKey: 0,
  specialInstructions: '',
  setSpecialInstructions: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });
  const [bumpKey, setBumpKey] = useState<number>(0);
  const [specialInstructions, setSpecialInstructionsState] = useState<string>(() => {
    try { return localStorage.getItem('wanjai_cart_notes') || ''; } catch { return ''; }
  });

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(items)); }, [items]);

  const setSpecialInstructions = (notes: string) => {
    setSpecialInstructionsState(notes);
    try { localStorage.setItem('wanjai_cart_notes', notes); } catch {}
  };

  const add = (item: CartItem) => {
    triggerHaptic('medium');
    try {
      import('../lib/sound').then((s) => s.playClickCue());
    } catch {}
    setItems((prev) => {
      // merge identical lines
      const existing = prev.find(
        (p) =>
          p.slug === item.slug &&
          p.vessel === item.vessel &&
          p.sweetness === item.sweetness &&
          p.temp === item.temp &&
          JSON.stringify(p.extras) === JSON.stringify(item.extras) &&
          (p.notes || '') === (item.notes || '')
      );
      if (existing) {
        return prev.map((p) => (p === existing ? { ...p, qty: p.qty + item.qty } : p));
      }
      return [...prev, item];
    });
    // Trigger cart bounce/shake animation
    setBumpKey((prev) => prev + 1);
  };
  const updateQty = (key: string, qty: number) => {
    triggerHaptic('light');
    setItems((prev) => (qty <= 0 ? prev.filter((p) => p.key !== key) : prev.map((p) => (p.key === key ? { ...p, qty } : p))));
  };
  const remove = (key: string) => {
    triggerHaptic('warning');
    setItems((prev) => prev.filter((p) => p.key !== key));
  };
  const clear = () => {
    triggerHaptic('medium');
    setItems([]);
    setSpecialInstructions('');
  };
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        add,
        updateQty,
        remove,
        clear,
        subtotal,
        count,
        bumpKey,
        specialInstructions,
        setSpecialInstructions,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
