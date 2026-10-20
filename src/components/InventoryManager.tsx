import { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  RefreshCw,
  Clock,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { Product } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';
import { baht } from '../lib/format';

export default function InventoryManager() {
  const { lang } = useLang();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'drinks' | 'snacks'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out'>('all');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Failed to load inventory', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const updateProductStock = async (id: number, newStock: number, soldOut?: boolean) => {
    setSavingId(id);
    triggerHaptic('light');

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const isSoldOut = soldOut !== undefined ? soldOut : newStock <= 0;
          return { ...p, stock: Math.max(0, newStock), sold_out: isSoldOut };
        }
        return p;
      })
    );

    try {
      const isSoldOut = soldOut !== undefined ? soldOut : newStock <= 0;
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          stock: Math.max(0, newStock),
          sold_out: isSoldOut,
        }),
      });

      if (res.ok) {
        showToast(
          lang === 'th' ? 'อัปเดตสต็อกเรียบร้อย' : 'Stock Updated',
          lang === 'th' ? `สินค้า #${id} มีคงเหลือ ${Math.max(0, newStock)} ชิ้น` : `Item #${id} now has ${Math.max(0, newStock)} in stock`,
          'success'
        );
      }
    } catch (err) {
      console.warn('Failed to update stock', err);
    } finally {
      setSavingId(null);
    }
  };

  const updateBatchTime = async (id: number, nextBatchTime: string) => {
    setSavingId(id);
    triggerHaptic('tap');

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, next_batch_time: nextBatchTime } : p))
    );

    try {
      await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          next_batch_time: nextBatchTime,
        }),
      });
      showToast(
        lang === 'th' ? 'บันทึกเวลาต้มหม้อถัดไปแล้ว' : 'Next Batch Time Saved',
        `${nextBatchTime}`,
        'info'
      );
    } catch {}
    setSavingId(null);
  };

  const bulkRestockCategory = async (cat: 'drinks' | 'snacks', amount: number) => {
    triggerHaptic('medium');
    setLoading(true);

    const targetProducts = products.filter((p) => p.category === cat);
    for (const p of targetProducts) {
      const nextStock = (p.stock || 0) + amount;
      await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: p.id,
          stock: nextStock,
          sold_out: false,
        }),
      });
    }

    showToast(
      lang === 'th'
        ? `เติมสต็อกหมวด ${cat === 'drinks' ? 'เครื่องดื่ม' : 'ขนม'} +${amount} สำเร็จ`
        : `Bulk Restocked ${cat} by +${amount}`,
      lang === 'th' ? 'อัปเดตสต็อกสินค้าทั้งหมดในหมวดเรียบร้อย' : 'All items in category updated',
      'success'
    );

    await loadProducts();
  };

  // Stats calculations
  const totalItems = products.length;
  const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const lowStockCount = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10).length;
  const outOfStockCount = products.filter((p) => (p.stock ?? 0) <= 0 || p.sold_out).length;

  // Filtered list
  const filtered = products.filter((p) => {
    const matchSearch = (p.name_th + p.name_en + p.slug)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === 'all' || p.category === filterCategory;
    const isOut = (p.stock ?? 0) <= 0 || p.sold_out;
    const isLow = (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10;

    let matchStatus = true;
    if (filterStatus === 'low') matchStatus = isLow;
    if (filterStatus === 'out') matchStatus = isOut;

    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Total Products */}
        <div className="p-4 rounded-2xl liquid-glass border border-white/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-muted text-xs">
            <span>{lang === 'th' ? 'รายการสินค้า' : 'Total Items'}</span>
            <Boxes className="h-4 w-4 text-forest" />
          </div>
          <div className="mt-2 font-display italic font-bold text-2xl text-forest">
            {totalItems}
          </div>
          <span className="text-[11px] text-ink-muted mt-0.5">
            {lang === 'th' ? 'ในฐานข้อมูล' : 'In catalog'}
          </span>
        </div>

        {/* 2. Total In-Stock Units */}
        <div className="p-4 rounded-2xl liquid-glass border border-white/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-muted text-xs">
            <span>{lang === 'th' ? 'จำนวนคงเหลือ' : 'Stock Units'}</span>
            <Package className="h-4 w-4 text-honey" />
          </div>
          <div className="mt-2 font-display italic font-bold text-2xl text-forest">
            {totalUnits}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            {lang === 'th' ? 'ถุง / ชิ้น พร้อมขาย' : 'Units available'}
          </span>
        </div>

        {/* 3. Low Stock Alert */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'low' ? 'all' : 'low')}
          className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition active:scale-95 ${
            filterStatus === 'low'
              ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-400'
              : 'liquid-glass border-amber-300/60 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
            <span>{lang === 'th' ? 'สต็อกใกล้หมด' : 'Low Stock'}</span>
            <AlertTriangle className="h-4 w-4 text-amber-600 animate-pulse" />
          </div>
          <div className="mt-2 font-display italic font-bold text-2xl text-amber-800">
            {lowStockCount}
          </div>
          <span className="text-[11px] text-amber-700 mt-0.5">
            {lang === 'th' ? 'เหลือน้อยกว่า 10 ชิ้น' : '< 10 units left'}
          </span>
        </div>

        {/* 4. Out of Stock */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'out' ? 'all' : 'out')}
          className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition active:scale-95 ${
            filterStatus === 'out'
              ? 'bg-chili/10 border-chili ring-2 ring-chili'
              : 'liquid-glass border-red-300/60 hover:border-red-400'
          }`}
        >
          <div className="flex items-center justify-between text-chili text-xs font-bold">
            <span>{lang === 'th' ? 'หมดสต็อก (Sold Out)' : 'Sold Out'}</span>
            <XCircle className="h-4 w-4 text-chili" />
          </div>
          <div className="mt-2 font-display italic font-bold text-2xl text-chili">
            {outOfStockCount}
          </div>
          <span className="text-[11px] text-chili/80 mt-0.5">
            {lang === 'th' ? 'ต้องเริ่มต้มสดใหม่' : 'Requires boiling'}
          </span>
        </div>
      </div>

      {/* Quick Bulk Batch Boiler Actions */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-forest via-forest to-forest-dark text-cream shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-honey text-forest flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-display italic font-bold text-sm sm:text-base leading-tight">
              {lang === 'th' ? 'เติมสต็อกหม้อต้มด่วน (One-Click Restock)' : 'One-Click Batch Restock'}
            </h4>
            <p className="text-xs text-cream/70 font-thai mt-0.5">
              {lang === 'th'
                ? 'เพิ่มสต็อกอัตโนมัติเมื่อต้มน้ำเต้าหู้หม้อเช้า หรือรอบเย็น'
                : 'Instantly add freshly boiled quantities across items'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={loading}
            onClick={() => bulkRestockCategory('drinks', 30)}
            className="h-9 px-3.5 rounded-full bg-honey text-forest font-bold text-xs flex items-center gap-1.5 shadow hover:bg-honey-dark transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{lang === 'th' ? 'ต้มน้ำเต้าหู้เช้า (+30 ทุกเมนู)' : 'Morning Batch (+30 Drinks)'}</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => bulkRestockCategory('snacks', 25)}
            className="h-9 px-3.5 rounded-full bg-white/20 hover:bg-white/30 text-cream font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{lang === 'th' ? 'ทอดปาท่องโก๋ (+25 ชิ้น)' : 'Restock Snacks (+25)'}</span>
          </button>

          <button
            type="button"
            onClick={loadProducts}
            title={lang === 'th' ? 'รีเฟรชสต็อก' : 'Refresh'}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-cream flex items-center justify-center transition active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'th'
                ? 'ค้นหาสินค้าเพื่อจัดการสต็อก...'
                : 'Search inventory by name...'
            }
            className="w-full h-10 rounded-full liquid-glass border border-white/60 pl-9 pr-4 text-xs focus:outline-none focus:border-forest"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 bg-black/5 p-1 rounded-full border border-forest/10 overflow-x-auto no-scrollbar shrink-0">
          {(
            [
              ['all', lang === 'th' ? 'ทั้งหมด' : 'All'],
              ['drinks', lang === 'th' ? 'เครื่องดื่ม' : 'Drinks'],
              ['snacks', lang === 'th' ? 'ของว่าง' : 'Snacks'],
            ] as const
          ).map(([c, label]) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setFilterCategory(c);
              }}
              className={`h-8 px-3 rounded-full text-xs font-bold transition active:scale-95 ${
                filterCategory === c
                  ? 'bg-forest text-cream shadow-xs'
                  : 'text-forest hover:bg-forest/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Products Table / List */}
      <div className="rounded-3xl liquid-glass border border-white/60 shadow-sm overflow-hidden">
        <div className="divide-y divide-forest/10">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-ink-muted text-sm">
              {lang === 'th' ? 'ไม่พบสินค้าตามเงื่อนไขที่เลือก' : 'No inventory items match filter.'}
            </div>
          ) : (
            filtered.map((item) => {
              const currentStock = Number(item.stock) || 0;
              const isOut = currentStock <= 0 || item.sold_out;
              const isLow = currentStock > 0 && currentStock <= 10;

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/40 transition"
                >
                  {/* Left: Product Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image_url}
                      alt={item.name_en}
                      className="h-14 w-14 rounded-2xl object-cover shrink-0 border border-forest/15 shadow-xs"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-thai font-bold text-sm text-forest truncate">
                          {lang === 'th' ? item.name_th : item.name_en}
                        </span>
                        <span className="text-xs text-ink-muted font-mono">
                          {baht(item.price)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-forest/10 text-forest">
                          {item.category}
                        </span>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2 mt-1">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-chili bg-chili/10 px-2 py-0.5 rounded-full">
                            <XCircle className="h-3 w-3" />
                            {lang === 'th' ? 'สินค้าหมด (Sold Out)' : 'Sold Out'}
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            {lang === 'th' ? 'สต็อกใกล้หมด' : 'Low Stock'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            {lang === 'th' ? 'มีจำหน่าย' : 'Available'}
                          </span>
                        )}

                        {/* Batch boil time preview */}
                        {item.next_batch_time && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                            <Clock className="h-3 w-3" />
                            <span>{item.next_batch_time}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity Adjusters & Batch Time Input */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                    {/* Batch Boil Time Selector */}
                    <div className="flex items-center gap-1.5 bg-cream/80 border border-forest/15 rounded-xl px-2 py-1">
                      <Clock className="h-3.5 w-3.5 text-forest/70 shrink-0" />
                      <input
                        type="text"
                        placeholder="06:30"
                        defaultValue={item.next_batch_time || ''}
                        onBlur={(e) => {
                          if (e.target.value !== item.next_batch_time) {
                            updateBatchTime(item.id, e.target.value);
                          }
                        }}
                        title={lang === 'th' ? 'เวลาต้มรอบถัดไป' : 'Next Batch Time'}
                        className="w-16 bg-transparent text-xs font-mono font-bold text-forest focus:outline-none"
                      />
                    </div>

                    {/* Stock Counter with + / - Buttons */}
                    <div className="flex items-center gap-1.5 bg-white rounded-2xl p-1 border border-forest/20 shadow-xs">
                      {/* Step -10 */}
                      <button
                        type="button"
                        onClick={() => updateProductStock(item.id, currentStock - 10)}
                        title="-10"
                        className="h-8 w-8 rounded-xl bg-forest/5 hover:bg-forest/15 text-forest font-bold text-xs flex items-center justify-center transition active:scale-95"
                      >
                        -10
                      </button>

                      {/* Step -1 */}
                      <button
                        type="button"
                        onClick={() => updateProductStock(item.id, currentStock - 1)}
                        title="-1"
                        className="h-8 w-8 rounded-xl bg-forest/10 hover:bg-forest/20 text-forest font-bold text-xs flex items-center justify-center transition active:scale-95"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      {/* Direct Numeric Input */}
                      <input
                        type="number"
                        min="0"
                        value={currentStock}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          updateProductStock(item.id, val);
                        }}
                        className="w-14 text-center font-mono font-bold text-sm text-forest focus:outline-none"
                      />

                      {/* Step +1 */}
                      <button
                        type="button"
                        onClick={() => updateProductStock(item.id, currentStock + 1)}
                        title="+1"
                        className="h-8 w-8 rounded-xl bg-forest/10 hover:bg-forest/20 text-forest font-bold text-xs flex items-center justify-center transition active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>

                      {/* Step +10 */}
                      <button
                        type="button"
                        onClick={() => updateProductStock(item.id, currentStock + 10)}
                        title="+10"
                        className="h-8 w-8 rounded-xl bg-honey/30 hover:bg-honey text-forest font-bold text-xs flex items-center justify-center transition active:scale-95"
                      >
                        +10
                      </button>
                    </div>

                    {/* Sold Out Toggle Button */}
                    <button
                      type="button"
                      onClick={() => updateProductStock(item.id, currentStock, !item.sold_out)}
                      className={`h-9 px-3 rounded-full text-xs font-bold transition active:scale-95 flex items-center gap-1.5 ${
                        item.sold_out
                          ? 'bg-chili text-cream shadow-xs'
                          : 'bg-emerald-700 text-cream hover:bg-emerald-800'
                      }`}
                    >
                      <span>{item.sold_out ? (lang === 'th' ? 'หมด' : 'Sold Out') : (lang === 'th' ? 'มีของ' : 'In Stock')}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
