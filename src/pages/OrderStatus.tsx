import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  QrCode,
  Check,
  Clock,
  ChefHat,
  Package,
  XCircle,
  RefreshCw,
  Bell,
  BellRing,
  Mail,
  Sparkles,
  Volume2,
  ExternalLink,
} from 'lucide-react';
import type { Order } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { baht, shortId, timeAgo } from '../lib/format';
import { useCart } from '../contexts/CartContext';
import {
  db,
  doc,
  onSnapshot,
  requestFCMToken,
  playReadyChime,
  showPushNotification,
} from '../lib/firebase';

const STEPS: { key: Order['status']; icon: any }[] = [
  { key: 'pending', icon: Clock },
  { key: 'paid', icon: Check },
  { key: 'preparing', icon: ChefHat },
  { key: 'ready', icon: Package },
  { key: 'done', icon: Check },
];

export default function OrderStatus() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const { add } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [fcmEnabled, setFcmEnabled] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [fcmLoading, setFcmLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string>('');
  const [statusAlertShown, setStatusAlertShown] = useState(false);

  const prevStatusRef = useRef<string | null>(null);

  // Poll fallback / initial load
  const loadOrder = () => {
    fetch(`/api/orders?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        const o = Array.isArray(data) ? data[0] : data;
        if (o) {
          handleStatusChange(o);
          setOrder(o);
        }
      })
      .catch((err) => console.warn('Order fetch error:', err))
      .finally(() => setLoading(false));
  };

  // Sound and push notification trigger
  const handleStatusChange = (newOrder: Order) => {
    const prev = prevStatusRef.current;
    if (prev && prev !== 'ready' && newOrder.status === 'ready') {
      // Trigger chime and notification
      playReadyChime();
      showPushNotification('น้ำเต้าหู้ของคุณพร้อมรับแล้ว! 🌿', {
        body: `ออเดอร์ #${newOrder.id} ต้มร้อนๆ รอส่งมอบที่ร้านวันใจ Soy ถนนวัวลาย`,
        tag: `order-${newOrder.id}`,
      });
      setStatusAlertShown(true);
      if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200, 100, 400]);
    }
    prevStatusRef.current = newOrder.status;
  };

  // Real-time Firestore listener + polling fallback
  useEffect(() => {
    loadOrder();

    let unsubscribe: (() => void) | undefined = undefined;
    if (db && id) {
      try {
        const orderRef = doc(db, 'orders', String(id));
        unsubscribe = onSnapshot(
          orderRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const liveData = docSnap.data() as Order;
              handleStatusChange(liveData);
              setOrder(liveData);
              setLoading(false);
            }
          },
          (err) => {
            console.warn('[Firestore Live] Snapshot error, falling back to polling:', err);
          }
        );
      } catch (e) {
        console.warn('Realtime listener failed:', e);
      }
    }

    const iv = setInterval(loadOrder, 6000);
    return () => {
      clearInterval(iv);
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Check existing notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setFcmEnabled(true);
      }
    }
  }, []);

  const enableFCM = async () => {
    setFcmLoading(true);
    const result = await requestFCMToken();
    setFcmLoading(false);
    if (result.token) {
      setFcmToken(result.token);
      setFcmEnabled(true);
      playReadyChime();
      showPushNotification('เปิดการแจ้งเตือนเรียบร้อย! 🔔', {
        body: 'เราจะส่งข้อความแจ้งเตือนทันทีที่น้ำเต้าหู้ของคุณพร้อมรับ',
      });
      // Save FCM token to the order
      if (order?.id) {
        fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: order.id, fcm_token: result.token }),
        }).catch(() => {});
      }
    } else {
      alert(result.error || 'Could not enable push notifications');
    }
  };

  const handleSendEmailReceipt = async () => {
    if (!order) return;
    setEmailSending(true);
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailSentSuccess(true);
        setTimeout(() => setEmailSentSuccess(false), 4000);
      }
    } catch (e) {
      console.warn('Failed to send email:', e);
    } finally {
      setEmailSending(false);
    }
  };

  const handlePreviewEmail = async () => {
    if (!order) return;
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, previewOnly: true }),
      });
      const data = await res.json();
      if (data.previewHtml) {
        setEmailPreviewHtml(data.previewHtml);
        setShowEmailPreview(true);
      }
    } catch (e) {
      console.warn('Preview error:', e);
    }
  };

  const reorder = () => {
    if (!order) return;
    order.items.forEach((it) =>
      add({
        key: `${it.slug}-reorder-${Date.now()}-${Math.random()}`,
        product_id: it.product_id,
        slug: it.slug,
        name_th: it.name_th,
        name_en: it.name_en,
        image_url: '',
        base_price: it.unit_price,
        vessel: (it.vessel as any) || 'bag',
        sweetness: (it.sweetness as any) || 'normal',
        temp: (it.temp as any) || 'na',
        extras: it.extras || [],
        qty: it.qty,
        unit_price: it.unit_price,
        notes: it.notes,
      })
    );
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-muted">
        <div className="liquid-glass p-8 rounded-3xl text-center">
          <RefreshCw className="h-8 w-8 text-forest animate-spin mx-auto mb-2" />
          <p className="font-medium text-forest">{t.loading}</p>
        </div>
      </div>
    );

  if (!order)
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-muted">
        <div className="liquid-glass p-8 rounded-3xl text-center">
          <p className="text-forest font-semibold">{lang === 'th' ? 'ไม่พบออเดอร์' : 'Order not found'}</p>
          <Link to="/" className="mt-4 inline-block px-5 py-2 rounded-full bg-forest text-cream text-sm">
            {t.home}
          </Link>
        </div>
      </div>
    );

  const currentIndex = order.status === 'cancelled' ? -1 : STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen pb-24 bg-cream">
      {/* iOS 27 Liquid Glass Header */}
      <header className="sticky top-0 z-30 liquid-glass border-b border-white/40">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="h-10 w-10 rounded-2xl liquid-pill flex items-center justify-center text-forest hover:bg-forest/10 transition active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="font-display italic font-bold text-forest text-xl leading-none">
                {t.orderStatus}
              </div>
              <div className="text-xs text-ink-muted font-mono mt-0.5">
                {shortId(order.id)} · {timeAgo(order.created_at, lang)}
              </div>
            </div>
          </div>

          {/* FCM Real-time Push Status Indicator */}
          <button
            onClick={enableFCM}
            className={`h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
              fcmEnabled
                ? 'bg-forest/15 text-forest border border-forest/20'
                : 'bg-terracotta text-cream hover:bg-terracotta-dark'
            }`}
          >
            {fcmEnabled ? (
              <>
                <BellRing className="h-3.5 w-3.5 text-forest" />
                <span>{lang === 'th' ? 'แจ้งเตือนเปิดแล้ว' : 'Alerts Active'}</span>
              </>
            ) : (
              <>
                <Bell className="h-3.5 w-3.5" />
                <span>{fcmLoading ? '...' : lang === 'th' ? 'เปิดแจ้งเตือน' : 'Enable Push'}</span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Ready for Pickup Live Banner (Triggered by FCM / Firestore) */}
        {order.status === 'ready' && (
          <div className="rounded-3xl liquid-glass-accent p-5 text-cream relative overflow-hidden shadow-xl animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-honey" />
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wider font-bold text-honey">
                  {lang === 'th' ? 'พร้อมรับแล้วตอนนี้!' : 'READY FOR PICKUP!'}
                </div>
                <h3 className="font-display italic font-bold text-xl text-white mt-0.5">
                  {lang === 'th'
                    ? 'น้ำเต้าหู้ของคุณต้มสดพร้อมส่งมอบแล้ว'
                    : 'Your fresh soy milk order is packed & waiting!'}
                </h3>
                <p className="text-xs text-white/90 mt-1">
                  {lang === 'th'
                    ? 'เชิญแวะรับได้ที่ร้านวันใจ Soy ถนนวัวลาย ซอย 2 เชียงใหม่ ได้ทันที'
                    : 'Please pick up at WanJai Soy cart, Walai Road Soi 2, Chiang Mai.'}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={playReadyChime}
                    className="h-8 px-3 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    {lang === 'th' ? 'เล่นเสียงกระดิ่ง' : 'Play Chime'}
                  </button>
                  <a
                    href="https://maps.google.com/?q=15%2F4+Soi+2+Walai+Rd+Chiang+Mai"
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 px-3.5 rounded-full bg-cream text-forest text-xs font-bold flex items-center gap-1 shadow transition hover:bg-white"
                  >
                    <MapPin className="h-3 w-3" />
                    {lang === 'th' ? 'นำทางไปร้าน' : 'Get Directions'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Big Status Card - iOS 27 Liquid Glass Style */}
        <div className="rounded-3xl liquid-glass-dark text-cream p-6 relative overflow-hidden liquid-specular shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-honey font-bold">
                {t.status}
              </span>
              <span className="text-[11px] text-cream/70 bg-cream/10 px-2.5 py-0.5 rounded-full border border-cream/15">
                Firebase Firestore Realtime
              </span>
            </div>

            <div className="font-display italic font-bold text-3xl sm:text-4xl mt-1.5 capitalize text-cream">
              {order.status === 'pending' && (lang === 'th' ? 'รอชำระเงิน' : 'Waiting for payment')}
              {order.status === 'paid' && (lang === 'th' ? 'ชำระแล้ว · รอคิวต้ม' : 'Payment received')}
              {order.status === 'preparing' && (lang === 'th' ? 'กำลังเตรียมต้มสด' : 'Preparing your order')}
              {order.status === 'ready' && (lang === 'th' ? 'พร้อมรับที่ร้านแล้ว!' : 'Ready for pickup')}
              {order.status === 'done' && t.done}
              {order.status === 'cancelled' && t.cancelled}
            </div>

            <div className="mt-2 flex items-center gap-2 text-cream/80 text-sm">
              <Clock className="h-4 w-4 text-honey" />
              <span>{t.pickupTime}:</span>
              <strong className="text-cream">{order.pickup_time || '10-15 นาที'}</strong>
            </div>

            {/* Progress Track */}
            <div className="mt-6 grid grid-cols-5 gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s.key}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    i <= currentIndex ? 'bg-honey shadow-[0_0_8px_rgba(232,180,74,0.6)]' : 'bg-cream/15'
                  }`}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-1">
              {STEPS.map((s, i) => {
                const Ic = s.icon;
                return (
                  <div
                    key={s.key}
                    className={`flex flex-col items-center gap-1 text-[10px] ${
                      i <= currentIndex ? 'text-cream font-bold' : 'text-cream/40'
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center transition ${
                        i <= currentIndex
                          ? 'bg-honey text-forest shadow-sm'
                          : 'bg-cream/10 text-cream/50'
                      }`}
                    >
                      <Ic className="h-4 w-4" />
                    </div>
                    <span>
                      {s.key === 'pending' && t.pending}
                      {s.key === 'paid' && t.paid}
                      {s.key === 'preparing' && t.preparing}
                      {s.key === 'ready' && t.ready}
                      {s.key === 'done' && t.done}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FCM Push Notification Notification Banner */}
        <div className="rounded-2xl liquid-glass p-4 border border-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-forest uppercase tracking-wider">
                {lang === 'th' ? 'การแจ้งเตือน Real-time (FCM)' : 'Real-Time FCM Push Alerts'}
              </div>
              <div className="text-xs text-ink-muted">
                {fcmEnabled
                  ? lang === 'th'
                    ? 'เปิดระบบแจ้งเตือนแล้ว — จะแจ้งเตือนทันทีเมื่อพร้อมรับ'
                    : 'Push alerts enabled — you will be alerted when ready'
                  : lang === 'th'
                  ? 'กดเปิดแจ้งเตือนเพื่อรับการสะกิดเตือนเมื่อออเดอร์พร้อม'
                  : 'Enable push alerts to get notified the second your order is ready'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!fcmEnabled ? (
              <button
                onClick={enableFCM}
                className="h-9 px-4 rounded-full bg-forest text-cream text-xs font-bold hover:bg-forest-dark transition active:scale-95 shadow-xs"
              >
                {fcmLoading ? '...' : lang === 'th' ? 'เปิดแจ้งเตือน' : 'Enable'}
              </button>
            ) : (
              <button
                onClick={playReadyChime}
                className="h-9 px-3 rounded-full bg-cream border border-forest/20 text-forest text-xs font-semibold flex items-center gap-1 hover:bg-forest/5"
              >
                <Volume2 className="h-3.5 w-3.5" />
                {lang === 'th' ? 'ทดสอบเสียง' : 'Test Chime'}
              </button>
            )}
          </div>
        </div>

        {/* Automated Order Summary Email Feature (Firebase Function trigger) */}
        <div className="rounded-2xl liquid-glass p-4 border border-white/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-honey/20 text-forest flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-forest uppercase tracking-wider">
                  {lang === 'th' ? 'ใบเสร็จทางอีเมลอัตโนมัติ (Firebase Function)' : 'Automated Email Receipt'}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {lang === 'th'
                    ? 'ระบบจะส่งสรุปคำสั่งซื้อและใบเสร็จอัตโนมัติเมื่อยืนยันการชำระเงิน'
                    : 'Automated receipt dispatched via Firebase Cloud Function upon payment'}
                </div>
                <div className="font-mono text-xs text-forest mt-1">
                  {order.email || (order as any).customer_email || 'banheruka@gmail.com'}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              <button
                onClick={handlePreviewEmail}
                className="h-8 px-3 rounded-full bg-cream border border-forest/15 text-forest text-xs font-semibold hover:bg-forest/5 flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                {lang === 'th' ? 'ดูพรีวิวใบเสร็จ' : 'Preview'}
              </button>
              <button
                onClick={handleSendEmailReceipt}
                disabled={emailSending}
                className={`h-8 px-3.5 rounded-full text-xs font-bold transition flex items-center gap-1 shadow-xs ${
                  emailSentSuccess
                    ? 'bg-forest text-cream'
                    : 'bg-terracotta text-cream hover:bg-terracotta-dark'
                }`}
              >
                {emailSending ? (
                  '...'
                ) : emailSentSuccess ? (
                  <>
                    <Check className="h-3 w-3" />
                    {lang === 'th' ? 'ส่งแล้ว!' : 'Sent!'}
                  </>
                ) : (
                  lang === 'th' ? 'ส่งอีเมลซ้ำ' : 'Resend'
                )}
              </button>
            </div>
          </div>

          {/* Email Preview Modal / Drawer */}
          {showEmailPreview && (
            <div className="mt-4 pt-4 border-t border-forest/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-forest">
                  {lang === 'th' ? 'ตัวอย่างอีเมลที่จะส่งให้ลูกค้า:' : 'Email Summary Preview:'}
                </span>
                <button
                  onClick={() => setShowEmailPreview(false)}
                  className="text-xs text-ink-muted hover:text-ink underline"
                >
                  {lang === 'th' ? 'ปิด' : 'Close'}
                </button>
              </div>
              <div
                className="rounded-2xl border border-forest/15 bg-white p-3 max-h-96 overflow-y-auto shadow-inner"
                dangerouslySetInnerHTML={{ __html: emailPreviewHtml }}
              />
            </div>
          )}
        </div>

        {/* Payment Status Card */}
        <section className="rounded-2xl liquid-glass p-4 flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-2xl flex items-center justify-center shadow-xs ${
              order.payment_status === 'paid' ? 'bg-forest text-cream' : 'bg-terracotta text-cream'
            }`}
          >
            {order.payment_status === 'paid' ? <Check className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="text-xs text-ink-muted uppercase tracking-widest font-semibold">
              {lang === 'th' ? 'การชำระเงิน' : 'Payment'}
            </div>
            <div className="font-semibold text-ink text-sm">
              {order.payment_method === 'promptpay' ? 'PromptPay Thai QR' : lang === 'th' ? 'เงินสด' : 'Cash'} ·{' '}
              <span className={order.payment_status === 'paid' ? 'text-forest font-bold' : 'text-terracotta font-bold'}>
                {order.payment_status === 'paid' ? t.paid : t.pending}
              </span>
            </div>
          </div>
          <div className="font-display italic font-bold text-forest text-2xl">
            {baht(order.total)}
          </div>
        </section>

        {/* Items */}
        <section className="rounded-2xl liquid-glass p-4">
          <div className="text-xs uppercase tracking-widest text-ink-muted font-bold mb-3">
            {t.yourItems}
          </div>
          <ul className="space-y-2.5">
            {order.items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 text-sm pb-2 border-b border-forest/5 last:border-b-0">
                <div className="h-8 w-8 rounded-xl bg-forest/10 text-forest flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  {it.qty}×
                </div>
                <div className="flex-1">
                  <div className="font-thai font-semibold text-ink">
                    {lang === 'th' ? it.name_th : it.name_en}
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    {[it.vessel, it.sweetness, it.temp !== 'na' ? it.temp : null, it.notes]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div className="font-display italic font-bold text-forest">
                  {baht((it.unit_price || it.base_price || 0) * it.qty)}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Pickup Location */}
        <section className="rounded-2xl liquid-glass p-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-terracotta mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-ink-muted font-bold">
                {t.pickupOnly}
              </div>
              <div className="font-thai font-semibold text-ink mt-0.5">
                15/4 ซอย 2 ถ.วัวลาย ต.หายยา อ.เมือง จ.เชียงใหม่
              </div>
              <a
                href="https://maps.google.com/?q=15%2F4+Soi+2+Walai+Rd+Chiang+Mai"
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 inline-flex h-9 items-center gap-2 rounded-full bg-forest text-cream px-4 text-xs font-semibold hover:bg-forest-dark transition"
              >
                <MapPin className="h-3.5 w-3.5" /> {t.directions}
              </a>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={reorder}
            className="h-12 rounded-full bg-terracotta text-cream font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-terracotta-dark active:scale-95 transition"
          >
            <RefreshCw className="h-4 w-4" /> {t.reorder}
          </button>
          <Link
            to="/"
            className="h-12 rounded-full liquid-glass border-2 border-forest/20 text-forest font-bold text-sm flex items-center justify-center gap-2 hover:bg-forest/5 active:scale-95 transition"
          >
            {t.home}
          </Link>
        </div>

        {order.status === 'cancelled' && (
          <div className="mt-4 rounded-2xl bg-chili/10 border-2 border-chili/30 p-4 text-chili font-semibold flex items-center gap-2">
            <XCircle className="h-5 w-5" /> {t.cancelled}
          </div>
        )}
      </main>
    </div>
  );
}

