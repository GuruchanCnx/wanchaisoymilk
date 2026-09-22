import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Minus, Plus, Trash2, QrCode, Wallet, ShoppingBag, Clock, Sparkles } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { baht, shortId } from '../lib/format';
import LanguageToggle from '../components/LanguageToggle';
import PromptPayQR from '../components/PromptPayQR';

export default function Checkout() {
  const { t, lang } = useLang();
  const { items, updateQty, remove, subtotal, clear } = useCart();
  const nav = useNavigate();

  const [name, setName] = useState(() => localStorage.getItem('customer_name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('customer_phone') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('customer_email') || 'banheruka@gmail.com');
  const [pickup, setPickup] = useState('asap');
  const [pickupCustom, setPickupCustom] = useState('');
  const [pay, setPay] = useState<'promptpay' | 'cash'>('promptpay');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ id: number; localId?: string } | null>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  useEffect(() => { if (name) localStorage.setItem('customer_name', name); }, [name]);
  useEffect(() => { if (phone) localStorage.setItem('customer_phone', phone); }, [phone]);
  useEffect(() => { if (email) localStorage.setItem('customer_email', email); }, [email]);

  const pickupTime = pickup === 'asap' ? (lang === 'th' ? 'ตอนนี้ (ASAP)' : 'ASAP') : pickupCustom;

  const total = subtotal;

  const canPlace = items.length > 0 && name.trim().length > 0 && phone.trim().length >= 6 && (pickup === 'asap' || pickupCustom.length > 0);

  const placeOrder = async () => {
    if (!canPlace || placing) return;
    setPlacing(true);
    const optimisticId = `local-${Date.now()}`;

    // Optimistic UI: assume success, show placed state immediately
    setPlaced({ id: 0, localId: optimisticId });

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name,
          phone,
          email,
          customer_email: email,
          items: items.map((i) => ({
            product_id: i.product_id,
            slug: i.slug,
            name_th: i.name_th,
            name_en: i.name_en,
            qty: i.qty,
            unit_price: i.unit_price,
            vessel: i.vessel,
            sweetness: i.sweetness,
            temp: i.temp,
            extras: i.extras,
            notes: i.notes,
          })),
          total,
          pickup_time: pickupTime,
          payment_method: pay,
          notes,
        }),
      });
      if (!res.ok) throw new Error('Order failed');
      const order = await res.json();
      // Track for recent orders on this device
      try {
        const list: number[] = JSON.parse(localStorage.getItem('my_order_ids') || '[]');
        localStorage.setItem('my_order_ids', JSON.stringify([order.id, ...list].slice(0, 20)));
        const saved = JSON.parse(localStorage.getItem('wanjai_orders') || '[]');
        saved.unshift({
          id: order.id,
          created_at: new Date().toISOString(),
          total,
          items: items.map((i) => ({ ...i })),
          status: 'pending',
          payment_method: pay,
          pickup_time: pickupTime,
          email,
        });
        localStorage.setItem('wanjai_orders', JSON.stringify(saved.slice(0, 30)));
      } catch {}
      clear();
      nav(`/order/${order.id}`);
    } catch (err) {
      // Queue for later sync
      try {
        const queue = JSON.parse(localStorage.getItem('order_queue') || '[]');
        queue.push({ id: optimisticId, payload: { name, phone, email, items, total, pickup: pickupTime, pay, notes }, ts: Date.now() });
        localStorage.setItem('order_queue', JSON.stringify(queue));
      } catch {}
      alert(lang === 'th' ? 'ออฟไลน์ — เก็บคำสั่งไว้แล้ว จะส่งอัตโนมัติเมื่อกลับมาออนไลน์' : 'Offline — order saved and will sync when you reconnect.');
      setPlacing(false);
      setPlaced(null);
    }
  };

  if (items.length === 0 && !placed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="rounded-3xl bg-cream-soft border-2 border-forest/10 p-8 text-center max-w-md w-full">
          <ShoppingBag className="h-10 w-10 text-forest mx-auto" />
          <div className="mt-3 font-display italic font-bold text-2xl text-forest">{lang === 'th' ? 'ตะกร้ายังว่าง' : 'Your cart is empty'}</div>
          <div className="mt-1 text-ink-muted text-sm">{lang === 'th' ? 'เลือกเครื่องดื่มหรือขนมก่อนชำระเงิน' : 'Pick a drink or snack first'}</div>
          <Link to="/" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-forest text-cream px-5 font-semibold"><ArrowLeft className="h-4 w-4" /> {t.menu}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b-2 border-forest/10">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Link to="/" className="h-10 w-10 rounded-full bg-cream-soft border border-forest/15 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-forest" />
          </Link>
          <div className="flex-1">
            <div className="font-display italic font-bold text-forest text-xl leading-none">{t.checkout}</div>
            <div className="text-xs text-ink-muted">{lang === 'th' ? '3 ขั้นตอนเท่านั้น' : '3 steps max'}</div>
          </div>
          <LanguageToggle compact />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <Step n={1} label={t.yourItems}>
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.key} className="flex items-center gap-3 rounded-xl bg-cream-soft border border-forest/10 p-2">
                <img src={it.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-thai font-semibold text-ink text-sm truncate">{lang === 'th' ? it.name_th : it.name_en}</div>
                  <div className="text-[11px] text-ink-muted truncate">{it.vessel} · {it.sweetness}{it.temp !== 'na' ? ` · ${it.temp}` : ''}{it.notes ? ` · ${it.notes}` : ''}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(it.key, it.qty - 1)} className="h-8 w-8 rounded-full bg-cream border border-forest/20 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                  <span className="font-mono font-semibold w-6 text-center">{it.qty}</span>
                  <button onClick={() => updateQty(it.key, it.qty + 1)} className="h-8 w-8 rounded-full bg-forest text-cream flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                </div>
                <div className="w-16 text-right font-display italic font-bold text-forest">{baht(it.unit_price * it.qty)}</div>
                <button onClick={() => remove(it.key)} className="h-8 w-8 rounded-full text-chili flex items-center justify-center hover:bg-chili/10" aria-label={t.remove}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </Step>

        <Step n={2} label={lang === 'th' ? 'ข้อมูลรับของ' : 'Pickup details'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t.name}>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-12 rounded-xl border-2 border-forest/15 bg-cream-soft px-4 focus:outline-none focus:border-forest" placeholder={lang === 'th' ? 'เช่น เนย์' : 'e.g. Ploy'} />
            </Field>
            <Field label={t.phone}>
              <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-12 rounded-xl border-2 border-forest/15 bg-cream-soft px-4 focus:outline-none focus:border-forest" placeholder="08x xxx xxxx" />
            </Field>
          </div>
          <Field label={lang === 'th' ? 'อีเมลสำหรับรับใบเสร็จอัตโนมัติ (Automated Email Receipt)' : 'Email for Automated Receipt'}>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 rounded-xl border-2 border-forest/15 bg-cream-soft px-4 focus:outline-none focus:border-forest text-sm font-mono"
                placeholder="your-email@example.com"
              />
              <span className="absolute right-3 top-3 text-[10px] bg-forest/10 text-forest font-semibold px-2 py-1 rounded-md">
                Firebase Function
              </span>
            </div>
          </Field>
          <Field label={t.pickupTime}>
            <div className="flex flex-wrap gap-2">
              {[['asap', lang === 'th' ? 'ตอนนี้' : 'ASAP'], ['15', '+15 min'], ['30', '+30 min']].map(([v, l]) => (
                <button key={v} onClick={() => setPickup(v)} className={`h-11 px-4 rounded-full border-2 font-semibold text-sm ${pickup === v ? 'bg-forest text-cream border-forest' : 'bg-cream-soft text-ink border-forest/15'}`}>{l}</button>
              ))}
              <input type="time" value={pickup !== 'asap' && pickup !== '15' && pickup !== '30' ? pickup : ''} onChange={(e) => { setPickup(e.target.value); setPickupCustom(e.target.value); }} className="h-11 px-3 rounded-full border-2 border-forest/15 bg-cream-soft font-mono text-sm" />
            </div>
          </Field>
          <Field label={t.notes}>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={lang === 'th' ? 'เช่น มาเองนะคะ ขอบคุณ' : 'e.g. picking up myself, thanks'} className="w-full h-12 rounded-xl border-2 border-forest/15 bg-cream-soft px-4 focus:outline-none focus:border-forest" />
          </Field>
        </Step>

        <Step n={3} label={lang === 'th' ? 'ชำระเงิน' : 'Payment'}>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <PayButton
              chosen={pay === 'promptpay'}
              onClick={() => {
                setPay('promptpay');
                setQrGenerated(true);
              }}
              Icon={QrCode}
              label={t.payWithQR}
            />
            <PayButton
              chosen={pay === 'cash'}
              onClick={() => setPay('cash')}
              Icon={Wallet}
              label={t.payWithCash}
            />
          </div>

          {pay === 'promptpay' && (
            <div className="space-y-4">
              {!qrGenerated ? (
                <div className="rounded-2xl border-2 border-forest/20 bg-cream-soft p-5 text-center">
                  <div className="h-12 w-12 rounded-full bg-forest/10 text-forest mx-auto flex items-center justify-center mb-2">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div className="font-thai font-bold text-forest text-base">
                    {lang === 'th' ? 'ชำระผ่าน PromptPay QR' : 'Pay via PromptPay QR'}
                  </div>
                  <div className="text-xs text-ink-muted mt-1 max-w-xs mx-auto">
                    {lang === 'th'
                      ? 'กดปุ่มด้านล่างเพื่อสร้างคิวอาร์โค้ดพร้อมเพย์สำหรับยอดรวมคำสั่งซื้อของคุณ'
                      : 'Generate your instant Thai QR PromptPay code matching your cart total'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setQrGenerated(true)}
                    className="mt-4 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-forest text-cream font-bold text-sm shadow hover:bg-forest-dark active:scale-95 transition"
                  >
                    <Sparkles className="h-4 w-4 text-honey" />
                    {lang === 'th' ? 'สร้างคิวอาร์โค้ดพร้อมเพย์ (Generate QR)' : 'Generate Payment QR'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-forest flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-honey" />
                      {lang === 'th' ? 'คิวอาร์โค้ดพร้อมเพย์ของคุณพร้อมแล้ว' : 'Your Payment QR is Ready'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setQrGenerated(true)}
                      className="text-xs text-forest underline hover:text-terracotta"
                    >
                      {lang === 'th' ? 'รีเฟรชคิวอาร์' : 'Refresh QR'}
                    </button>
                  </div>
                  <PromptPayQR amount={total} promptPayId="081-234-5678" />
                </div>
              )}
            </div>
          )}

          {pay === 'cash' && (
            <div className="rounded-2xl border-2 border-forest/15 bg-cream-soft p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="text-xs text-ink-muted">
                <strong className="text-forest block font-thai text-sm">
                  {lang === 'th' ? 'ชำระเงินสดตอนรับสินค้าที่ร้าน' : 'Cash on Pickup'}
                </strong>
                {lang === 'th'
                  ? 'ชำระกับพ่อค้าแม่ค้าที่หน้าร้านวันใจ Soy ถนนวัวลายเมื่อมารับของ'
                  : 'Pay cash directly at our Wanchai Soy cart on Walai Road when picking up.'}
              </div>
            </div>
          )}
        </Step>

        <div className="mt-8 rounded-2xl bg-forest text-cream p-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-honey/80">{t.total}</div>
            <div className="font-display italic font-bold text-3xl">{baht(total)}</div>
          </div>
          <button
            onClick={placeOrder}
            disabled={!canPlace || placing}
            className="h-14 px-6 rounded-full bg-terracotta text-cream font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-terracotta-dark active:scale-95 transition"
          >
            {placing ? t.syncPending : t.placeOrder}
          </button>
        </div>
      </main>

      {placed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-forest/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-cream rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="h-14 w-14 rounded-full bg-forest text-cream mx-auto flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
            <div className="mt-4 font-display italic font-bold text-2xl text-forest">{t.orderPlaced}</div>
            <div className="text-sm text-ink-muted mt-1">{shortId(placed.id || 0)}</div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-full bg-forest text-cream font-bold flex items-center justify-center text-sm">{n}</div>
        <div className="font-display italic font-bold text-xl text-ink">{label}</div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="text-xs uppercase tracking-widest text-ink-muted font-semibold mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function PayButton({ chosen, onClick, Icon, label }: { chosen: boolean; onClick: () => void; Icon: any; label: string }) {
  return (
    <button onClick={onClick} className={`h-16 rounded-xl border-2 flex items-center gap-3 px-4 font-semibold ${chosen ? 'border-forest bg-forest text-cream' : 'border-forest/15 bg-cream-soft text-ink'}`}>
      <Icon className="h-5 w-5" /> <span className="text-sm text-left leading-tight">{label}</span>
    </button>
  );
}

function QrPlaceholder() {
  // Simple decorative QR grid; real QR comes from settings.promptpay_qr
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <rect x="0" y="0" width="100" height="100" fill="#fff" />
      {Array.from({ length: 100 }).map((_, i) => {
        const x = (i % 10) * 10;
        const y = Math.floor(i / 10) * 10;
        const hash = (x * 31 + y * 17 + 7) % 3;
        return hash === 0 ? <rect key={i} x={x} y={y} width="10" height="10" fill="#2B4D3E" /> : null;
      })}
      <rect x="0" y="0" width="30" height="30" fill="none" stroke="#2B4D3E" strokeWidth="8" />
      <rect x="70" y="0" width="30" height="30" fill="none" stroke="#2B4D3E" strokeWidth="8" />
      <rect x="0" y="70" width="30" height="30" fill="none" stroke="#2B4D3E" strokeWidth="8" />
    </svg>
  );
}
