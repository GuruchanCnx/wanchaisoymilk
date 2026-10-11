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
  Radio,
  FileDown,
  Printer,
  Award,
  Share2,
  Copy,
  Flame,
} from 'lucide-react';
import type { Order } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { baht, shortId, timeAgo } from '../lib/format';
import { useCart } from '../contexts/CartContext';
import { triggerHaptic } from '../lib/haptics';
import { useToast } from '../contexts/ToastContext';
import { downloadOrderReceiptPdf, printOrderReceipt } from '../lib/pdf-receipt';
import UserProfileModal from '../components/UserProfileModal';
import {
  db,
  doc,
  onSnapshot,
  requestFCMToken,
  playReadyChime,
  showPushNotification,
} from '../lib/firebase';

interface TrackStep {
  id: 'received' | 'preparing' | 'ready';
  labelTh: string;
  labelEn: string;
  subTh: string;
  subEn: string;
  icon: any;
}

const TRACK_STEPS: TrackStep[] = [
  {
    id: 'received',
    labelTh: 'รับออเดอร์แล้ว',
    labelEn: 'Received',
    subTh: 'รายการเข้าระบบ รอคิวต้มสดตามลำดับ',
    subEn: 'Order confirmed & queued for boiling',
    icon: Check,
  },
  {
    id: 'preparing',
    labelTh: 'กำลังเตรียมต้มสด',
    labelEn: 'Preparing',
    subTh: 'หม้อต้มกำลังทำงาน บรรจุถุง/แก้วตามสูตร',
    subEn: 'Simmering fresh soy milk & packing',
    icon: ChefHat,
  },
  {
    id: 'ready',
    labelTh: 'พร้อมรับที่หน้าร้าน',
    labelEn: 'Ready for Pickup',
    subTh: 'ต้มสดใหม่พร้อมส่งมอบ แวะรับได้ที่ร้านวันใจ',
    subEn: 'Packed and ready at WanJai cart, Walai Rd',
    icon: Package,
  },
];

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
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [fcmEnabled, setFcmEnabled] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [fcmLoading, setFcmLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
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

  const handleDownloadReceipt = async () => {
    if (!order || pdfDownloading) return;
    setPdfDownloading(true);
    triggerHaptic('medium');
    try {
      await downloadOrderReceiptPdf(order, {
        lang: lang as 'th' | 'en',
      });
      triggerHaptic('success');
      showToast(
        lang === 'th' ? 'ดาวน์โหลดใบเสร็จสำเร็จ 📄' : 'Receipt Downloaded 📄',
        lang === 'th' ? `บันทึกไฟล์ PDF สำหรับออเดอร์ #${order.id} แล้ว` : `Receipt #${order.id} PDF saved`,
        'success'
      );
    } catch (err: any) {
      console.error('PDF error:', err);
      triggerHaptic('error');
      showToast(
        lang === 'th' ? 'ดาวน์โหลดใบเสร็จไม่สำเร็จ' : 'Failed to download receipt',
        err?.message || 'Error generating PDF',
        'error'
      );
    } finally {
      setPdfDownloading(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!order) return;
    triggerHaptic('tap');
    try {
      printOrderReceipt(order, { lang: lang as 'th' | 'en' });
      showToast(
        lang === 'th' ? 'สั่งพิมพ์ใบเสร็จ 🖨️' : 'Printing Receipt 🖨️',
        lang === 'th' ? 'กำลังเปิดหน้าต่างการพิมพ์...' : 'Opening print dialog...',
        'info'
      );
    } catch (err) {
      console.warn('Print error, falling back to window.print():', err);
      window.print();
    }
  };

  /**
   * Share Order handler using Web Share API with clipboard fallback
   */
  const handleShareOrder = async () => {
    if (!order) return;
    triggerHaptic('medium');
    const shareUrl = window.location.href;
    const currentStepText =
      order.status === 'ready'
        ? lang === 'th' ? 'พร้อมรับที่ร้านแล้ว!' : 'Ready for pickup'
        : order.status === 'preparing'
        ? lang === 'th' ? 'กำลังเตรียมต้มสด' : 'Preparing'
        : lang === 'th' ? 'รับออเดอร์แล้ว' : 'Order received';

    const shareTitle = `น้ำเต้าหู้วันใจ Wanchai Soy Milk - ออเดอร์ #${order.id}`;
    const shareText =
      lang === 'th'
        ? `ติดตามสถานะออเดอร์ #${order.id} (${currentStepText}) ร้านวันใจ Soy ถนนวัวลาย เชียงใหม่`
        : `Track order #${order.id} (${currentStepText}) at Wanchai Soy Milk, Chiang Mai`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        triggerHaptic('success');
        showToast(
          lang === 'th' ? 'แชร์ออเดอร์สำเร็จ 📤' : 'Order Shared 📤',
          lang === 'th' ? 'แชร์ลิงก์ติดตามสถานะออเดอร์เรียบร้อยแล้ว' : 'Order tracking link shared successfully',
          'success'
        );
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User closed share sheet
      }
    }

    // Fallback: Copy link and Order ID to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      triggerHaptic('success');
      showToast(
        lang === 'th' ? 'คัดลอกลิงก์ออเดอร์แล้ว 📋' : 'Order Link Copied 📋',
        lang === 'th'
          ? `คัดลอกลิงก์ติดตามออเดอร์ #${order.id} เรียบร้อยแล้ว ส่งให้เพื่อนได้ทันที`
          : `Order link #${order.id} copied to clipboard`,
        'success'
      );
    } catch {
      showToast(
        lang === 'th' ? 'รหัสออเดอร์' : 'Order ID',
        `#${order.id}`,
        'info'
      );
    }
  };

  const handleCopyOrderId = async () => {
    if (!order) return;
    triggerHaptic('tap');
    try {
      await navigator.clipboard.writeText(String(order.id));
      showToast(
        lang === 'th' ? 'คัดลอกรหัสออเดอร์แล้ว 🏷️' : 'Order ID Copied 🏷️',
        `#${order.id}`,
        'success'
      );
    } catch {
      showToast('Order ID', `#${order.id}`, 'info');
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

          <div className="flex items-center gap-2">
            {/* Share Order button via Web Share API */}
            <button
              type="button"
              onClick={handleShareOrder}
              title={lang === 'th' ? 'แชร์ออเดอร์นี้' : 'Share this order'}
              className="h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 bg-cream/90 border border-forest/20 text-forest hover:bg-white shadow-2xs"
            >
              <Share2 className="h-3.5 w-3.5 text-forest" />
              <span className="hidden sm:inline">{t.shareOrder}</span>
            </button>

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

        {/* Dynamic 'Track My Order' Status Progress Card - iOS 27 Liquid Glass Style */}
        <div className="rounded-3xl liquid-glass-dark text-cream p-6 relative overflow-hidden liquid-specular shadow-2xl">
          <div className="relative z-10">
            {/* Header / Badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-honey font-bold">
                  {t.trackOrder}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-cream/90">
                  #{shortId(order.id)}
                </span>
              </div>
              <span className="text-[11px] text-cream/90 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1.5 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-300">Firestore Live</span>
              </span>
            </div>

            {/* Dynamic Status Headline */}
            <div className="font-display italic font-bold text-3xl sm:text-4xl mt-2 capitalize text-cream">
              {order.status === 'pending' && (lang === 'th' ? 'รับออเดอร์แล้ว · รอชำระเงิน' : 'Received · Waiting for payment')}
              {order.status === 'paid' && (lang === 'th' ? 'รับออเดอร์แล้ว · รอคิวต้ม' : 'Received · Payment Confirmed')}
              {order.status === 'preparing' && (lang === 'th' ? 'กำลังเตรียมต้มสดและบรรจุ' : 'Preparing Fresh Batch')}
              {order.status === 'ready' && (lang === 'th' ? 'พร้อมรับที่หน้าร้านแล้ว!' : 'Ready for Pickup')}
              {order.status === 'done' && (lang === 'th' ? 'ส่งมอบเรียบร้อย' : 'Order Completed')}
              {order.status === 'cancelled' && t.cancelled}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-cream/80 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-honey" />
                <span>{t.pickupTime}:</span>
                <strong className="text-cream">{order.pickup_time || '10-15 นาที'}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-cream/50">·</span>
                <span>{lang === 'th' ? 'ยอดรวม' : 'Total'}:</span>
                <strong className="text-honey font-bold">{baht(order.total)}</strong>
              </div>
            </div>

            {/* DYNAMIC 'TRACK MY ORDER' PROGRESS BAR (Steps: Received, Preparing, Ready for Pickup) */}
            <div className="mt-6">
              {(() => {
                // Determine active index among the 3 key phases
                const trackIdx =
                  order.status === 'cancelled'
                    ? -1
                    : order.status === 'pending' || order.status === 'paid'
                    ? 0
                    : order.status === 'preparing'
                    ? 1
                    : 2; // ready or done

                const percent =
                  order.status === 'cancelled'
                    ? 0
                    : trackIdx === 0
                    ? 33
                    : trackIdx === 1
                    ? 66
                    : 100;

                return (
                  <div className="space-y-4">
                    {/* Continuous Progress Bar Line */}
                    <div className="relative">
                      {/* Background Bar */}
                      <div className="h-3 w-full rounded-full bg-cream/15 overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-honey via-amber-400 to-emerald-400 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(232,180,74,0.7)]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* Percentage Tag */}
                      <div className="mt-1.5 flex justify-between text-[11px] font-mono text-cream/70">
                        <span>{lang === 'th' ? 'ความคืบหน้า' : 'Progress'}</span>
                        <span className="font-bold text-honey">{percent}%</span>
                      </div>
                    </div>

                    {/* Step Nodes: Received, Preparing, Ready for Pickup */}
                    <div className="grid grid-cols-3 gap-2">
                      {TRACK_STEPS.map((step, idx) => {
                        const StepIcon = step.icon;
                        const isDone = idx < trackIdx || (idx === 2 && (order.status === 'ready' || order.status === 'done'));
                        const isCurrent = idx === trackIdx;
                        const isPending = idx > trackIdx;

                        return (
                          <div
                            key={step.id}
                            className={`rounded-2xl p-2.5 sm:p-3 transition-all duration-300 border flex flex-col justify-between ${
                              isCurrent
                                ? 'bg-cream/15 border-honey/60 shadow-lg shadow-honey/10'
                                : isDone
                                ? 'bg-emerald-950/40 border-emerald-400/30'
                                : 'bg-cream/5 border-white/10 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div
                                className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                                  isDone
                                    ? 'bg-emerald-400 text-forest shadow-xs'
                                    : isCurrent
                                    ? 'bg-honey text-forest animate-pulse shadow-md'
                                    : 'bg-white/10 text-white/50'
                                }`}
                              >
                                <StepIcon className="h-4 w-4" />
                              </div>

                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                                  isDone
                                    ? 'bg-emerald-400/20 text-emerald-300'
                                    : isCurrent
                                    ? 'bg-honey/20 text-honey animate-pulse'
                                    : 'bg-white/10 text-white/40'
                                }`}
                              >
                                {idx + 1}/3
                              </span>
                            </div>

                            <div>
                              <div
                                className={`font-thai font-bold text-xs sm:text-sm leading-tight ${
                                  isCurrent ? 'text-honey' : isDone ? 'text-emerald-300' : 'text-cream/70'
                                }`}
                              >
                                {lang === 'th' ? step.labelTh : step.labelEn}
                              </div>
                              <div className="text-[10px] sm:text-[11px] text-cream/70 mt-1 leading-snug line-clamp-2">
                                {lang === 'th' ? step.subTh : step.subEn}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick Share Order & Copy ID Action Bar */}
            <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareOrder}
                  className="h-9 px-3.5 rounded-full bg-honey hover:bg-honey-dark text-forest font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{t.shareOrder}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 text-cream text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-white/20"
                  title={t.copyOrderId}
                >
                  <Copy className="h-3.5 w-3.5 text-honey" />
                  <span className="font-mono text-[11px]">#{order.id}</span>
                </button>
              </div>

              <div className="text-[11px] text-cream/70">
                {lang === 'th' ? 'ส่งต่อสถานะให้เพื่อนได้ทันที' : 'Share live status with friends'}
              </div>
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

        {/* Formatted PDF Receipt & Print Option */}
        <div className="rounded-2xl liquid-glass p-4 border border-white/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-forest/10 text-forest flex items-center justify-center shrink-0 mt-0.5">
                <FileDown className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
                  <span>{lang === 'th' ? 'ใบเสร็จรับเงิน PDF ทางการ' : 'Official PDF Receipt'}</span>
                  <span className="text-[10px] bg-forest/10 text-forest px-2 py-0.5 rounded-full font-mono font-semibold">
                    80mm POS
                  </span>
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {lang === 'th'
                    ? 'ดาวน์โหลดใบเสร็จรับเงินรูปแบบ PDF พร้อม QR ตรวจสอบ สำหรับบันทึกหรือเบิกจ่าย'
                    : 'Download crisp formatted PDF receipt with verification QR code'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="h-9 px-3.5 rounded-full bg-cream border border-forest/20 text-forest text-xs font-semibold hover:bg-forest/5 flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
                title={lang === 'th' ? 'พิมพ์ใบเสร็จ' : 'Print Receipt'}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{lang === 'th' ? 'พิมพ์' : 'Print'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadReceipt}
                disabled={pdfDownloading}
                className="h-9 px-4 rounded-full bg-forest text-cream hover:bg-forest-dark text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-xs disabled:opacity-50"
              >
                {pdfDownloading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>{lang === 'th' ? 'กำลังสร้าง PDF...' : 'Generating...'}</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-3.5 w-3.5" />
                    <span>{lang === 'th' ? 'ดาวน์โหลด PDF' : 'Download PDF'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loyalty Points Earned Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/80 border border-amber-200/80 p-4 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                {lang === 'th' ? 'แต้มสะสมวันใจคลับ' : 'WanJai Loyalty Club'}
              </div>
              <div className="text-xs text-amber-800">
                {lang === 'th'
                  ? `ออเดอร์นี้ได้รับ +${Math.round(order.total)} แต้มสะสม!`
                  : `You earned +${Math.round(order.total)} points from this order!`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              setShowProfileModal(true);
            }}
            className="h-8 px-3.5 rounded-full bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition active:scale-95 shadow-xs shrink-0 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            <span>{lang === 'th' ? 'ดูแต้มสะสม' : 'View Points'}</span>
          </button>
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
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={reorder}
            className="h-12 rounded-full bg-terracotta text-cream font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-terracotta-dark active:scale-95 transition"
          >
            <RefreshCw className="h-4 w-4" /> {t.reorder}
          </button>
          <button
            type="button"
            onClick={handleShareOrder}
            className="h-12 rounded-full bg-honey hover:bg-honey-dark text-forest font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
          >
            <Share2 className="h-4 w-4" /> {t.shareOrder}
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

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}

