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
  QrCode,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  Banknote,
  Sparkles,
  Layers,
  Activity,
  Zap,
  AlertTriangle,
  X,
  Wheat,
} from 'lucide-react';
import type { Order, Product, OrderItem } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { baht, shortId, timeAgo } from '../lib/format';
import LanguageToggle from '../components/LanguageToggle';
import PosDialPad from '../components/PosDialPad';
import PosQrScannerModal from '../components/PosQrScannerModal';
import SmoothScrollMenu from '../components/SmoothScrollMenu';
import {
  loadIngredients,
  getLowStockIngredients,
  type IngredientItem,
} from '../lib/ingredients';
import { useFoldableSpanning } from '../hooks/useFoldableSpanning';
import {
  applyQuickHapticPattern,
  getCurrentQuickPattern,
  type HapticQuickPattern,
  triggerHaptic,
} from '../lib/haptics';
import { useToast } from '../contexts/ToastContext';
import {
  playSuccessChime,
  playClickCue,
  playAlertCue,
  isSoundEnabled,
  setSoundEnabled,
} from '../lib/sound';

interface ActiveCartItem extends OrderItem {
  id: string;
}

export default function POS() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sound, setSound] = useState(() => isSoundEnabled());
  const [lastCount, setLastCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'register' | 'kitchen'>('register');
  const [showDialPad, setShowDialPad] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [currentPattern, setCurrentPattern] = useState<HapticQuickPattern>(() => getCurrentQuickPattern());

  // Active Register State for 2-column Tablet Layout
  const [cart, setCart] = useState<ActiveCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'drinks' | 'snacks'>('all');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'promptpay'>('cash');
  const [receivedCash, setReceivedCash] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ingredient Inventory & Low-Stock Alerts for POS
  const [ingredients, setIngredients] = useState<IngredientItem[]>(() => loadIngredients());
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [isLowStockBannerDismissed, setIsLowStockBannerDismissed] = useState(false);
  const lowStockIngredients = getLowStockIngredients(ingredients);

  // Hook for foldable dual-screen devices
  const { isSpanned, wrapperRef } = useFoldableSpanning<HTMLElement>();

  // Load orders
  const loadOrders = useCallback(async () => {
    try {
      const data = await fetch('/api/orders').then((r) => r.json());
      const list: Order[] = Array.isArray(data) ? data : [];
      const active = list.filter((o) => ['pending', 'paid', 'preparing'].includes(o.status));

      if (active.length > lastCount && sound && lastCount > 0) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.value = 880;
          g.gain.value = 0.2;
          o.start();
          setTimeout(() => o.stop(), 240);
          navigator.vibrate?.(80);
        } catch {}
      }
      setLastCount(active.length);
      setOrders(list);
    } catch {}
  }, [lastCount, sound]);

  // Load products for product selection menu
  const loadProducts = useCallback(async () => {
    try {
      const data = await fetch('/api/products').then((r) => r.json());
      setProducts(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => {
    loadOrders();
    loadProducts();
    const iv = setInterval(loadOrders, 5000);
    return () => clearInterval(iv);
  }, [loadOrders, loadProducts]);

  // Sync Ingredient Inventory and alert POS on low stock
  useEffect(() => {
    const handleIngredientSync = () => {
      const latest = loadIngredients();
      const prevLowCount = getLowStockIngredients(ingredients).length;
      const nextLowCount = getLowStockIngredients(latest).length;
      setIngredients(latest);

      if (nextLowCount > prevLowCount && nextLowCount > 0) {
        playAlertCue();
        triggerHaptic('warning');
        showToast(
          lang === 'th' ? '⚠️ แจ้งเตือน: วัตถุดิบใกล้หมด' : '⚠️ Alert: Ingredient Low-Stock',
          lang === 'th' ? `พบวัตถุดิบถึงเกณฑ์สั่งซื้อ ${nextLowCount} รายการ` : `${nextLowCount} raw ingredients need reordering`,
          'warning'
        );
      }
    };

    window.addEventListener('ingredient_inventory_updated', handleIngredientSync);
    window.addEventListener('storage', handleIngredientSync);
    const interval = setInterval(handleIngredientSync, 8000);
    return () => {
      window.removeEventListener('ingredient_inventory_updated', handleIngredientSync);
      window.removeEventListener('storage', handleIngredientSync);
      clearInterval(interval);
    };
  }, [ingredients, lang, showToast]);

  // Status transitions
  const update = async (id: number, patch: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? ({ ...o, ...patch } as Order) : o)));
    await fetch('/api/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });

    if (patch.status === 'preparing') {
      showToast(
        lang === 'th' ? `ออเดอร์ #${id} กำลังต้มสด 🔥` : `Order #${id} now simmering 🔥`,
        lang === 'th' ? 'ส่งสัญญาณแจ้งเตือนลูกค้าเรียบร้อย' : 'Live notification sent to customer',
        'info'
      );
    } else if (patch.status === 'ready') {
      playAlertCue();
      showToast(
        lang === 'th' ? `ออเดอร์ #${id} พร้อมรับแล้ว! ✨` : `Order #${id} is Ready! ✨`,
        lang === 'th' ? 'ส่งกระดิ่งและเสียงเตือนเรียกลูกค้า' : 'Customer alerted for pickup',
        'success'
      );
    }
  };

  // Register Handlers
  const addToCart = (product: Product) => {
    triggerHaptic('medium');
    playClickCue();
    const existingIndex = cart.findIndex((item) => item.product_id === product.id);

    if (existingIndex > -1) {
      setCart((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      const newItem: ActiveCartItem = {
        id: `pos-${product.id}-${Date.now()}`,
        product_id: product.id,
        slug: product.slug,
        name_th: product.name_th,
        name_en: product.name_en,
        qty: 1,
        unit_price: product.price,
        vessel: product.category === 'drinks' ? 'bag' : 'box',
        sweetness: '100%',
        temp: 'hot',
        extras: [],
      };
      setCart((prev) => [...prev, newItem]);
    }
  };

  const updateCartQty = (id: string, delta: number) => {
    triggerHaptic('light');
    playClickCue();
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as ActiveCartItem[]
    );
  };

  const removeCartItem = (id: string) => {
    triggerHaptic('medium');
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    triggerHaptic('tap');
    setCart([]);
    setReceivedCash(null);
    setCustomerName('');
  };

  // Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.unit_price * item.qty, 0);
  const totalCartCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const changeDue = receivedCash !== null && receivedCash >= cartSubtotal ? receivedCash - cartSubtotal : 0;

  // Complete Order
  const handleChargeOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    triggerHaptic('success');

    try {
      const newOrderPayload = {
        customer_name: customerName.trim() || (lang === 'th' ? 'ลูกค้าหน้าร้าน (Walk-in)' : 'Walk-in Customer'),
        phone: 'Walk-in',
        items: cart,
        total: cartSubtotal,
        pickup_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'paid',
        payment_status: 'paid',
        payment_method: paymentMethod,
        notes: `POS Cashier Order · ${paymentMethod.toUpperCase()}`,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderPayload),
      });

      if (res.ok) {
        const created = await res.json();
        triggerHaptic('success');
        playSuccessChime();
        showToast(
          lang === 'th' ? `ลงบิลสำเร็จ #${created?.id || ''}` : `POS Order Saved #${created?.id || ''}`,
          lang === 'th' ? `ยอดรวม ${baht(cartSubtotal)} รับชำระเรียบร้อย` : `Total ${baht(cartSubtotal)} recorded`,
          'success'
        );
        clearCart();
        loadOrders();
      }
    } catch (e) {
      triggerHaptic('error');
      console.warn('Failed to submit POS order', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buckets
  const bucket = (statuses: Order['status'][]) => orders.filter((o) => statuses.includes(o.status));
  const newQueue = bucket(['pending', 'paid']);
  const preparing = bucket(['preparing']);
  const ready = bucket(['ready']);

  // Filter products for left column
  const filteredProducts = products.filter((p) => {
    const matchSearch = (p.name_th + p.name_en + p.slug).toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className={`min-h-screen bg-forest text-cream ${isSpanned ? 'duo-spanned-active' : ''}`}>
      {/* POS Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-forest border-b-2 border-cream/10 duo-nav-shell">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 w-full box-border overflow-hidden">
          {/* Left: Back + Branding */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/admin"
              className="h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-forest-dark flex items-center justify-center hover:bg-forest-dark/80 transition active:scale-95 shrink-0"
              title="Return to Admin"
            >
              <ArrowLeft className="h-4 sm:h-5 w-4 sm:w-5" />
            </Link>
            <div className="min-w-0">
              <div className="font-display italic font-bold text-xl sm:text-2xl flex items-center gap-2 leading-none">
                POS
                <span className="text-[10px] font-mono uppercase bg-honey text-forest font-extrabold px-2 py-0.5 rounded-full not-italic hidden xs:inline">
                  {activeTab === 'register' ? (lang === 'th' ? 'คิดเงิน' : 'Cashier') : (lang === 'th' ? 'คิวต้มสด' : 'Kitchen')}
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-cream/60 truncate">Wanchai Soy · Walai</div>
            </div>
          </div>

          {/* Center Tabs: 2-Column Register vs Kitchen Pipeline */}
          <div className="flex items-center gap-1 bg-forest-dark/90 p-1 rounded-full border border-cream/10 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setActiveTab('register');
              }}
              className={`h-8 sm:h-9 px-3 sm:px-4 rounded-full text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                activeTab === 'register'
                  ? 'bg-cream text-forest shadow-xs'
                  : 'text-cream/70 hover:text-cream hover:bg-cream/10'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>{lang === 'th' ? 'คิดเงินหน้าร้าน' : 'Register'}</span>
              {totalCartCount > 0 && (
                <span className="h-4.5 min-w-4.5 px-1 rounded-full bg-terracotta text-cream text-[10px] font-bold flex items-center justify-center">
                  {totalCartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setActiveTab('kitchen');
              }}
              className={`h-8 sm:h-9 px-3 sm:px-4 rounded-full text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                activeTab === 'kitchen'
                  ? 'bg-cream text-forest shadow-xs'
                  : 'text-cream/70 hover:text-cream hover:bg-cream/10'
              }`}
            >
              <ChefHat className="h-3.5 w-3.5" />
              <span>{lang === 'th' ? 'คิวหม้อต้ม' : 'Kitchen'}</span>
              {newQueue.length > 0 && (
                <span className="h-4.5 min-w-4.5 px-1 rounded-full bg-honey text-forest text-[10px] font-black flex items-center justify-center animate-pulse">
                  {newQueue.length}
                </span>
              )}
            </button>
          </div>

          {/* Right: Quick Tools */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Low-Stock Ingredient Warning Badge */}
            {lowStockIngredients.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('warning');
                  setShowLowStockModal(true);
                }}
                className="h-8.5 sm:h-10 px-2 sm:px-3 rounded-full bg-amber-400 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md animate-pulse active:scale-95 shrink-0"
                title={
                  lang === 'th'
                    ? `⚠️ วัตถุดิบใกล้หมด ${lowStockIngredients.length} รายการ (แตะเพื่อดูรายละเอียด)`
                    : `⚠️ ${lowStockIngredients.length} ingredients running low (Tap to inspect)`
                }
                aria-label="Low Stock Alert"
              >
                <AlertTriangle className="h-4 w-4 text-amber-950" />
                <span className="font-mono font-black">{lowStockIngredients.length}</span>
                <span className="hidden xl:inline">{lang === 'th' ? 'วัตถุดิบใกล้หมด' : 'Low Stock'}</span>
              </button>
            )}

            {/* Camera QR Code Scanner */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                setShowQrScanner(true);
              }}
              className="h-8.5 sm:h-10 px-2.5 sm:px-3.5 rounded-full bg-cream text-forest font-bold text-xs flex items-center justify-center gap-1.5 shadow hover:bg-white transition active:scale-95 shrink-0"
              title={lang === 'th' ? 'สแกน QR ออเดอร์จากมือถือลูกค้า' : 'Scan customer order QR'}
              aria-label="Scan Order QR"
            >
              <QrCode className="h-4 w-4 text-forest" />
              <span className="hidden md:inline">{lang === 'th' ? 'สแกน QR' : 'Scan QR'}</span>
            </button>

            {/* Dial Pad Toggle */}
            <button
              onClick={() => setShowDialPad(!showDialPad)}
              className="h-8.5 sm:h-10 px-2.5 sm:px-3.5 rounded-full bg-honey text-forest font-bold text-xs flex items-center justify-center gap-1.5 shadow hover:bg-honey-dark transition active:scale-95 shrink-0"
              title={lang === 'th' ? 'แป้นคิดเงินหน้าร้าน' : 'Dial Pad'}
              aria-label="Dial Pad"
            >
              <Calculator className="h-4 w-4" />
              <span className="hidden md:inline">{lang === 'th' ? 'แป้นตัวเลข' : 'Keypad'}</span>
            </button>

            <button
              onClick={loadOrders}
              title="Refresh"
              aria-label="Refresh"
              className="h-8.5 w-8.5 sm:h-10 sm:w-10 rounded-full bg-forest-dark flex items-center justify-center hover:bg-forest-dark/80 transition shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={() => {
                const next = !sound;
                setSound(next);
                setSoundEnabled(next);
                triggerHaptic('tap');
              }}
              title={sound ? (lang === 'th' ? 'ปิดเสียงแจ้งเตือน' : 'Mute Sound') : (lang === 'th' ? 'เปิดเสียงแจ้งเตือน' : 'Unmute Sound')}
              aria-label="Toggle Sound"
              className="h-8.5 w-8.5 sm:h-10 sm:w-10 rounded-full bg-forest-dark flex items-center justify-center hover:bg-forest-dark/80 transition shrink-0 active:scale-95"
            >
              {sound ? <Volume2 className="h-4 w-4 text-honey" /> : <VolumeX className="h-4 w-4 opacity-50" />}
            </button>

            <LanguageToggle compact theme="dark" instanceId="pos-top-bar" />
          </div>
        </div>
      </header>

      {/* POS Real-Time Low-Stock Ingredient Warning Banner */}
      {lowStockIngredients.length > 0 && !isLowStockBannerDismissed && (
        <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950 px-3 sm:px-4 py-2 border-b-2 border-amber-500 font-bold text-xs flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-full bg-amber-950 text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-3.5 w-3.5 animate-bounce" />
            </div>
            <span className="shrink-0 font-extrabold uppercase tracking-wide">
              {lang === 'th' ? '⚠️ แจ้งเตือนวัตถุดิบใกล้หมด:' : '⚠️ Low Stock Alert:'}
            </span>
            <span className="font-medium truncate max-w-xs sm:max-w-md lg:max-w-xl">
              {lowStockIngredients.map((i) => `${lang === 'th' ? i.name_th : i.name_en} (${i.current_stock}/${i.min_threshold} ${i.unit})`).join(' • ')}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowLowStockModal(true);
              }}
              className="h-7 px-3 rounded-full bg-amber-950 text-amber-200 text-[11px] font-bold hover:bg-black transition active:scale-95 shadow-xs"
            >
              {lang === 'th' ? 'ดูรายการเตือน' : 'View Low Items'}
            </button>
            <Link
              to="/admin"
              className="h-7 px-3 rounded-full bg-forest text-cream text-[11px] font-bold hover:bg-forest-dark transition active:scale-95 shadow-xs"
            >
              {lang === 'th' ? 'เติมสต็อก (Admin)' : 'Restock in Admin'}
            </Link>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setIsLowStockBannerDismissed(true);
              }}
              className="h-7 w-7 rounded-full bg-amber-950/10 hover:bg-amber-950/20 flex items-center justify-center text-amber-950"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* POS Tactile Haptic Pattern Selection Strip */}
      <div className="bg-forest-dark/95 border-b border-cream/10 px-3 sm:px-4 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
        <div className="flex items-center gap-2 text-cream/80">
          <Activity className="h-3.5 w-3.5 text-honey shrink-0" />
          <span className="font-semibold text-honey">
            {lang === 'th' ? 'การสั่นตอบสนอง (Haptics):' : 'Tactile Haptics:'}
          </span>
          <span className="text-[11px] text-cream/60 hidden md:inline">
            {lang === 'th' ? 'ตอบสนองการกดปุ่มคิดเงินและรับออเดอร์' : 'Dial pad & order action tactile feedback'}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-xl border border-cream/10">
          {(['Soft Tap', 'Strong Click', 'Double Pulse'] as const).map((pattern) => {
            const isSelected = currentPattern === pattern;
            return (
              <button
                key={pattern}
                type="button"
                onClick={() => {
                  applyQuickHapticPattern(pattern);
                  setCurrentPattern(pattern);
                }}
                className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 active:scale-95 ${
                  isSelected
                    ? 'bg-honey text-forest shadow-xs'
                    : 'text-cream/70 hover:text-cream hover:bg-cream/10'
                }`}
              >
                <Zap className={`h-3 w-3 ${isSelected ? 'text-forest' : 'text-honey'}`} />
                <span>{pattern}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN TWO-COLUMN TABLET GRID LAYOUT */}
      <main ref={wrapperRef} className="p-3 sm:p-5 max-w-7xl mx-auto">
        {activeTab === 'register' ? (
          /* TWO-COLUMN GRID FOR TABLETS & DESKTOPS */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
            {/* COLUMN 1 (LEFT): PRODUCT SELECTION MENU (7/12 cols on tablet, 8/12 on desktop) */}
            <div className="md:col-span-7 lg:col-span-8 space-y-4">
              {/* Search & Category Filter Header */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-forest-dark/80 p-3 rounded-2xl border border-cream/10">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-cream/50" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === 'th' ? 'ค้นหาเครื่องดื่ม / ขนม...' : 'Search drinks or snacks...'}
                    className="w-full h-10 rounded-xl bg-forest border border-cream/15 pl-9 pr-3 text-xs text-cream focus:outline-none focus:border-honey"
                  />
                </div>

                <div className="shrink-0 max-w-full sm:max-w-xs">
                  <SmoothScrollMenu arrowTheme="dark" className="gap-1 bg-forest p-1 rounded-xl border border-cream/10">
                    {(
                      [
                        ['all', lang === 'th' ? 'ทั้งหมด' : 'All'],
                        ['drinks', lang === 'th' ? '🥛 น้ำเต้าหู้ & นมสด' : '🥛 Drinks'],
                        ['snacks', lang === 'th' ? '🥟 ปาท่องโก๋ & ขนม' : '🥟 Snacks'],
                      ] as const
                    ).map(([cat, label]) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setSelectedCategory(cat);
                        }}
                        className={`h-8 px-3 rounded-lg text-xs font-bold transition active:scale-95 whitespace-nowrap shrink-0 ${
                          selectedCategory === cat
                            ? 'bg-honey text-forest shadow-xs'
                            : 'text-cream/70 hover:text-cream'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </SmoothScrollMenu>
                </div>
              </div>

              {/* Product Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const isSoldOut = product.sold_out || (product.stock !== undefined && product.stock <= 0);
                  const isLow = (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 10;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => addToCart(product)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 active:scale-95 group relative overflow-hidden h-36 ${
                        isSoldOut
                          ? 'bg-forest-dark/40 border-cream/5 opacity-50 cursor-not-allowed'
                          : 'bg-forest-dark border-cream/15 hover:border-honey/60 hover:bg-forest-dark/90 shadow-sm'
                      }`}
                    >
                      {/* Top Row: Thumbnail + Price */}
                      <div className="flex items-start justify-between gap-2 w-full">
                        <img
                          src={product.image_url}
                          alt={product.name_en}
                          className="h-12 w-12 rounded-xl object-cover border border-cream/10 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="font-display italic font-bold text-honey text-base sm:text-lg">
                          {baht(product.price)}
                        </div>
                      </div>

                      {/* Title & Category */}
                      <div className="w-full min-w-0 mt-2">
                        <div className="font-thai font-bold text-sm text-cream truncate leading-tight group-hover:text-honey transition">
                          {lang === 'th' ? product.name_th : product.name_en}
                        </div>
                        <div className="text-[10px] text-cream/60 truncate mt-0.5">
                          {product.name_en}
                        </div>
                      </div>

                      {/* Stock Pill Indicator */}
                      <div className="flex items-center justify-between w-full mt-1 pt-1 border-t border-cream/10 text-[10px]">
                        {isSoldOut ? (
                          <span className="text-chili font-bold font-mono">SOLD OUT</span>
                        ) : isLow ? (
                          <span className="text-amber-400 font-bold font-mono">
                            {lang === 'th' ? `เหลือ ${product.stock}` : `${product.stock} left`}
                          </span>
                        ) : (
                          <span className="text-cream/50 font-mono">
                            {lang === 'th' ? `สต็อก ${product.stock ?? 40}` : `In stock (${product.stock ?? 40})`}
                          </span>
                        )}
                        <span className="h-5 w-5 rounded-full bg-honey/10 text-honey flex items-center justify-center group-hover:bg-honey group-hover:text-forest transition">
                          <Plus className="h-3 w-3" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 2 (RIGHT): ACTIVE ORDER SUMMARY (5/12 cols on tablet, 4/12 on desktop) */}
            <div className="md:col-span-5 lg:col-span-4 sticky top-24 space-y-4">
              <div className="rounded-3xl bg-forest-dark border-2 border-cream/15 p-4 sm:p-5 shadow-2xl flex flex-col justify-between">
                {/* Header: Ticket Number & Clear Button */}
                <div className="flex items-center justify-between pb-3 border-b border-cream/15">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-honey/20 text-honey flex items-center justify-center font-bold">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-display italic font-bold text-base text-cream leading-tight">
                        {lang === 'th' ? 'รายการคิดเงินหน้าร้าน' : 'Active Ticket'}
                      </h3>
                      <span className="text-[11px] text-cream/60 font-mono">
                        {totalCartCount} {lang === 'th' ? 'ชิ้น' : 'items'}
                      </span>
                    </div>
                  </div>

                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-xs text-chili/80 hover:text-chili font-bold flex items-center gap-1 transition active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{lang === 'th' ? 'ล้างบิล' : 'Clear'}</span>
                    </button>
                  )}
                </div>

                {/* Customer Name / Table Input */}
                <div className="py-2.5">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={lang === 'th' ? 'ชื่อลูกค้า / เบอร์โต๊ะ (ถ้ามี)...' : 'Customer Name / Table #...'}
                    className="w-full h-9 rounded-xl bg-forest border border-cream/15 px-3 text-xs text-cream focus:outline-none focus:border-honey"
                  />
                </div>

                {/* Items List in Active Ticket */}
                <div className="divide-y divide-cream/10 max-h-64 overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-cream/40 text-xs">
                      <Sparkles className="h-6 w-6 mx-auto mb-1 opacity-40 text-honey" />
                      {lang === 'th'
                        ? 'แตะเมนูทางซ้ายเพื่อเริ่มลงรายการ'
                        : 'Tap items on the left to add to ticket'}
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-thai font-semibold text-xs text-cream truncate">
                            {lang === 'th' ? item.name_th : item.name_en}
                          </div>
                          <div className="text-[10px] text-cream/60 font-mono">
                            {baht(item.unit_price)} × {item.qty} = <b className="text-honey">{baht(item.unit_price * item.qty)}</b>
                          </div>
                        </div>

                        {/* Quantity Counter Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, -1)}
                            className="h-7 w-7 rounded-lg bg-forest hover:bg-forest/80 text-cream flex items-center justify-center transition active:scale-95 border border-cream/10"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-xs text-honey">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, 1)}
                            className="h-7 w-7 rounded-lg bg-forest hover:bg-forest/80 text-cream flex items-center justify-center transition active:scale-95 border border-cream/10"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCartItem(item.id)}
                            className="h-7 w-7 rounded-lg bg-chili/10 hover:bg-chili/20 text-chili flex items-center justify-center transition active:scale-95 ml-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Financial Summary & Calculations */}
                <div className="pt-3 border-t border-cream/15 space-y-2">
                  <div className="flex items-center justify-between text-xs text-cream/70">
                    <span>{lang === 'th' ? 'รวมค่าสินค้า' : 'Subtotal'}</span>
                    <span className="font-mono">{baht(cartSubtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between font-display italic font-bold text-xl text-honey pt-1 border-t border-cream/10">
                    <span>{lang === 'th' ? 'ยอดชำระสุทธิ' : 'Total Due'}</span>
                    <span>{baht(cartSubtotal)}</span>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setPaymentMethod('cash');
                      }}
                      className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
                        paymentMethod === 'cash'
                          ? 'bg-honey text-forest shadow-xs'
                          : 'bg-forest text-cream/70 border border-cream/15 hover:text-cream'
                      }`}
                    >
                      <Banknote className="h-4 w-4" />
                      <span>{lang === 'th' ? 'เงินสด' : 'Cash'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setPaymentMethod('promptpay');
                      }}
                      className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
                        paymentMethod === 'promptpay'
                          ? 'bg-honey text-forest shadow-xs'
                          : 'bg-forest text-cream/70 border border-cream/15 hover:text-cream'
                      }`}
                    >
                      <QrCode className="h-4 w-4" />
                      <span>{lang === 'th' ? 'พร้อมเพย์' : 'PromptPay'}</span>
                    </button>
                  </div>

                  {/* Fast Cash Denominations (for Cash payment mode) */}
                  {paymentMethod === 'cash' && cartSubtotal > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        {[cartSubtotal, 50, 100, 500].filter((val, i, arr) => arr.indexOf(val) === i && val >= cartSubtotal).map((cashVal) => (
                          <button
                            key={cashVal}
                            type="button"
                            onClick={() => {
                              triggerHaptic('tap');
                              setReceivedCash(cashVal);
                            }}
                            className={`h-7 px-2.5 rounded-lg text-[11px] font-mono font-bold transition active:scale-95 border ${
                              receivedCash === cashVal
                                ? 'bg-cream text-forest border-honey'
                                : 'bg-forest/80 text-cream/80 border-cream/10 hover:border-cream/30'
                            }`}
                          >
                            ฿{cashVal}
                          </button>
                        ))}
                      </div>

                      {receivedCash !== null && receivedCash >= cartSubtotal && (
                        <div className="flex items-center justify-between text-xs bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/30">
                          <span className="text-emerald-300 font-semibold">
                            {lang === 'th' ? 'เงินทอน:' : 'Change:'}
                          </span>
                          <span className="font-mono font-bold text-emerald-300 text-sm">
                            {baht(changeDue)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Complete & Charge Button */}
                  <button
                    type="button"
                    disabled={cart.length === 0 || isSubmitting}
                    onClick={handleChargeOrder}
                    className={`w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 mt-3 ${
                      cart.length === 0 || isSubmitting
                        ? 'bg-cream/20 text-cream/40 cursor-not-allowed'
                        : 'bg-gradient-to-r from-honey via-amber-400 to-honey text-forest hover:brightness-105 shadow-honey/20'
                    }`}
                  >
                    <Check className="h-5 w-5" />
                    <span>
                      {isSubmitting
                        ? lang === 'th'
                          ? 'กำลังลงบิล...'
                          : 'Processing...'
                        : lang === 'th'
                        ? `ชำระเงิน & ลงบิล (${baht(cartSubtotal)})`
                        : `Charge ${baht(cartSubtotal)}`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* KITCHEN QUEUE KANBAN COLUMNS */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Column title={t.newOrder} icon={Bell} accent="bg-honey text-forest" count={newQueue.length}>
              {newQueue.map((o) => (
                <PosCard key={o.id} order={o} lang={lang}>
                  <button
                    onClick={() => update(o.id, { status: 'preparing', payment_status: 'paid' })}
                    className="pos-btn w-full rounded-2xl bg-honey text-forest font-bold active:scale-95"
                  >
                    <ChefHat className="inline h-5 w-5 mr-1" /> {t.accept}
                  </button>
                </PosCard>
              ))}
            </Column>

            <Column title={t.preparing} icon={ChefHat} accent="bg-terracotta text-cream" count={preparing.length}>
              {preparing.map((o) => (
                <PosCard key={o.id} order={o} lang={lang}>
                  <button
                    onClick={() => update(o.id, { status: 'ready' })}
                    className="pos-btn w-full rounded-2xl bg-terracotta text-cream font-bold active:scale-95"
                  >
                    <Package className="inline h-5 w-5 mr-1" /> {t.markReady}
                  </button>
                </PosCard>
              ))}
            </Column>

            <Column title={t.ready} icon={Package} accent="bg-cream text-forest" count={ready.length}>
              {ready.map((o) => (
                <PosCard key={o.id} order={o} lang={lang}>
                  <button
                    onClick={() => update(o.id, { status: 'done' })}
                    className="pos-btn w-full rounded-2xl bg-cream text-forest font-bold active:scale-95"
                  >
                    <Check className="inline h-5 w-5 mr-1" /> {t.markDone}
                  </button>
                </PosCard>
              ))}
            </Column>
          </div>
        )}
      </main>

      {/* Modal Walk-by Dial Pad */}
      {showDialPad && (
        <PosDialPad
          onClose={() => setShowDialPad(false)}
          onOrderCreated={() => {
            loadOrders();
            setShowDialPad(false);
          }}
        />
      )}

      {/* POS Camera QR Scanner Modal */}
      <PosQrScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        orders={orders}
        onUpdateOrderStatus={update}
        lang={lang}
      />

      {/* Low-Stock Ingredient Details Modal for POS */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-forest-dark border-2 border-amber-400/60 shadow-2xl p-5 sm:p-6 text-cream space-y-4">
            <div className="flex items-center justify-between border-b border-cream/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display italic font-bold text-lg sm:text-xl text-honey">
                    {lang === 'th' ? 'รายการวัตถุดิบใกล้หมด' : 'Low Stock Ingredients'}
                  </h3>
                  <p className="text-xs text-cream/70">
                    {lang === 'th'
                      ? `ตรวจพบ ${lowStockIngredients.length} รายการที่ต่ำกว่าเกณฑ์ความปลอดภัย`
                      : `${lowStockIngredients.length} items below minimum safety threshold`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLowStockModal(false)}
                className="h-8 w-8 rounded-full bg-cream/10 hover:bg-cream/20 flex items-center justify-center text-cream"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List of items */}
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {lowStockIngredients.map((item) => {
                const isCritical = item.current_stock <= item.min_threshold / 2 || item.current_stock <= 0;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                      isCritical
                        ? 'bg-chili/20 border-chili/50'
                        : 'bg-amber-500/15 border-amber-400/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-cream">
                          {lang === 'th' ? item.name_th : item.name_en}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                            isCritical ? 'bg-chili text-cream' : 'bg-amber-400 text-amber-950'
                          }`}
                        >
                          {isCritical ? 'CRITICAL' : 'LOW'}
                        </span>
                      </div>
                      <div className="text-xs text-cream/70 mt-1">
                        {lang === 'th' ? 'คงเหลือ:' : 'Current:'}{' '}
                        <strong className="text-honey font-mono text-sm">{item.current_stock}</strong> {item.unit}
                        {' · '}
                        {lang === 'th' ? 'เกณฑ์แจ้งเตือน:' : 'Alert Min:'}{' '}
                        <span className="font-mono">{item.min_threshold}</span> {item.unit}
                      </div>
                      {item.notes && <div className="text-[11px] text-cream/50 mt-0.5">{item.notes}</div>}
                    </div>

                    <Link
                      to="/admin"
                      onClick={() => setShowLowStockModal(false)}
                      className="h-8 px-3 rounded-full bg-honey hover:bg-honey-dark text-forest font-bold text-xs flex items-center gap-1 shadow-xs transition active:scale-95 shrink-0"
                    >
                      <span>{lang === 'th' ? 'เติมของ' : 'Restock'}</span>
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-cream/10">
              <span className="text-xs text-cream/60">
                {lang === 'th' ? 'อัปเดตแบบเรียลไทม์จากระบบคลังหลังร้าน' : 'Real-time sync from backend inventory'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLowStockModal(false)}
                  className="h-9 px-4 rounded-full text-xs font-bold text-cream/80 hover:bg-cream/10 transition"
                >
                  {lang === 'th' ? 'ปิด' : 'Close'}
                </button>
                <Link
                  to="/admin"
                  onClick={() => setShowLowStockModal(false)}
                  className="h-9 px-4 rounded-full bg-cream text-forest text-xs font-bold hover:bg-white transition active:scale-95"
                >
                  {lang === 'th' ? 'เปิดระบบจัดการคลัง (Admin)' : 'Open Admin Inventory'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Column({
  title,
  icon: Ic,
  accent,
  count,
  children,
}: {
  title: string;
  icon: any;
  accent: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className={`rounded-2xl px-4 py-3 mb-3 flex items-center justify-between ${accent}`}>
        <div className="font-display italic font-bold text-xl flex items-center gap-2">
          <Ic className="h-5 w-5" /> {title}
        </div>
        <div className="font-mono text-lg font-bold">{count}</div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function PosCard({
  order,
  lang,
  children,
}: {
  order: Order;
  lang: 'th' | 'en';
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-forest-dark border-2 border-cream/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono font-bold text-honey text-lg">{shortId(order.id)}</div>
        <div className="text-xs text-cream/60 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {timeAgo(order.created_at, lang)}
        </div>
      </div>
      <div className="font-thai font-semibold">
        {order.customer_name || (lang === 'th' ? 'ลูกค้าเดินมาซื้อ' : 'Walk-up')}
      </div>
      <div className="text-xs text-cream/70">{order.phone}</div>
      <ul className="mt-3 space-y-1.5">
        {order.items.map((i, k) => (
          <li key={k} className="flex items-start gap-2 text-sm">
            <span className="font-mono font-bold text-honey w-6 shrink-0">{i.qty}×</span>
            <div>
              <div className="font-thai font-semibold leading-tight">{lang === 'th' ? i.name_th : i.name_en}</div>
              <div className="text-xs text-cream/60">
                {i.vessel} · {i.sweetness}
                {i.temp !== 'na' ? ` · ${i.temp}` : ''}
                {i.notes ? ` — ${i.notes}` : ''}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-cream/70">
          Pickup <b className="text-cream">{order.pickup_time}</b>
        </div>
        <div className="font-display italic font-bold text-honey text-xl">{baht(order.total)}</div>
      </div>
      <div className="mt-3">{children}</div>
      {order.status !== 'cancelled' && order.status !== 'done' && (
        <button
          onClick={async () => {
            await fetch('/api/orders', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: order.id, status: 'cancelled' }),
            });
          }}
          className="mt-2 w-full h-9 rounded-full bg-cream/5 hover:bg-cream/10 text-cream/60 text-xs flex items-center justify-center gap-1 transition"
        >
          <XCircle className="h-3.5 w-3.5" /> Cancel Order
        </button>
      )}
    </div>
  );
}
