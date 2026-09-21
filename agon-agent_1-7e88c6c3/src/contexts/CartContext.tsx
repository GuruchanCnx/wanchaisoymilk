import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

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
};

const CartContext = createContext<Ctx>({ items: [], add: () => {}, updateQty: () => {}, remove: () => {}, clear: () => {}, subtotal: 0, count: 0 });

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(items)); }, [items]);

  const add = (item: CartItem) => setItems((prev) => {
    // merge identical lines
    const existing = prev.find((p) => p.slug === item.slug && p.vessel === item.vessel && p.sweetness === item.sweetness && p.temp === item.temp && JSON.stringify(p.extras) === JSON.stringify(item.extras) && (p.notes || '') === (item.notes || ''));
    if (existing) {
      return prev.map((p) => p === existing ? { ...p, qty: p.qty + item.qty } : p);
    }
    return [...prev, item];
  });
  const updateQty = (key: string, qty: number) => setItems((prev) => qty <= 0 ? prev.filter((p) => p.key !== key) : prev.map((p) => p.key === key ? { ...p, qty } : p));
  const remove = (key: string) => setItems((prev) => prev.filter((p) => p.key !== key));
  const clear = () => setItems([]);
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, updateQty, remove, clear, subtotal, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
