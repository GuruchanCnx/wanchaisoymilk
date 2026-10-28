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
  ClipboardPaste,
  Wheat,
  Milk,
  Scale,
  Flame,
  Coffee,
  Edit2,
  Filter,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import type { Product, IngredientItem } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';
import { baht } from '../lib/format';
import {
  loadIngredients,
  saveIngredients,
  updateIngredientStock,
  getLowStockIngredients,
} from '../lib/ingredients';
import BatchInventoryUpdateModal from './BatchInventoryUpdateModal';
import SmoothScrollMenu from './SmoothScrollMenu';

export default function InventoryManager() {
  const { lang } = useLang();
  const { showToast } = useToast();

  // Primary Sub-Tab Switcher: 'ingredients' vs 'products'
  const [subTab, setSubTab] = useState<'ingredients' | 'products'>('ingredients');

  // Finished Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'drinks' | 'snacks'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out'>('all');

  // Ingredients State
  const [ingredients, setIngredients] = useState<IngredientItem[]>(() => loadIngredients());
  const [ingredientFilter, setIngredientFilter] = useState<'all' | 'low' | 'raw_materials' | 'dairy_liquids' | 'dry_goods' | 'packaging'>('all');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [editingIngredient, setEditingIngredient] = useState<IngredientItem | null>(null);
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);

  // New Ingredient Form State
  const [newIngForm, setNewIngForm] = useState<Partial<IngredientItem>>({
    name_th: '',
    name_en: '',
    category: 'raw_materials',
    current_stock: 10,
    min_threshold: 5,
    unit: 'kg (กก.)',
    notes: '',
  });

  // Listen for cross-component / POS updates to ingredient inventory
  useEffect(() => {
    const handleUpdate = () => {
      setIngredients(loadIngredients());
    };
    window.addEventListener('ingredient_inventory_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ingredient_inventory_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Load Finished Products from API
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Failed to load inventory', e);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handle Finished Product Stock Update
  const updateProductStock = async (id: number, newStock: number, soldOut?: boolean) => {
    setSavingId(id);
    triggerHaptic('light');

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
          lang === 'th'
            ? `สินค้า #${id} มีคงเหลือ ${Math.max(0, newStock)} ชิ้น`
            : `Item #${id} now has ${Math.max(0, newStock)} in stock`,
          'success'
        );
      }
    } catch (err) {
      console.warn('Failed to update stock', err);
    } finally {
      setSavingId(null);
    }
  };

  // Handle Ingredient Stock Adjustment
  const handleAdjustIngredient = (id: string, delta: number) => {
    triggerHaptic('tap');
    const target = ingredients.find((i) => i.id === id);
    if (!target) return;
    const nextVal = Math.max(0, Math.round((target.current_stock + delta) * 10) / 10);
    const updated = updateIngredientStock(id, nextVal);
    setIngredients(updated);

    if (nextVal <= target.min_threshold) {
      showToast(
        lang === 'th' ? '⚠️ แจ้งเตือนวัตถุดิบใกล้หมด!' : '⚠️ Low Stock Alert!',
        lang === 'th'
          ? `${target.name_th} เหลือเพียง ${nextVal} ${target.unit}`
          : `${target.name_en} is down to ${nextVal} ${target.unit}`,
        'warning'
      );
    }
  };

  const handleSetIngredientDirect = (id: string, value: number) => {
    const safeVal = Math.max(0, Number(value) || 0);
    const updated = updateIngredientStock(id, safeVal);
    setIngredients(updated);
  };

  // Save changes to ingredient threshold or details
  const handleSaveIngredientEdit = () => {
    if (!editingIngredient) return;
    triggerHaptic('medium');
    const updated = ingredients.map((item) =>
      item.id === editingIngredient.id
        ? { ...editingIngredient, last_updated: new Date().toISOString() }
        : item
    );
    saveIngredients(updated);
    setIngredients(updated);
    setEditingIngredient(null);
    showToast(
      lang === 'th' ? 'บันทึกเกณฑ์วัตถุดิบสำเร็จ' : 'Ingredient Threshold Saved',
      lang === 'th' ? 'เกณฑ์แจ้งเตือนสต็อกต่ำถูกอัปเดตเรียบร้อย' : 'Low stock notification rules updated',
      'success'
    );
  };

  // Add new ingredient
  const handleAddNewIngredient = () => {
    if (!newIngForm.name_th || !newIngForm.unit) {
      showToast(
        lang === 'th' ? 'กรุณากรอกชื่อและหน่วยวัตถุดิบ' : 'Please provide name and unit',
        '',
        'warning'
      );
      return;
    }
    triggerHaptic('success');
    const newId = `ing-${Date.now().toString(36)}`;
    const newEntry: IngredientItem = {
      id: newId,
      name_th: newIngForm.name_th || 'วัตถุดิบใหม่',
      name_en: newIngForm.name_en || newIngForm.name_th || 'New Ingredient',
      category: (newIngForm.category as any) || 'raw_materials',
      current_stock: Number(newIngForm.current_stock) || 0,
      min_threshold: Number(newIngForm.min_threshold) || 5,
      unit: newIngForm.unit || 'กก.',
      notes: newIngForm.notes || '',
      last_updated: new Date().toISOString(),
    };

    const nextList = [...ingredients, newEntry];
    saveIngredients(nextList);
    setIngredients(nextList);
    setIsAddIngredientOpen(false);
    setNewIngForm({
      name_th: '',
      name_en: '',
      category: 'raw_materials',
      current_stock: 10,
      min_threshold: 5,
      unit: 'kg (กก.)',
      notes: '',
    });

    showToast(
      lang === 'th' ? 'เพิ่มวัตถุดิบใหม่สำเร็จ' : 'Ingredient Added',
      `${newEntry.name_th} (${newEntry.current_stock} ${newEntry.unit})`,
      'success'
    );
  };

  // Ingredient Metrics
  const lowStockIngredients = getLowStockIngredients(ingredients);
  const criticalIngredients = ingredients.filter(
    (i) => i.current_stock <= i.min_threshold / 2 || i.current_stock <= 0
  );

  // Filtered Ingredients
  const filteredIngredients = ingredients.filter((item) => {
    const matchSearch = (item.name_th + item.name_en + (item.notes || ''))
      .toLowerCase()
      .includes(ingredientSearch.toLowerCase());
    let matchFilter = true;
    if (ingredientFilter === 'low') matchFilter = item.current_stock <= item.min_threshold;
    else if (ingredientFilter !== 'all') matchFilter = item.category === ingredientFilter;
    return matchSearch && matchFilter;
  });

  // Finished Product Metrics
  const totalItems = products.length;
  const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const lowStockProductsCount = products.filter(
    (p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10
  ).length;
  const outOfStockProductsCount = products.filter(
    (p) => (p.stock ?? 0) <= 0 || p.sold_out
  ).length;

  // Filtered Products
  const filteredProducts = products.filter((p) => {
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
      {/* Header Banner & Primary Sub-Tab Switcher */}
      <div className="p-4 sm:p-5 rounded-3xl liquid-glass border border-white/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-forest text-honey flex items-center justify-center shrink-0 shadow-xs">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display italic font-bold text-forest text-xl sm:text-2xl leading-none">
                {lang === 'th' ? 'ระบบคลังสต็อก & วัตถุดิบวันใจ' : 'Wanchai Inventory & Stock Control'}
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                {lang === 'th'
                  ? 'ตรวจสอบระดับวัตถุดิบและแจ้งเตือนไปยังเครื่องคิดเงิน POS แบบเรียลไทม์'
                  : 'Track raw ingredient levels and trigger live low-stock alerts on POS register'}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Tab Navigation Toggle */}
        <div className="inline-flex rounded-full bg-forest/10 p-1 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              setSubTab('ingredients');
            }}
            className={`h-9 px-4 rounded-full text-xs font-bold flex items-center gap-2 transition ${
              subTab === 'ingredients'
                ? 'bg-forest text-cream shadow-xs'
                : 'text-forest hover:bg-forest/10'
            }`}
          >
            <Wheat className="h-3.5 w-3.5 text-honey" />
            <span>{lang === 'th' ? 'วัตถุดิบ & บรรจุภัณฑ์' : 'Ingredient Levels'}</span>
            {lowStockIngredients.length > 0 && (
              <span className="h-4.5 min-w-4.5 px-1.5 rounded-full bg-terracotta text-cream text-[10px] font-black animate-pulse">
                {lowStockIngredients.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              setSubTab('products');
            }}
            className={`h-9 px-4 rounded-full text-xs font-bold flex items-center gap-2 transition ${
              subTab === 'products'
                ? 'bg-forest text-cream shadow-xs'
                : 'text-forest hover:bg-forest/10'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>{lang === 'th' ? 'สินค้าสำเร็จรูปหน้าร้าน' : 'Finished Products'}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: INGREDIENT LEVELS & LOW-STOCK POS NOTIFICATIONS      */}
      {/* ============================================================== */}
      {subTab === 'ingredients' && (
        <div className="space-y-6">
          {/* Overview Metric Cards for Ingredients */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Tracked Ingredients */}
            <div className="p-4 rounded-2xl liquid-glass border border-white/60 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-ink-muted text-xs">
                <span>{lang === 'th' ? 'วัตถุดิบทั้งหมด' : 'Total Ingredients'}</span>
                <Wheat className="h-4 w-4 text-forest" />
              </div>
              <div className="mt-2 font-display italic font-bold text-2xl text-forest">
                {ingredients.length}
              </div>
              <span className="text-[11px] text-ink-muted mt-0.5">
                {lang === 'th' ? 'รายการวัตถุดิบ & แพ็กเกจ' : 'Tracked supplies'}
              </span>
            </div>

            {/* Low-Stock Alert (Triggers POS warning) */}
            <div
              onClick={() => {
                triggerHaptic('tap');
                setIngredientFilter(ingredientFilter === 'low' ? 'all' : 'low');
              }}
              className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition active:scale-95 ${
                lowStockIngredients.length > 0
                  ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-400/50'
                  : 'liquid-glass border-white/60'
              }`}
            >
              <div className="flex items-center justify-between text-amber-900 text-xs font-bold">
                <span>{lang === 'th' ? 'ใกล้หมด (แจ้งเตือน POS)' : 'Low Stock (Alerts POS)'}</span>
                <AlertTriangle className="h-4 w-4 text-amber-600 animate-pulse" />
              </div>
              <div className="mt-2 font-display italic font-bold text-2xl text-amber-900">
                {lowStockIngredients.length}
              </div>
              <span className="text-[11px] text-amber-800 font-semibold mt-0.5">
                {lang === 'th' ? 'ถึงเกณฑ์สั่งซื้อเพิ่มทันที' : 'Needs reordering'}
              </span>
            </div>

            {/* Critical / Out of Stock */}
            <div className="p-4 rounded-2xl liquid-glass border border-white/60 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-ink-muted text-xs">
                <span>{lang === 'th' ? 'วิกฤต / หมด' : 'Critical Low'}</span>
                <TrendingDown className="h-4 w-4 text-chili" />
              </div>
              <div className="mt-2 font-display italic font-bold text-2xl text-chili">
                {criticalIngredients.length}
              </div>
              <span className="text-[11px] text-chili font-semibold mt-0.5">
                {lang === 'th' ? 'สต็อกเหลือน้อยกว่า 50%' : '< 50% threshold'}
              </span>
            </div>

            {/* In-Stock Healthy */}
            <div className="p-4 rounded-2xl liquid-glass border border-white/60 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-ink-muted text-xs">
                <span>{lang === 'th' ? 'สต็อกปกติ' : 'Healthy Stock'}</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 font-display italic font-bold text-2xl text-forest">
                {ingredients.length - lowStockIngredients.length}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                {lang === 'th' ? 'พร้อมใช้งานหน้าร้าน' : 'Ready for service'}
              </span>
            </div>
          </div>

          {/* POS Live Alert Notice Box */}
          {lowStockIngredients.length > 0 && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-400 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500 text-cream flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">
                    {lang === 'th'
                      ? `กำลังแจ้งเตือนสต็อกต่ำไปยังเครื่องคิดเงิน POS (${lowStockIngredients.length} รายการ)`
                      : `Live Low-Stock Alert Active on POS Terminal (${lowStockIngredients.length} items)`}
                  </div>
                  <div className="text-xs text-amber-900/80 mt-0.5">
                    {lowStockIngredients.map((i) => `${i.name_th} (${i.current_stock} ${i.unit})`).join(' • ')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setIngredientFilter('low');
                }}
                className="h-8 px-3 rounded-full bg-amber-900 text-cream text-xs font-bold hover:bg-amber-950 transition active:scale-95 shrink-0"
              >
                {lang === 'th' ? 'กรองเฉพาะรายการนี้' : 'Filter Low Items'}
              </button>
            </div>
          )}

          {/* Controls: Search, Filter Tabs, Add Ingredient */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
                placeholder={
                  lang === 'th'
                    ? 'ค้นหาวัตถุดิบ เช่น ถั่วเหลือง, นมวัวสด, ถุงร้อน...'
                    : 'Search ingredients: Soybeans, milk, cups...'
                }
                className="w-full h-11 pl-9 pr-4 rounded-full liquid-glass border border-white/60 text-forest text-xs sm:text-sm focus:outline-none focus:border-forest"
              />
            </div>

            {/* Add Ingredient Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setIsAddIngredientOpen(true);
              }}
              className="h-11 px-4.5 rounded-full bg-forest text-cream font-bold text-xs flex items-center justify-center gap-2 hover:bg-forest-dark transition active:scale-95 shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4 text-honey" />
              <span>{lang === 'th' ? 'เพิ่มวัตถุดิบใหม่' : 'Add Ingredient'}</span>
            </button>
          </div>

          {/* Smooth Scrollable Category Filter Menu */}
          <SmoothScrollMenu arrowTheme="forest">
            <div className="inline-flex gap-2 py-1">
              {[
                { id: 'all', labelTh: 'ทั้งหมด', labelEn: 'All' },
                { id: 'low', labelTh: `⚠️ ใกล้หมด (${lowStockIngredients.length})`, labelEn: `⚠️ Low (${lowStockIngredients.length})` },
                { id: 'raw_materials', labelTh: '🌱 วัตถุดิบหลัก', labelEn: '🌱 Raw Materials' },
                { id: 'dairy_liquids', labelTh: '🥛 นมสด & ของเหลว', labelEn: '🥛 Dairy & Liquids' },
                { id: 'dry_goods', labelTh: '🌾 แป้ง & น้ำตาล', labelEn: '🌾 Dry Goods' },
                { id: 'packaging', labelTh: '🛍️ บรรจุภัณฑ์', labelEn: '🛍️ Packaging' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setIngredientFilter(c.id as any);
                  }}
                  className={`h-9 px-4 rounded-full text-xs font-bold transition active:scale-95 shrink-0 flex items-center gap-1.5 ${
                    ingredientFilter === c.id
                      ? 'bg-forest text-cream shadow-xs'
                      : 'liquid-glass border border-white/60 text-forest hover:bg-forest/10'
                  }`}
                >
                  {lang === 'th' ? c.labelTh : c.labelEn}
                </button>
              ))}
            </div>
          </SmoothScrollMenu>

          {/* Ingredient Items List */}
          <div className="space-y-3">
            {filteredIngredients.length === 0 ? (
              <div className="p-8 rounded-3xl liquid-glass border border-white/60 text-center">
                <Wheat className="h-8 w-8 text-forest/40 mx-auto mb-2" />
                <p className="text-forest font-bold text-sm">
                  {lang === 'th' ? 'ไม่พบรายการวัตถุดิบที่ตรงกับการค้นหา' : 'No ingredients matched'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIngredientFilter('all');
                    setIngredientSearch('');
                  }}
                  className="mt-3 text-xs font-bold text-terracotta hover:underline"
                >
                  {lang === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Reset filters'}
                </button>
              </div>
            ) : (
              filteredIngredients.map((item) => {
                const isLow = item.current_stock <= item.min_threshold;
                const isCritical =
                  item.current_stock <= item.min_threshold / 2 || item.current_stock <= 0;
                const ratio = Math.min(
                  100,
                  Math.round((item.current_stock / (item.min_threshold * 2)) * 100)
                );

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isCritical
                        ? 'bg-red-500/10 border-red-300'
                        : isLow
                        ? 'bg-amber-500/10 border-amber-300'
                        : 'liquid-glass border-white/70'
                    }`}
                  >
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display italic font-bold text-forest text-base sm:text-lg">
                          {lang === 'th' ? item.name_th : item.name_en}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase font-mono ${
                            isCritical
                              ? 'bg-chili text-cream animate-pulse'
                              : isLow
                              ? 'bg-amber-500 text-cream'
                              : 'bg-emerald-600 text-cream'
                          }`}
                        >
                          {isCritical
                            ? lang === 'th'
                              ? 'วิกฤต (Critical)'
                              : 'Critical'
                            : isLow
                            ? lang === 'th'
                              ? 'ใกล้หมด (Low)'
                              : 'Low'
                            : lang === 'th'
                            ? 'ปกติ (Normal)'
                            : 'Healthy'}
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest/10 text-forest font-semibold">
                          {item.category === 'raw_materials'
                            ? '🌱 วัตถุดิบหลัก'
                            : item.category === 'dairy_liquids'
                            ? '🥛 นมสด & ของเหลว'
                            : item.category === 'dry_goods'
                            ? '🌾 แป้ง & น้ำตาล'
                            : '🛍️ บรรจุภัณฑ์'}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-ink-muted mt-1 truncate">
                          {item.notes}
                        </p>
                      )}

                      {/* Stock Level Progress Bar */}
                      <div className="mt-2.5 max-w-md">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-ink-muted">
                            {lang === 'th' ? 'คงเหลือ:' : 'Stock:'}{' '}
                            <strong className="text-forest text-xs font-mono">
                              {item.current_stock}
                            </strong>{' '}
                            {item.unit}
                          </span>
                          <span className="text-ink-muted font-mono">
                            {lang === 'th' ? 'เกณฑ์เตือน POS:' : 'Alert Min:'}{' '}
                            <strong>{item.min_threshold}</strong> {item.unit}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-forest/10 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              isCritical
                                ? 'bg-chili'
                                : isLow
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${Math.max(5, ratio)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stock Steppers and Quick Action Controls */}
                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      {/* Step -10 */}
                      <button
                        type="button"
                        onClick={() => handleAdjustIngredient(item.id, -10)}
                        title="-10"
                        className="h-9 w-9 rounded-xl bg-forest/5 hover:bg-forest/15 text-forest font-bold text-xs flex items-center justify-center transition active:scale-90"
                      >
                        -10
                      </button>

                      {/* Step -1 */}
                      <button
                        type="button"
                        onClick={() => handleAdjustIngredient(item.id, -1)}
                        title="-1"
                        className="h-9 w-9 rounded-xl bg-forest/10 hover:bg-forest/20 text-forest font-bold text-xs flex items-center justify-center transition active:scale-90"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      {/* Direct Numeric Input with Unit */}
                      <div className="flex items-center gap-1 bg-white/90 border border-forest/20 rounded-xl px-2 py-1 shadow-2xs">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={item.current_stock}
                          onChange={(e) =>
                            handleSetIngredientDirect(item.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-14 text-center font-mono font-bold text-sm text-forest focus:outline-none"
                        />
                        <span className="text-[10px] text-ink-muted font-mono">{item.unit}</span>
                      </div>

                      {/* Step +1 */}
                      <button
                        type="button"
                        onClick={() => handleAdjustIngredient(item.id, 1)}
                        title="+1"
                        className="h-9 w-9 rounded-xl bg-forest/10 hover:bg-forest/20 text-forest font-bold text-xs flex items-center justify-center transition active:scale-90"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>

                      {/* Step +10 */}
                      <button
                        type="button"
                        onClick={() => handleAdjustIngredient(item.id, 10)}
                        title="+10"
                        className="h-9 w-9 rounded-xl bg-honey/30 hover:bg-honey text-forest font-bold text-xs flex items-center justify-center transition active:scale-90"
                      >
                        +10
                      </button>

                      {/* Edit Threshold & Config Button */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setEditingIngredient(item);
                        }}
                        title={lang === 'th' ? 'แก้ไขเกณฑ์เตือนสต็อก' : 'Edit Alert Threshold'}
                        className="h-9 w-9 rounded-xl liquid-pill text-forest hover:bg-forest/10 flex items-center justify-center transition active:scale-90 border border-forest/20 ml-1"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: FINISHED PRODUCTS & BATCH INVENTORY MANAGER         */}
      {/* ============================================================== */}
      {subTab === 'products' && (
        <div className="space-y-6">
          {/* Overview Metric Cards for Products */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                {lowStockProductsCount}
              </div>
              <span className="text-[11px] text-amber-700 mt-0.5">
                {lang === 'th' ? 'เหลือน้อยกว่า 10 ชิ้น' : '< 10 units left'}
              </span>
            </div>

            <div
              onClick={() => setFilterStatus(filterStatus === 'out' ? 'all' : 'out')}
              className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition active:scale-95 ${
                filterStatus === 'out'
                  ? 'bg-chili/10 border-chili ring-2 ring-chili'
                  : 'liquid-glass border-red-300/60 hover:border-red-400'
              }`}
            >
              <div className="flex items-center justify-between text-chili text-xs font-bold">
                <span>{lang === 'th' ? 'สินค้าหมด' : 'Out of Stock'}</span>
                <XCircle className="h-4 w-4" />
              </div>
              <div className="mt-2 font-display italic font-bold text-2xl text-chili">
                {outOfStockProductsCount}
              </div>
              <span className="text-[11px] text-chili mt-0.5">
                {lang === 'th' ? 'ต้องเริ่มต้มหม้อใหม่' : 'Needs boiling'}
              </span>
            </div>
          </div>

          {/* Quick Bulk Restock & Batch Paste Actions */}
          <div className="p-4 rounded-3xl liquid-glass border border-white/60 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-honey" />
              <span className="text-xs font-bold text-forest uppercase tracking-wider">
                {lang === 'th' ? 'เติมสต็อกด่วนตามหมวดหมู่:' : 'Quick Bulk Restock:'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Batch Update via Paste Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setIsBatchModalOpen(true);
                }}
                className="h-9 px-3.5 rounded-full bg-honey hover:bg-honey-dark text-forest font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
              >
                <ClipboardPaste className="h-4 w-4" />
                <span>{lang === 'th' ? 'วางรายการอัปเดตสต็อก (Batch Paste)' : 'Paste List Batch Update'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.category === 'drinks' ? { ...p, stock: (p.stock || 0) + 20, sold_out: false } : p
                    )
                  );
                }}
                className="h-9 px-3.5 rounded-full bg-forest text-cream font-bold text-xs flex items-center gap-1.5 shadow-xs hover:bg-forest-dark transition active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{lang === 'th' ? 'เครื่องดื่ม +20 ถุง' : 'Drinks +20 Bags'}</span>
              </button>

              <button
                type="button"
                onClick={loadProducts}
                className="h-9 w-9 rounded-full bg-white/80 border border-forest/20 text-forest flex items-center justify-center hover:bg-forest/10 transition active:scale-95"
                title="Reload"
              >
                <RefreshCw className={`h-4 w-4 ${loadingProducts ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Product Items List */}
          <div className="space-y-3">
            {filteredProducts.map((item) => {
              const currentStock = Number(item.stock) || 0;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl liquid-glass border border-white/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display italic font-bold text-forest text-base sm:text-lg">
                        {lang === 'th' ? item.name_th : item.name_en}
                      </span>
                      <span className="text-xs text-ink-muted">· {baht(item.price)}</span>
                      {item.sold_out && (
                        <span className="px-2 py-0.5 rounded-full bg-chili text-cream text-[10px] font-bold">
                          {lang === 'th' ? 'หมด' : 'Sold Out'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateProductStock(item.id, currentStock - 1)}
                      className="h-8 w-8 rounded-xl bg-forest/10 hover:bg-forest/20 text-forest font-bold text-xs flex items-center justify-center transition active:scale-95"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>

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

                    <button
                      type="button"
                      onClick={() => updateProductStock(item.id, currentStock + 1)}
                      className="h-8 w-8 rounded-xl bg-forest/10 hover:bg-forest/20 text-forest font-bold text-xs flex items-center justify-center transition active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => updateProductStock(item.id, currentStock, !item.sold_out)}
                      className={`h-9 px-3 rounded-full text-xs font-bold transition active:scale-95 flex items-center gap-1.5 ${
                        item.sold_out
                          ? 'bg-chili text-cream shadow-xs'
                          : 'bg-emerald-700 text-cream hover:bg-emerald-800'
                      }`}
                    >
                      <span>
                        {item.sold_out
                          ? lang === 'th'
                            ? 'หมด'
                            : 'Sold Out'
                          : lang === 'th'
                          ? 'มีของ'
                          : 'In Stock'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT INGREDIENT THRESHOLD & ALERT SETTINGS              */}
      {/* ============================================================== */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-cream border border-forest/20 shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display italic font-bold text-forest text-lg">
                {lang === 'th' ? 'ตั้งค่าเกณฑ์แจ้งเตือนสต็อก' : 'Configure Alert Threshold'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingIngredient(null)}
                className="h-8 w-8 rounded-full bg-forest/10 flex items-center justify-center text-forest"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-forest">
                  {lang === 'th' ? 'ชื่อวัตถุดิบ (ภาษาไทย)' : 'Ingredient Name (TH)'}
                </label>
                <input
                  type="text"
                  value={editingIngredient.name_th}
                  onChange={(e) =>
                    setEditingIngredient({ ...editingIngredient, name_th: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-sm text-forest mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-forest">
                  {lang === 'th' ? 'ชื่อภาษาอังกฤษ' : 'English Name'}
                </label>
                <input
                  type="text"
                  value={editingIngredient.name_en}
                  onChange={(e) =>
                    setEditingIngredient({ ...editingIngredient, name_en: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-sm text-forest mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-amber-800">
                    {lang === 'th' ? 'เกณฑ์เตือน POS (Min)' : 'POS Alert Threshold'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={editingIngredient.min_threshold}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        min_threshold: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-amber-300 bg-amber-50 text-sm font-mono font-bold text-amber-950 mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-forest">
                    {lang === 'th' ? 'หน่วยนับ' : 'Unit'}
                  </label>
                  <input
                    type="text"
                    value={editingIngredient.unit}
                    onChange={(e) =>
                      setEditingIngredient({ ...editingIngredient, unit: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-sm text-forest mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-forest">
                  {lang === 'th' ? 'แหล่งที่มา / บันทึกย่อ' : 'Supplier / Origin Notes'}
                </label>
                <input
                  type="text"
                  value={editingIngredient.notes || ''}
                  onChange={(e) =>
                    setEditingIngredient({ ...editingIngredient, notes: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-sm text-forest mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingIngredient(null)}
                className="h-10 px-4 rounded-full text-xs font-bold text-ink-muted hover:bg-forest/10 transition"
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveIngredientEdit}
                className="h-10 px-5 rounded-full bg-forest text-cream font-bold text-xs hover:bg-forest-dark transition active:scale-95 shadow-sm"
              >
                {lang === 'th' ? 'บันทึกเกณฑ์' : 'Save Threshold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD NEW INGREDIENT                                      */}
      {/* ============================================================== */}
      {isAddIngredientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-cream border border-forest/20 shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display italic font-bold text-forest text-lg flex items-center gap-2">
                <Wheat className="h-5 w-5 text-honey" />
                <span>{lang === 'th' ? 'เพิ่มวัตถุดิบ & บรรจุภัณฑ์ใหม่' : 'Add New Raw Supply'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddIngredientOpen(false)}
                className="h-8 w-8 rounded-full bg-forest/10 flex items-center justify-center text-forest"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-forest">
                  {lang === 'th' ? 'ชื่อวัตถุดิบ (ภาษาไทย) *' : 'Name (TH) *'}
                </label>
                <input
                  type="text"
                  placeholder="เช่น ถั่วดำคั่ว, นมอัลมอนด์สด"
                  value={newIngForm.name_th}
                  onChange={(e) => setNewIngForm({ ...newIngForm, name_th: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-sm text-forest mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-forest">
                  {lang === 'th' ? 'ชื่อภาษาอังกฤษ' : 'Name (EN)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Roasted Black Beans"
                  value={newIngForm.name_en}
                  onChange={(e) => setNewIngForm({ ...newIngForm, name_en: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-sm text-forest mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-forest">
                  {lang === 'th' ? 'หมวดหมู่วัตถุดิบ' : 'Category'}
                </label>
                <select
                  value={newIngForm.category}
                  onChange={(e) => setNewIngForm({ ...newIngForm, category: e.target.value as any })}
                  className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-sm text-forest mt-1"
                >
                  <option value="raw_materials">🌱 วัตถุดิบหลัก (Raw Materials)</option>
                  <option value="dairy_liquids">🥛 นมสด & ของเหลว (Dairy & Liquids)</option>
                  <option value="dry_goods">🌾 แป้ง & น้ำตาล (Dry Goods)</option>
                  <option value="packaging">🛍️ บรรจุภัณฑ์ & แก้ว (Packaging)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-forest">
                    {lang === 'th' ? 'สต็อกตั้งต้น' : 'Current'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newIngForm.current_stock}
                    onChange={(e) =>
                      setNewIngForm({ ...newIngForm, current_stock: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-sm font-mono mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-amber-800">
                    {lang === 'th' ? 'เกณฑ์เตือน' : 'Alert Min'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={newIngForm.min_threshold}
                    onChange={(e) =>
                      setNewIngForm({ ...newIngForm, min_threshold: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-amber-300 bg-amber-50 text-sm font-mono mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-forest">
                    {lang === 'th' ? 'หน่วยนับ' : 'Unit'}
                  </label>
                  <input
                    type="text"
                    placeholder="กก., ลิตร, ถุง"
                    value={newIngForm.unit}
                    onChange={(e) => setNewIngForm({ ...newIngForm, unit: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-forest">
                  {lang === 'th' ? 'แหล่งที่มา / บันทึกย่อ' : 'Origin / Notes'}
                </label>
                <input
                  type="text"
                  placeholder="เช่น สั่งตรงจากสวนอินทรีย์แม่แตง"
                  value={newIngForm.notes}
                  onChange={(e) => setNewIngForm({ ...newIngForm, notes: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-sm text-forest mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddIngredientOpen(false)}
                className="h-10 px-4 rounded-full text-xs font-bold text-ink-muted hover:bg-forest/10 transition"
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAddNewIngredient}
                className="h-10 px-5 rounded-full bg-forest text-cream font-bold text-xs hover:bg-forest-dark transition active:scale-95 shadow-sm"
              >
                {lang === 'th' ? 'เพิ่มเข้าระบบ' : 'Add to Inventory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Inventory Paste & Import Modal */}
      <BatchInventoryUpdateModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        products={products}
        onBatchUpdated={loadProducts}
      />
    </div>
  );
}
