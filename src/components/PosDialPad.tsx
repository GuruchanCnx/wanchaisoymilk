import { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  ChefHat,
  Banknote,
  QrCode,
  Sparkles,
  ShoppingBag,
  Delete,
  RotateCcw,
} from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';
import { baht } from '../lib/format';
import PromptPayQR from './PromptPayQR';

interface QuickProduct {
  id: number;
  slug: string;
  name_th: string;
  name_en: string;
  price: number;
  category: 'drinks' | 'snacks' | 'dips';
}

const QUICK_PRODUCTS: QuickProduct[] = [
  { id: 101, slug: 'soy-complete', name_th: 'น้ำเต้าหู้ทรงเครื่อง', name_en: 'Soy Milk Complete', price: 15, category: 'drinks' },
  { id: 102, slug: 'soy-plain', name_th: 'น้ำเต้าหู้ธรรมดา', name_en: 'Plain Soy Milk', price: 10, category: 'drinks' },
  { id: 103, slug: 'fresh-milk', name_th: 'นมสดต้มหน้าร้าน', name_en: 'Boiled Cow Milk', price: 20, category: 'drinks' },
  { id: 104, slug: 'ginger-soup', name_th: 'น้ำขิงทรงเครื่อง', name_en: 'Hot Ginger Soup', price: 15, category: 'drinks' },
  { id: 105, slug: 'patongko', name_th: 'ปาท่องโก๋กรอบ', name_en: 'Crispy Patongko', price: 3, category: 'snacks' },
  { id: 106, slug: 'fried-bun', name_th: 'ซาลาเปาทอด', name_en: 'Fried Bun', price: 3, category: 'snacks' },
  { id: 107, slug: 'pandan-dip', name_th: 'สังขยาใบเตยสด', name_en: 'Pandan Custard Dip', price: 10, category: 'dips' },
  { id: 108, slug: 'iced-milk', name_th: 'นมสดเย็นหวานน้อย', name_en: 'Iced Cow Milk', price: 25, category: 'drinks' },
];

interface TicketItem {
  id: string;
  name_th: string;
  name_en: string;
  unit_price: number;
  qty: number;
}

interface PosDialPadProps {
  onClose?: () => void;
  onOrderCreated: () => void;
  isEmbedded?: boolean;
}

