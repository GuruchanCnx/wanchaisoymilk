import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  RefreshCw,
  ShoppingBag,
  Award,
  Sparkles,
  Phone,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Heart,
} from 'lucide-react';
import type { Order } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { baht, shortId, timeAgo } from '../lib/format';

interface SavedLocalOrder {
  id: number | string;
  date?: string;
  created_at?: string;
  total: number;
  items: any[];
  status?: string;
  phone?: string;
}

export default function OrderHistory() {
  const { lang, t } = useLang();
  const { add } = useCart();
  const [localOrders, setLocalOrders] = useState<SavedLocalOrder[]>([]);
  const [remoteOrders, setRemoteOrders] = useState<Order[]>([]);
  const [phone, setPhone] = useState<string>(() => localStorage.getItem('customer_phone') || '');
  const [phoneInput, setPhoneInput] = useState<string>(phone);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'recent'>('all');
  const [reorderedId, setReorderedId] = useState<string | number | null>(null);

  // Load local orders from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('wanjai_orders');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLocalOrders(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse local orders', e);
    }
  }, []);

  // Fetch orders from API / Firestore if phone is available
  useEffect(() => {
    if (!phone) return;
    setLoading(true);
    fetch(`/api/orders?phone=${encodeURIComponent(phone)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRemoteOrders(data);
        }
      })
      .catch((err) => console.warn('Failed to fetch remote orders', err))
      .finally(() => setLoading(false));
  }, [phone]);

  const handlePhoneSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phoneInput.trim();
    setPhone(clean);
    if (clean) {
      localStorage.setItem('customer_phone', clean);
    }
  };

  // Merge and deduplicate orders by ID
  const mergedOrders = useMemo(() => {
    const map = new Map<string, any>();

    // Put remote orders first (more up-to-date status)
    remoteOrders.forEach((o) => {
      map.set(String(o.id), {
        id: o.id,
        created_at: o.created_at,
        total: o.total,
        status: o.status || 'pending',
        items: o.items || [],
        payment_method: o.payment_method,
        pickup_time: o.pickup_time,
        notes: o.notes,
        isRemote: true,
      });
    });

    // Merge in local orders
    localOrders.forEach((o) => {
      const idKey = String(o.id);
      if (!map.has(idKey)) {
        map.set(idKey, {
          id: o.id,
          created_at: o.created_at || o.date || new Date().toISOString(),
          total: o.total,
          status: o.status || 'pending',
          items: o.items || [],
          isRemote: false,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [localOrders, remoteOrders]);

  // Frequency and patron statistics calculations
  const stats = useMemo(() => {
    const totalOrders = mergedOrders.length;
    const totalSpent = mergedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    // Favorite item detection
    const itemCounts: Record<string, { count: number; name_th: string; name_en: string }> = {};
    mergedOrders.forEach((order) => {
      (order.items || []).forEach((item: any) => {
        const slug = item.slug || item.name_en || 'item';
        if (!itemCounts[slug]) {
          itemCounts[slug] = {
            count: 0,
            name_th: item.name_th || 'น้ำเต้าหู้',
            name_en: item.name_en || 'Soy Milk',
          };
        }
        itemCounts[slug].count += item.qty || 1;
      });
    });

    let topItem: { name_th: string; name_en: string; count: number } | null = null;
    Object.values(itemCounts).forEach((it) => {
      if (!topItem || it.count > topItem.count) {
        topItem = it;
      }
    });

    // Patron tier & frequency
    let tierTitleTh = 'ผู้มาเยือนครั้งแรก';
    let tierTitleEn = 'First-time Guest';
    let tierColor = 'bg-ink/10 text-ink';

    if (totalOrders >= 10) {
      tierTitleTh = 'ตำนานน้ำเต้าหู้วัวลาย (Super Regular)';
      tierTitleEn = 'Walai Soy Legend';
      tierColor = 'bg-honey text-forest font-bold';
    } else if (totalOrders >= 5) {
      tierTitleTh = 'แฟนพันธุ์แท้วันใจ (Devoted Patron)';
      tierTitleEn = 'Daily Soy Devotee';
      tierColor = 'bg-terracotta text-cream font-bold';
    } else if (totalOrders >= 2) {
      tierTitleTh = 'ลูกค้าประจำคนคุ้นเคย (Familiar Friend)';
      tierTitleEn = 'Familiar Friend';
      tierColor = 'bg-forest text-cream font-semibold';
    } else if (totalOrders === 1) {
      tierTitleTh = 'ยินดีต้อนรับสู่ครอบครัววันใจ';
      tierTitleEn = 'Welcome Guest';
      tierColor = 'bg-forest/15 text-forest font-semibold';
    }

    return {
      totalOrders,
      totalSpent,
      topItem,
      tierTitleTh,
      tierTitleEn,
      tierColor,
    };
  }, [mergedOrders]);

  const reorder = (order: any) => {
    (order.items || []).forEach((it: any) => {
      add({
        key: `${it.slug || 'item'}-reorder-${Date.now()}-${Math.random()}`,
        product_id: it.product_id || 1,
        slug: it.slug || 'soy-milk',
        name_th: it.name_th || 'น้ำเต้าหู้',
        name_en: it.name_en || 'Soy Milk',
        image_url: it.image_url || '/images/soy-milk.jpg',
        base_price: it.unit_price || it.base_price || 15,
        vessel: (it.vessel as any) || 'bag',
        sweetness: (it.sweetness as any) || 'normal',
        temp: (it.temp as any) || 'na',
        extras: it.extras || [],
        qty: it.qty || 1,
        unit_price: it.unit_price || 15,
        notes: it.notes,
      });
    });

    setReorderedId(order.id);
    setTimeout(() => setReorderedId(null), 2500);

    if ('vibrate' in navigator) {
      navigator.vibrate?.(20);
    }
  };

  const displayedOrders = activeTab === 'recent' ? mergedOrders.slice(0, 3) : mergedOrders;

  return (
    <div className="w-full">
      {/* Patron Level & Purchase Frequency Dashboard */}
      <div className="rounded-3xl bg-forest text-cream p-5 sm:p-6 shadow-md mb-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-honey/10 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-xs ${stats.tierColor}`}>
                <Award className="h-3 w-3 inline mr-1" />
                {lang === 'th' ? stats.tierTitleTh : stats.tierTitleEn}
              </span>
              <span className="text-xs text-honey/80 font-medium">วันใจ Soy Member</span>
            </div>
            <h2 className="font-display italic font-bold text-2xl sm:text-3xl text-cream">
              {lang === 'th' ? 'ความถี่และประวัติการสั่งซื้อ' : 'Your Order Frequency & History'}
            </h2>
            <p className="text-cream/80 text-xs sm:text-sm mt-1 max-w-lg">
              {lang === 'th'
                ? 'ติดตามทุกความสดชื่น เช็คยอดสะสม และกดสั่งเมนูเดิมซ้ำได้ในคลิกเดียว'
                : 'Track your Chiang Mai morning routine, view frequency stats, and 1-click reorder your favorites.'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4 shrink-0">
            <div className="bg-cream/10 backdrop-blur-xs rounded-2xl p-3 border border-cream/15 text-center min-w-[90px]">
              <div className="text-[11px] text-cream/70 uppercase tracking-wider font-semibold">
                {lang === 'th' ? 'จำนวนออเดอร์' : 'Total Orders'}
              </div>
              <div className="text-2xl font-bold font-display italic text-honey mt-0.5">
                {stats.totalOrders}
              </div>
            </div>
            <div className="bg-cream/10 backdrop-blur-xs rounded-2xl p-3 border border-cream/15 text-center min-w-[90px]">
              <div className="text-[11px] text-cream/70 uppercase tracking-wider font-semibold">
                {lang === 'th' ? 'ยอดสะสม' : 'Total Spent'}
              </div>
              <div className="text-2xl font-bold font-display italic text-honey mt-0.5">
                {baht(stats.totalSpent)}
              </div>
            </div>
          </div>
        </div>

        {/* Favorite Item Highlight */}
        {stats.topItem && (
          <div className="mt-4 pt-4 border-t border-cream/15 flex items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-cream/90">
              <Heart className="h-4 w-4 text-honey fill-honey" />
              <span>
                {lang === 'th' ? 'เมนูโปรดของคุณ: ' : 'Most Loved: '}
                <strong className="text-honey">
                  {lang === 'th' ? stats.topItem.name_th : stats.topItem.name_en}
                </strong>{' '}
                ({stats.topItem.count} {lang === 'th' ? 'ครั้ง' : 'times'})
              </span>
            </div>
            <span className="text-[11px] text-cream/70 hidden sm:inline">
              {lang === 'th' ? 'ต้มสดใหม่ด้วยถั่วเหลืองเชียงใหม่' : 'Simmered fresh from Chiang Mai beans'}
            </span>
          </div>
        )}
      </div>

      {/* Sync with Phone Number */}
      <div className="bg-cream-soft rounded-2xl border-2 border-forest/10 p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
            <Phone className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-forest uppercase tracking-wider">
              {lang === 'th' ? 'ค้นหาประวัติด้วยเบอร์โทร' : 'Look Up by Phone'}
            </div>
            <div className="text-xs text-ink-muted">
              {phone
                ? lang === 'th'
                  ? `กำลังเชื่อมต่อกับเบอร์: ${phone}`
                  : `Linked to phone: ${phone}`
                : lang === 'th'
                ? 'ใส่เบอร์โทรศัพท์ที่ใช้สั่งเพื่อดึงประวัติจากระบบร้าน'
                : 'Enter your checkout phone number to sync store receipts'}
            </div>
          </div>
        </div>

        <form onSubmit={handlePhoneSearch} className="flex items-center gap-2">
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="08x xxx xxxx"
            className="h-10 px-3.5 rounded-xl border-2 border-forest/15 bg-cream text-ink text-sm font-mono focus:outline-none focus:border-forest"
          />
          <button
            type="submit"
            className="h-10 px-4 rounded-xl bg-forest text-cream text-xs font-semibold hover:bg-forest-dark active:scale-95 transition shrink-0 flex items-center gap-1.5"
          >
            <Search className="h-3.5 w-3.5" />
            {loading ? '...' : lang === 'th' ? 'ค้นหา' : 'Sync'}
          </button>
        </form>
      </div>

      {/* Order List Header & Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-forest" />
          <h3 className="font-display italic font-bold text-xl text-ink">
            {lang === 'th' ? 'รายการสั่งซื้อที่ผ่านมา' : 'Past Orders'}
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-forest/10 text-forest">
            {mergedOrders.length}
          </span>
        </div>

        {mergedOrders.length > 3 && (
          <div className="flex rounded-full bg-forest/10 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-full transition ${
                activeTab === 'all' ? 'bg-forest text-cream shadow-xs' : 'text-forest hover:bg-forest/5'
              }`}
            >
              {lang === 'th' ? 'ทั้งหมด' : 'All'}
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-3 py-1 rounded-full transition ${
                activeTab === 'recent' ? 'bg-forest text-cream shadow-xs' : 'text-forest hover:bg-forest/5'
              }`}
            >
              {lang === 'th' ? 'ล่าสุด 3 รายการ' : 'Recent 3'}
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {mergedOrders.length === 0 ? (
        <div className="text-center rounded-3xl bg-cream-soft border-2 border-dashed border-forest/20 p-8 sm:p-12">
          <div className="h-16 w-16 rounded-full bg-forest/10 text-forest mx-auto flex items-center justify-center mb-3">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h4 className="font-display italic font-bold text-xl text-ink">
            {lang === 'th' ? 'ยังไม่มีประวัติการสั่งซื้อ' : 'No Past Orders Yet'}
          </h4>
          <p className="text-ink-muted text-sm mt-1 max-w-sm mx-auto">
            {lang === 'th'
              ? 'เริ่มสั่งน้ำเต้าหู้สดเตาแรก ปาท่องโก๋ หรือนมวัวสดวันนี้ แล้วระบบจะบันทึกประวัติให้คุณอัตโนมัติ'
              : 'Order our freshly simmered morning soy milk, patongko, or cow milk to start building your order history!'}
          </p>
          <div className="mt-5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-terracotta text-cream font-bold text-sm shadow hover:bg-terracotta-dark active:scale-95 transition"
            >
              <Sparkles className="h-4 w-4" />
              {lang === 'th' ? 'ดูเมนูและสั่งเลย' : 'Explore Menu & Order'}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map((order) => {
            const isJustReordered = reorderedId === order.id;
            return (
              <div
                key={order.id}
                className="rounded-2xl bg-cream-soft border-2 border-forest/15 p-4 sm:p-5 shadow-xs hover:border-forest/35 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-forest/10">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-forest text-sm bg-forest/10 px-2.5 py-1 rounded-lg">
                      {shortId(order.id)}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {timeAgo(order.created_at, lang)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                        order.status === 'ready' || order.status === 'done'
                          ? 'bg-forest/15 text-forest'
                          : order.status === 'preparing'
                          ? 'bg-honey/40 text-forest font-bold'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status || 'pending'}
                    </span>
                    <Link
                      to={`/order/${order.id}`}
                      className="text-xs text-forest hover:text-terracotta flex items-center gap-0.5 font-medium underline underline-offset-2"
                    >
                      {lang === 'th' ? 'ติดตาม' : 'Track'}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* Items in this order */}
                <div className="py-3 space-y-1.5">
                  {(order.items || []).map((it: any, idx: number) => (
                    <div key={idx} className="flex items-start justify-between text-sm">
                      <div className="text-ink">
                        <span className="font-bold text-forest mr-1.5">{it.qty}×</span>
                        <span className="font-medium">
                          {lang === 'th' ? it.name_th || 'น้ำเต้าหู้' : it.name_en || 'Soy Milk'}
                        </span>
                        {(it.vessel || it.sweetness) && (
                          <span className="text-xs text-ink-muted ml-2">
                            ({[it.temp, it.vessel, it.sweetness].filter(Boolean).join(', ')})
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-ink-muted text-xs whitespace-nowrap">
                        {baht((it.unit_price || it.base_price || 0) * (it.qty || 1))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer with Total and 1-Click Reorder Button */}
                <div className="pt-3 border-t border-forest/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-ink-muted">
                    <span>{lang === 'th' ? 'ยอดรวมสุทธิ: ' : 'Total: '}</span>
                    <span className="font-display italic font-bold text-forest text-lg ml-1">
                      {baht(order.total)}
                    </span>
                    {order.pickup_time && (
                      <span className="ml-2 text-[11px] text-ink-muted/80">
                        ({lang === 'th' ? 'เวลารับ:' : 'Pickup:'} {order.pickup_time})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => reorder(order)}
                      className={`flex-1 sm:flex-none h-10 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs ${
                        isJustReordered
                          ? 'bg-forest text-cream'
                          : 'bg-terracotta text-cream hover:bg-terracotta-dark'
                      }`}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isJustReordered ? 'animate-spin' : ''}`} />
                      {isJustReordered
                        ? lang === 'th'
                          ? 'เพิ่มลงตะกร้าแล้ว!'
                          : 'Added to Cart!'
                        : lang === 'th'
                        ? 'สั่งซ้ำรายการนี้ (Re-order)'
                        : 'Re-order Items'}
                    </button>
                    <Link
                      to="/checkout"
                      className="h-10 px-3 rounded-xl bg-cream border-2 border-forest/15 text-forest text-xs font-semibold flex items-center hover:bg-forest/5"
                    >
                      {lang === 'th' ? 'ไปที่ตะกร้า' : 'Checkout'}
                      <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
