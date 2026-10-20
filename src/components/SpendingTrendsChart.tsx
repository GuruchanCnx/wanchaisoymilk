import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Sparkles,
  Award,
  Coffee,
  Coins,
  ArrowUpRight,
  Eye,
  Info,
} from 'lucide-react';
import { baht } from '../lib/format';
import { triggerHaptic } from '../lib/haptics';

interface SpendingTrendsChartProps {
  orders: any[];
  lang: 'th' | 'en';
}

interface DayData {
  dateKey: string; // YYYY-MM-DD
  displayDate: string; // "14 ต.ค." or "Oct 14"
  fullDate: string;
  spending: number;
  itemCount: number;
  orderCount: number;
}

export default function SpendingTrendsChart({ orders, lang }: SpendingTrendsChartProps) {
  const [metric, setMetric] = useState<'spending' | 'items'>('spending');
  const [showDemoComparison, setShowDemoComparison] = useState(false);

  // Generate 30 days data series ending today
  const chartData = useMemo(() => {
    const days: DayData[] = [];
    const now = new Date();

    // Map existing orders by YYYY-MM-DD
    const orderMap = new Map<string, { spending: number; items: number; count: number }>();

    orders.forEach((o) => {
      const dateStr = o.created_at || o.date;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;

      const key = d.toISOString().slice(0, 10);
      const curr = orderMap.get(key) || { spending: 0, items: 0, count: 0 };
      const total = Number(o.total) || 0;
      const itemsCount = Array.isArray(o.items)
        ? o.items.reduce((acc: number, it: any) => acc + (Number(it.qty) || 1), 0)
        : 1;

      orderMap.set(key, {
        spending: curr.spending + total,
        items: curr.items + itemsCount,
        count: curr.count + 1,
      });
    });

    const hasRealOrders = orderMap.size > 0;

    // Build array for past 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);

      const dayMonth = d.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
        day: 'numeric',
        month: 'short',
      });
      const fullDate = d.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const entry = orderMap.get(key);
      let spending = entry ? entry.spending : 0;
      let itemCount = entry ? entry.items : 0;
      let orderCount = entry ? entry.count : 0;

      // If user has zero or very few real orders and enabled sample preview
      if ((!hasRealOrders || showDemoComparison) && !entry) {
        // Realistic Chiang Mai regular morning soy milk visit pattern (3-4 days a week)
        const dayOfWeek = d.getDay();
        const isVisitDay = [1, 2, 4, 6].includes(dayOfWeek);
        if (isVisitDay) {
          // ฿35 - ฿85 (Soy milk bag + Patongko + Milk)
          const seedSpending = 35 + ((i * 7 + dayOfWeek * 13) % 50);
          spending = seedSpending;
          itemCount = 2 + (seedSpending > 50 ? 2 : 0);
          orderCount = 1;
        }
      }

      days.push({
        dateKey: key,
        displayDate: dayMonth,
        fullDate,
        spending,
        itemCount,
        orderCount,
      });
    }

    return days;
  }, [orders, lang, showDemoComparison]);

  // Aggregate 30-Day Metrics
  const totalSpending30Days = chartData.reduce((acc, d) => acc + d.spending, 0);
  const totalItems30Days = chartData.reduce((acc, d) => acc + d.itemCount, 0);
  const totalOrders30Days = chartData.reduce((acc, d) => acc + d.orderCount, 0);
  const avgOrderValue = totalOrders30Days > 0 ? Math.round(totalSpending30Days / totalOrders30Days) : 0;
  const estimatedPoints = Math.floor(totalSpending30Days / 10); // 1 pt per ฿10

  const hasRealData = useMemo(() => {
    return orders && orders.length > 0;
  }, [orders]);

  return (
    <div className="rounded-3xl liquid-glass border border-white/80 p-5 sm:p-6 shadow-sm mb-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-forest/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest/10 text-forest text-xs font-bold uppercase tracking-wider mb-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-terracotta" />
            <span>{lang === 'th' ? 'สถิติการสั่งซื้อ 30 วัน' : '30-Day Spending Trends'}</span>
          </div>
          <h2 className="font-display italic font-bold text-2xl sm:text-3xl text-forest leading-tight">
            {lang === 'th' ? 'สรุปยอดใช้จ่าย & พฤติกรรมการดื่ม' : 'Monthly Spending & Habits'}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {lang === 'th'
              ? 'กราฟแสดงแนวโน้มยอดซื้อน้ำเต้าหู้และของว่างย้อนหลัง 30 วัน'
              : 'Visualizing your daily soy milk & snack purchases over the last 30 days'}
          </p>
        </div>

        {/* Metric Switcher & Demo Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-full bg-forest/10 p-1 border border-forest/15">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setMetric('spending');
              }}
              className={`h-8 px-3.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                metric === 'spending'
                  ? 'bg-forest text-cream shadow-xs'
                  : 'text-forest hover:bg-forest/10'
              }`}
            >
              <Coins className="h-3.5 w-3.5" />
              <span>{lang === 'th' ? 'ยอดเงิน (฿)' : 'Spending (฿)'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setMetric('items');
              }}
              className={`h-8 px-3.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                metric === 'items'
                  ? 'bg-forest text-cream shadow-xs'
                  : 'text-forest hover:bg-forest/10'
              }`}
            >
              <Coffee className="h-3.5 w-3.5" />
              <span>{lang === 'th' ? 'จำนวนชิ้น/แก้ว' : 'Items'}</span>
            </button>
          </div>

          {!hasRealData && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setShowDemoComparison(!showDemoComparison);
              }}
              className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1 transition ${
                showDemoComparison
                  ? 'bg-honey/30 text-forest border border-honey'
                  : 'bg-white/80 border border-forest/15 text-ink-muted hover:text-forest'
              }`}
              title={lang === 'th' ? 'แสดงตัวอย่างสถิติ 30 วัน' : 'Toggle 30-day sample data'}
            >
              <Eye className="h-3 w-3" />
              <span className="text-[11px]">{lang === 'th' ? 'ตัวอย่าง 30 วัน' : 'Demo Data'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-5">
        {/* Total Spending */}
        <div className="rounded-2xl bg-white/70 border border-forest/15 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
            <span>{lang === 'th' ? 'ยอดรวม 30 วัน' : '30-Day Total'}</span>
            <Coins className="h-4 w-4 text-terracotta" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-forest mt-1">
            ฿{totalSpending30Days.toLocaleString()}
          </div>
          <div className="text-[11px] text-ink-muted mt-0.5">
            {totalOrders30Days} {lang === 'th' ? 'ออเดอร์ทั้งหมด' : 'total orders'}
          </div>
        </div>

        {/* Items Ordered */}
        <div className="rounded-2xl bg-white/70 border border-forest/15 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
            <span>{lang === 'th' ? 'เครื่องดื่ม & ของว่าง' : 'Drinks & Snacks'}</span>
            <Coffee className="h-4 w-4 text-forest" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-forest mt-1">
            {totalItems30Days}{' '}
            <span className="text-xs font-thai font-normal text-ink-muted">
              {lang === 'th' ? 'ถุง/แก้ว/ชิ้น' : 'items'}
            </span>
          </div>
          <div className="text-[11px] text-ink-muted mt-0.5">
            {lang === 'th' ? 'ต้มสดใหม่สูตรดั้งเดิม' : 'Freshly made batches'}
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="rounded-2xl bg-white/70 border border-forest/15 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
            <span>{lang === 'th' ? 'เฉลี่ยต่อออเดอร์' : 'Avg Order Value'}</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-forest mt-1">
            ฿{avgOrderValue}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
            {lang === 'th' ? 'คุมค่าใช้จ่ายได้ดี' : 'Great morning budget'}
          </div>
        </div>

        {/* Loyalty Points Earned */}
        <div className="rounded-2xl bg-white/70 border border-forest/15 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
            <span>{lang === 'th' ? 'แต้มสะสมวันใจคลับ' : 'Points Earned'}</span>
            <Award className="h-4 w-4 text-honey" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-forest mt-1">
            +{estimatedPoints}{' '}
            <span className="text-xs font-thai font-normal text-ink-muted">
              {lang === 'th' ? 'แต้ม' : 'pts'}
            </span>
          </div>
          <div className="text-[11px] text-honey font-bold mt-0.5">
            {lang === 'th' ? 'แลกส่วนลดได้ ฿' + Math.floor(estimatedPoints / 10) : 'Redeemable rewards'}
          </div>
        </div>
      </div>

      {/* Recharts Area Visualization */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              {/* Forest Green Gradient for Spending */}
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2B4D3E" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#2B4D3E" stopOpacity={0.02} />
              </linearGradient>

              {/* Terracotta Honey Gradient for Items Count */}
              <linearGradient id="itemsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C85A32" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#C85A32" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#2B4D3E" strokeOpacity={0.1} />

            <XAxis
              dataKey="displayDate"
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#2B4D3E', strokeOpacity: 0.15 }}
              interval="preserveStartEnd"
              minTickGap={25}
            />

            <YAxis
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#2B4D3E', strokeOpacity: 0.15 }}
              tickFormatter={(v) => (metric === 'spending' ? `฿${v}` : `${v}`)}
            />

            <Tooltip content={<CustomTooltip lang={lang} metric={metric} />} />

            {metric === 'spending' ? (
              <Area
                type="monotone"
                dataKey="spending"
                stroke="#2B4D3E"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#spendingGradient)"
                activeDot={{
                  r: 6,
                  fill: '#2B4D3E',
                  stroke: '#FAF3E3',
                  strokeWidth: 2,
                }}
              />
            ) : (
              <Area
                type="monotone"
                dataKey="itemCount"
                stroke="#C85A32"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#itemsGradient)"
                activeDot={{
                  r: 6,
                  fill: '#C85A32',
                  stroke: '#FAF3E3',
                  strokeWidth: 2,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Tip */}
      <div className="mt-3 pt-3 border-t border-forest/10 flex flex-wrap items-center justify-between text-xs text-ink-muted">
        <div className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-forest" />
          <span>
            {lang === 'th'
              ? 'ระบบจัดเก็บประวัติการซื้อเพื่อคำนวณสิทธิประโยชน์วันใจคลับ'
              : 'Trends tracked across online orders & walk-up counter purchases'}
          </span>
        </div>
        <div className="font-mono text-[11px] text-forest font-semibold mt-1 sm:mt-0">
          {lang === 'th' ? 'อัปเดตอัตโนมัติทุกเช้า 06:00 น.' : 'Refreshed daily at 06:00 AM'}
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, lang, metric }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as DayData;
    return (
      <div className="rounded-2xl liquid-glass border border-white/90 p-3 shadow-xl backdrop-blur-md text-xs text-ink min-w-[170px]">
        <div className="font-bold text-forest border-b border-forest/10 pb-1.5 mb-1.5">
          {data.fullDate}
        </div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-ink-muted">
            {lang === 'th' ? 'ยอดใช้จ่าย:' : 'Spent:'}
          </span>
          <span className="font-mono font-bold text-forest text-sm">
            ฿{data.spending.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-ink-muted">
            {lang === 'th' ? 'รายการสินค้า:' : 'Items:'}
          </span>
          <span className="font-mono font-semibold text-terracotta">
            {data.itemCount} {lang === 'th' ? 'ชิ้น' : 'items'}
          </span>
        </div>
        {data.orderCount > 0 && (
          <div className="flex items-center justify-between gap-3 text-[10px] text-ink-muted pt-1 border-t border-forest/10">
            <span>{lang === 'th' ? 'จำนวนครั้ง:' : 'Orders:'}</span>
            <span className="font-mono">{data.orderCount}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}