export default function PosDialPad({ onClose, onOrderCreated, isEmbedded = false }: PosDialPadProps) {
  const { lang } = useLang();
  const { showToast } = useToast();

  // Dial pad input state (for custom Baht amounts or manual calculation)
  const [dialInput, setDialInput] = useState<string>('');
  const [ticketItems, setTicketItems] = useState<TicketItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'promptpay'>('cash');
  const [cashTendered, setCashTendered] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState<string>(lang === 'th' ? 'ลูกค้าหน้าร้าน (Walk-by)' : 'Walk-by Customer');
  const [packaging, setPackaging] = useState<'bag' | 'cup' | 'dine-in'>('bag');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);

  // Compute total
  const total = useMemo(() => {
    return ticketItems.reduce((sum, item) => sum + item.unit_price * item.qty, 0);
  }, [ticketItems]);

  // Compute change
  const change = useMemo(() => {
    if (cashTendered === null || cashTendered < total) return 0;
    return cashTendered - total;
  }, [cashTendered, total]);

  // Handle number pad button clicks
  const handleDigit = (digit: string) => {
    triggerHaptic('tap');
    if (dialInput.length > 5) return;
    if (digit === '00' && (dialInput === '' || dialInput === '0')) return;
    if (dialInput === '0' && digit !== '00') {
      setDialInput(digit);
      return;
    }
    setDialInput((prev) => prev + digit);
  };

  const handleBackspace = () => {
    triggerHaptic('light');
    setDialInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    triggerHaptic('light');
    setDialInput('');
  };

  // Add custom Baht item to ticket from dial pad
  const handleAddCustomAmount = () => {
    const val = parseInt(dialInput, 10);
    if (!val || val <= 0) return;
    triggerHaptic('medium');
    const newItem: TicketItem = {
      id: `custom-${Date.now()}`,
      name_th: `สินค้าพิเศษหน้าร้าน (฿${val})`,
      name_en: `Walk-by Custom (฿${val})`,
      unit_price: val,
      qty: 1,
    };
    setTicketItems((prev) => [...prev, newItem]);
    setDialInput('');
  };

  // Quick product tap
  const handleAddProduct = (prod: QuickProduct) => {
    triggerHaptic('medium');
    setTicketItems((prev) => {
      const existing = prev.find((item) => item.name_th === prod.name_th);
      if (existing) {
        return prev.map((item) =>
          item.name_th === prod.name_th ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `${prod.slug}-${Date.now()}`,
          name_th: prod.name_th,
          name_en: prod.name_en,
          unit_price: prod.price,
          qty: 1,
        },
      ];
    });
  };

  const updateItemQty = (id: string, delta: number) => {
    triggerHaptic('light');
    setTicketItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as TicketItem[]
    );
  };

  const removeItem = (id: string) => {
    setTicketItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearTicket = () => {
    setTicketItems([]);
    setDialInput('');
    setCashTendered(null);
  };

  // Submit order to API
  const handleRegisterOrder = async (orderStatus: 'preparing' | 'done') => {
    if (ticketItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const orderPayload = {
        customer_name: customerName,
        phone: '-',
        email: '',
        pickup_time: lang === 'th' ? 'หน้าร้านทันที' : 'Walk-by Counter',
        payment_method: paymentMethod,
        payment_status: 'paid',
        status: orderStatus,
        total,
        notes: `Walk-by (${packaging}) · ${paymentMethod === 'cash' ? `Cash: ฿${cashTendered || total}` : 'PromptPay QR'}`,
        items: ticketItems.map((item) => ({
          product_id: 1,
          slug: 'walk-by-item',
          name_th: item.name_th,
          name_en: item.name_en,
          image_url: '/images/hero.jpg',
          base_price: item.unit_price,
          unit_price: item.unit_price,
          vessel: packaging,
          sweetness: 'normal',
          temp: 'hot',
          qty: item.qty,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        const created = await res.json();
        // Play success chime
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
          osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
          osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.start();
          osc.stop(ctx.currentTime + 0.45);
        } catch {}

        triggerHaptic('success');
        showToast(
          lang === 'th' ? `ลงบิลหน้าร้านสำเร็จ! #${created?.id || ''}` : `POS Order Saved! #${created?.id || ''}`,
          lang === 'th' ? `ยอดรวม ฿${total} บันทึกลงระบบคิวแล้ว` : `Total ฿${total} logged to live queue`,
          'success'
        );

        clearTicket();
        onOrderCreated();
        if (onClose) onClose();
      }
    } catch (err) {
      console.error('Failed to register walk-by order:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="bg-forest-dark text-cream rounded-3xl border border-cream/20 shadow-2xl flex flex-col overflow-hidden max-h-[92vh] w-full">
      {/* Header */}
      <div className="px-5 py-3.5 bg-forest border-b border-cream/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-2xl bg-honey text-forest flex items-center justify-center font-bold font-mono">
            ฿
          </div>
          <div>
            <h2 className="font-display italic font-bold text-xl text-honey leading-none">
              {lang === 'th' ? 'แป้นคิดเงินลูกค้าหน้าร้าน' : 'Walk-by POS Dial Pad'}
            </h2>
            <div className="text-[11px] text-cream/70 mt-0.5">
              {lang === 'th' ? 'กดคิดเงินและลงทะเบียนออเดอร์คนเดินผ่านทันที' : 'Fast counter cashiering for walk-up pedestrians'}
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition active:scale-95"
            aria-label="Close Dial Pad"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto flex-1">
        {/* Left Column: Quick Menu Items & Packaging (5 cols) */}
        <div className="md:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-honey font-bold">
              {lang === 'th' ? 'เมนูยอดนิยมหน้าร้าน' : 'Quick Menu Presets'}
            </span>
            <div className="flex gap-1">
              {(['bag', 'cup', 'dine-in'] as const).map((pk) => (
                <button
                  key={pk}
                  type="button"
                  onClick={() => setPackaging(pk)}
                  className={`px-2 py-0.5 text-[10px] rounded-lg font-bold transition ${
                    packaging === pk
                      ? 'bg-honey text-forest'
                      : 'bg-cream/10 text-cream/70 hover:bg-cream/15'
                  }`}
                >
                  {pk === 'bag'
                    ? lang === 'th' ? 'ใส่ถุง' : 'Bag'
                    : pk === 'cup'
                    ? lang === 'th' ? 'ใส่แก้ว' : 'Cup'
                    : lang === 'th' ? 'ทานนี่' : 'Dine'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Product Grid */}
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PRODUCTS.map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => handleAddProduct(prod)}
                className="p-2.5 rounded-2xl bg-cream/5 border border-cream/10 hover:bg-cream/15 active:scale-95 transition text-left flex flex-col justify-between h-20 group"
              >
                <div className="font-thai font-semibold text-xs leading-tight line-clamp-2 text-cream group-hover:text-honey transition">
                  {lang === 'th' ? prod.name_th : prod.name_en}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-mono font-bold text-honey">{baht(prod.price)}</span>
                  <span className="h-5 w-5 rounded-lg bg-cream/10 text-cream flex items-center justify-center text-xs group-hover:bg-honey group-hover:text-forest transition">
                    +
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Customer Name quick picker */}
          <div className="pt-1">
            <label className="text-[11px] text-cream/60 block mb-1">
              {lang === 'th' ? 'ป้ายชื่อลูกค้า' : 'Customer Tag'}
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                lang === 'th' ? 'ลูกค้าหน้าร้าน' : 'Walk-by Customer',
                lang === 'th' ? 'ลูกค้าประจำ' : 'Regular Guest',
                lang === 'th' ? 'นักท่องเที่ยว' : 'Tourist',
                lang === 'th' ? 'เพื่อนบ้านวัวลาย' : 'Walai Neighbor',
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCustomerName(tag)}
                  className={`px-2.5 py-1 rounded-full text-[11px] transition ${
                    customerName === tag
                      ? 'bg-terracotta text-cream font-bold'
                      : 'bg-cream/5 text-cream/70 hover:bg-cream/10'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center / Right Column: Dial Pad & Ticket (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3">
          {/* Current Ticket View */}
          <div className="bg-black/30 rounded-2xl p-3 border border-cream/10 min-h-[130px] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-cream/10">
              <span className="text-xs font-bold text-honey flex items-center gap-1">
                <ShoppingBag className="h-3.5 w-3.5" />
                {lang === 'th' ? 'รายการที่สั่ง' : 'Current Ticket'} ({ticketItems.reduce((acc, i) => acc + i.qty, 0)})
              </span>
              {ticketItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearTicket}
                  className="text-[11px] text-red-300 hover:text-red-200 flex items-center gap-1 transition"
                >
                  <Trash2 className="h-3 w-3" /> {lang === 'th' ? 'ล้าง' : 'Clear'}
                </button>
              )}
            </div>

            {ticketItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-cream/40 italic">
                {lang === 'th' ? 'กดเลือกเมนูทางซ้าย หรือกดตัวเลขบนแป้นคิดเงิน' : 'Tap left menu or enter custom amount on dial pad'}
              </div>
            ) : (
              <div className="max-h-28 overflow-y-auto space-y-1.5 py-1.5 pr-1">
                {ticketItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs bg-cream/5 px-2.5 py-1.5 rounded-xl border border-cream/5"
                  >
                    <div className="font-thai truncate flex-1 pr-2">
                      {lang === 'th' ? item.name_th : item.name_en}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-black/40 rounded-lg px-1.5 py-0.5 border border-cream/10">
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.id, -1)}
                          className="h-4 w-4 flex items-center justify-center hover:text-honey text-cream/70"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="font-mono font-bold text-honey px-1">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.id, 1)}
                          className="h-4 w-4 flex items-center justify-center hover:text-honey text-cream/70"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <span className="font-mono font-bold w-12 text-right">
                        {baht(item.unit_price * item.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-cream/40 hover:text-red-300 p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Display */}
            <div className="pt-2 border-t border-cream/10 flex items-baseline justify-between">
              <span className="text-xs uppercase text-cream/70 font-semibold">
                {lang === 'th' ? 'ยอดรวมทั้งหมด' : 'Grand Total'}
              </span>
              <span className="font-display italic font-bold text-2xl text-honey">{baht(total)}</span>
            </div>
          </div>

          {/* Numeric Dial Pad */}
          <div className="space-y-2">
            {/* Dial Input Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/50 border border-cream/20 rounded-xl px-3 h-10 flex items-center justify-between font-mono text-lg">
                <span className="text-xs text-cream/50">Custom ฿</span>
                <span className="font-bold text-honey">{dialInput ? `฿${dialInput}` : '฿0'}</span>
              </div>
              <button
                type="button"
                onClick={handleAddCustomAmount}
                disabled={!dialInput || parseInt(dialInput, 10) <= 0}
                className="h-10 px-3.5 rounded-xl bg-honey text-forest font-bold text-xs flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none hover:bg-honey-dark active:scale-95 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                {lang === 'th' ? 'เพิ่มยอดนี้' : 'Add ฿'}
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-10 w-10 rounded-xl bg-cream/10 hover:bg-cream/20 flex items-center justify-center text-cream active:scale-95 transition"
              >
                <Delete className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="h-10 w-10 rounded-xl bg-cream/10 hover:bg-cream/20 flex items-center justify-center text-cream active:scale-95 transition"
                title="Clear input"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Keypad Grid (1-9, 0, 00, Quick +Baht) */}
            <div className="grid grid-cols-4 gap-1.5">
              {['1', '2', '3'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  className="h-10 rounded-xl bg-cream/10 hover:bg-cream/20 active:scale-95 font-mono text-base font-bold text-cream flex items-center justify-center transition shadow-xs"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleDigit('10')}
                className="h-10 rounded-xl bg-forest border border-cream/15 hover:bg-forest-dark text-[11px] font-mono font-bold text-cream active:scale-95 transition"
              >
                +10
              </button>

              {['4', '5', '6'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  className="h-10 rounded-xl bg-cream/10 hover:bg-cream/20 active:scale-95 font-mono text-base font-bold text-cream flex items-center justify-center transition shadow-xs"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleDigit('20')}
                className="h-10 rounded-xl bg-forest border border-cream/15 hover:bg-forest-dark text-[11px] font-mono font-bold text-cream active:scale-95 transition"
              >
                +20
              </button>

              {['7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  className="h-10 rounded-xl bg-cream/10 hover:bg-cream/20 active:scale-95 font-mono text-base font-bold text-cream flex items-center justify-center transition shadow-xs"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleDigit('50')}
                className="h-10 rounded-xl bg-forest border border-cream/15 hover:bg-forest-dark text-[11px] font-mono font-bold text-cream active:scale-95 transition"
              >
                +50
              </button>

              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-10 rounded-xl bg-cream/10 hover:bg-cream/20 active:scale-95 font-mono text-base font-bold text-cream flex items-center justify-center transition"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleDigit('00')}
                className="h-10 rounded-xl bg-cream/10 hover:bg-cream/20 active:scale-95 font-mono text-base font-bold text-cream flex items-center justify-center transition"
              >
                00
              </button>
              <button
                type="button"
                onClick={() => handleDigit('5')}
                className="h-10 rounded-xl bg-forest border border-cream/15 hover:bg-forest-dark text-[11px] font-mono font-bold text-cream active:scale-95 transition"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => handleDigit('100')}
                className="h-10 rounded-xl bg-forest border border-cream/15 hover:bg-forest-dark text-[11px] font-mono font-bold text-cream active:scale-95 transition"
              >
                +100
              </button>
            </div>
          </div>

          {/* Payment Method & Cash Tender Calculator */}
          <div className="space-y-2 pt-1 border-t border-cream/10">
            <div className="flex items-center justify-between">
              {/* Payment Method Toggle */}
              <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-cream/10">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    paymentMethod === 'cash'
                      ? 'bg-honey text-forest shadow-xs'
                      : 'text-cream/70 hover:text-cream'
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" />
                  {lang === 'th' ? 'เงินสด' : 'Cash'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('promptpay');
                    if (total > 0) setShowQRModal(true);
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    paymentMethod === 'promptpay'
                      ? 'bg-honey text-forest shadow-xs'
                      : 'text-cream/70 hover:text-cream'
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {lang === 'th' ? 'พร้อมเพย์' : 'PromptPay QR'}
                </button>
              </div>

              {/* Cash Quick Tender Buttons */}
              {paymentMethod === 'cash' && (
                <div className="flex gap-1">
                  {[
                    { label: 'Exact', val: total },
                    { label: '฿20', val: 20 },
                    { label: '฿50', val: 50 },
                    { label: '฿100', val: 100 },
                    { label: '฿500', val: 500 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => setCashTendered(btn.val)}
                      className={`h-8 px-2 rounded-lg text-[10px] font-mono font-bold border transition ${
                        cashTendered === btn.val
                          ? 'border-honey bg-honey text-forest'
                          : 'border-cream/15 bg-cream/5 text-cream/80 hover:bg-cream/10'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Change Indicator */}
            {paymentMethod === 'cash' && cashTendered !== null && cashTendered >= total && total > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-400/30 text-xs">
                <span className="text-emerald-200">
                  {lang === 'th' ? 'รับเงินมา:' : 'Tendered:'} <b>{baht(cashTendered)}</b>
                </span>
                <span className="text-emerald-300 font-bold font-mono text-sm">
                  {lang === 'th' ? 'เงินทอน:' : 'Change:'} {baht(change)}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={ticketItems.length === 0 || isSubmitting}
              onClick={() => handleRegisterOrder('preparing')}
              className="h-12 rounded-2xl bg-terracotta text-cream font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-terracotta-dark active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none shadow-md"
            >
              <ChefHat className="h-4 w-4" />
              {isSubmitting
                ? lang === 'th' ? 'กำลังบันทึก...' : 'Saving...'
                : lang === 'th' ? 'รับเงิน & เริ่มทำ (ครัว)' : 'Paid & Send Kitchen'}
            </button>

            <button
              type="button"
              disabled={ticketItems.length === 0 || isSubmitting}
              onClick={() => handleRegisterOrder('done')}
              className="h-12 rounded-2xl bg-honey text-forest font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-honey-dark active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none shadow-md"
            >
              <Check className="h-4 w-4" />
              {isSubmitting
                ? lang === 'th' ? 'กำลังบันทึก...' : 'Saving...'
                : lang === 'th' ? 'รับของทันที (เสร็จสิ้น)' : 'Immediate Takeaway (Done)'}
            </button>
          </div>
        </div>
      </div>

      {/* Embedded PromptPay QR Modal for Walk-up Customers */}
      {showQRModal && total > 0 && (
        <div className="duo-modal-overlay">
          <div className="duo-segment-center bg-cream text-ink rounded-3xl p-5 border-4 border-forest shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-forest/10 hover:bg-forest/20 flex items-center justify-center text-forest"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-center mb-3">
              <div className="font-display italic font-bold text-xl text-forest">
                {lang === 'th' ? 'สแกนจ่ายพร้อมเพย์หน้าร้าน' : 'Walk-by PromptPay QR'}
              </div>
              <div className="font-display italic font-bold text-2xl text-terracotta mt-1">
                {baht(total)}
              </div>
            </div>
            <PromptPayQR amount={total} promptPayId="081-234-5678" />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowQRModal(false);
                  handleRegisterOrder('done');
                }}
                className="flex-1 h-11 rounded-xl bg-forest text-cream font-bold text-xs flex items-center justify-center gap-1 hover:bg-forest-dark transition"
              >
                <Check className="h-4 w-4 text-honey" />
                {lang === 'th' ? 'ลูกค้าสแกนเรียบร้อยแล้ว' : 'Customer Has Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="duo-modal-overlay bg-black/60 backdrop-blur-md">
      <div className="duo-segment-center max-w-4xl">{content}</div>
    </div>
  );
}
