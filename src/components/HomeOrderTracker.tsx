import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  ChefHat,
  Package,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Clock,
  X,
  Flame,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, playReadyChime } from '../lib/firebase';
import { useLang } from '../contexts/LanguageContext';
import { triggerHaptic } from '../lib/haptics';
import type { Order } from '../types';

export default function HomeOrderTracker() {
  const { lang } = useLang();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevStatusRef = useRef<string | null>(null);

  // Check latest order from localStorage
  useEffect(() => {
    try {
      const storedId = localStorage.getItem('latest_order_id');
      if (storedId) {
        setActiveOrderId(storedId);
      }
    } catch {}

    const handleStorageChange = () => {
      try {
        const storedId = localStorage.getItem('latest_order_id');
        if (storedId) {
          setActiveOrderId(storedId);
          setDismissed(false);
        }
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('order_placed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('order_placed', handleStorageChange);
    };
  }, []);

  // Listen to Firestore real-time updates for active order
  useEffect(() => {
    if (!activeOrderId) return;

    let unsubscribe = () => {};

    if (db) {
      try {
        const orderRef = doc(db, 'orders', String(activeOrderId));
        unsubscribe = onSnapshot(
          orderRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = { id: activeOrderId, ...docSnap.data() } as unknown as Order;
              setOrder(data);

              // If status changed to ready, play chime alert
              if (data.status === 'ready' && prevStatusRef.current !== 'ready') {
                playReadyChime();
                triggerHaptic('heavy');
              }
              prevStatusRef.current = data.status;
            }
          },
          (err) => {
            console.warn('[HomeOrderTracker] Firestore listener note:', err.message);
          }
        );
      } catch {}
    }

    // Secondary fallback poll for resilience
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders?id=${activeOrderId}`);
        if (res.ok) {
          const list = await res.json();
          const found = Array.isArray(list) ? list[0] : list;
          if (found) {
            setOrder((current) => {
              if (found.status === 'ready' && current?.status !== 'ready') {
                playReadyChime();
                triggerHaptic('heavy');
              }
              return found;
            });
          }
        }
      } catch {}
    }, 6000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [activeOrderId]);

  if (!order || dismissed) return null;

  // Only show for active orders or recently ready
  const isCompleted = order.status === 'done' || (order as any).status === 'picked_up';
  const isCancelled = order.status === 'cancelled';

  const getStepProgress = () => {
    switch (order.status) {
      case 'received':
        return { percent: 25, labelTh: 'รับออร์เดอร์แล้ว', labelEn: 'Order Received', color: 'bg-honey' };
      case 'preparing':
        return { percent: 65, labelTh: 'กำลังต้มและปรุงสด', labelEn: 'Preparing Order', color: 'bg-amber-500' };
      case 'ready':
        return { percent: 100, labelTh: 'พร้อมรับสินค้าแล้ว!', labelEn: 'Ready for Pickup!', color: 'bg-emerald-500' };
      case 'done':
      case 'picked_up' as any:
        return { percent: 100, labelTh: 'รับสินค้าเรียบร้อย', labelEn: 'Picked Up', color: 'bg-forest' };
      default:
        return { percent: 20, labelTh: 'รอคิว', labelEn: 'Pending', color: 'bg-honey' };
    }
  };

  const currentStep = getStepProgress();

  const speakStatus = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text =
        lang === 'th'
          ? `ออร์เดอร์หมายเลข ${order.id} ขณะนี้ ${currentStep.labelTh}`
          : `Order number ${order.id} is now ${currentStep.labelEn}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'th' ? 'th-TH' : 'en-US';
      window.speechSynthesis.speak(utterance);
      triggerHaptic('selection');
    } catch {}
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="mb-8"
      >
        <div
          className={`rounded-3xl p-4 sm:p-5 shadow-lg border transition-all ${
            order.status === 'ready'
              ? 'bg-gradient-to-r from-emerald-900 to-forest-dark text-cream border-emerald-400/50 ring-2 ring-emerald-400/40 shadow-emerald-900/20'
              : order.status === 'preparing'
              ? 'bg-gradient-to-r from-amber-950/90 to-forest-dark text-cream border-amber-400/40'
              : 'bg-white/95 text-ink border-forest/20 shadow-forest/5'
          }`}
        >
          {/* Top Bar inside card */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  order.status === 'ready'
                    ? 'bg-emerald-400 text-forest-dark animate-bounce'
                    : order.status === 'preparing'
                    ? 'bg-amber-400 text-amber-950 animate-pulse'
                    : 'bg-forest text-cream'
                }`}
              >
                {order.status === 'ready' ? (
                  <Package className="h-6 w-6" />
                ) : order.status === 'preparing' ? (
                  <ChefHat className="h-6 w-6" />
                ) : (
                  <Clock className="h-6 w-6" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono ${
                      order.status === 'ready'
                        ? 'bg-emerald-400 text-forest-dark font-black'
                        : order.status === 'preparing'
                        ? 'bg-amber-400 text-amber-950 font-black'
                        : 'bg-forest/10 text-forest'
                    }`}
                  >
                    {lang === 'th' ? currentStep.labelTh : currentStep.labelEn}
                  </span>

                  <span className="text-xs font-mono opacity-70">
                    #{order.id}
                  </span>
                </div>

                <h3 className="font-display italic font-bold text-lg sm:text-xl mt-1 leading-tight">
                  {order.status === 'ready'
                    ? (lang === 'th' ? 'เครื่องดื่มพร้อมรับแล้วที่หน้าร้าน!' : 'Your order is ready for pickup!')
                    : order.status === 'preparing'
                    ? (lang === 'th' ? 'กำลังต้มสดและบรรจุถุง...' : 'Brewing and packaging your order...')
                    : (lang === 'th' ? 'ทางร้านได้รับออร์เดอร์แล้ว' : 'Order received by the kitchen')}
                </h3>
              </div>
            </div>

            {/* Utility icons: Voice speaker & Dismiss */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={speakStatus}
                title={lang === 'th' ? 'ฟังเสียงแจ้งเตือนสถานะ' : 'Listen to status'}
                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-current flex items-center justify-center transition active:scale-90"
              >
                <Volume2 className="h-4 w-4" />
              </button>

              {isCompleted && (
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-current flex items-center justify-center transition"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Real-time Visual Progress Line */}
          <div className="mt-4 space-y-1.5">
            <div className="h-2.5 w-full rounded-full bg-black/15 overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${currentStep.percent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${currentStep.color} shadow-sm`}
              />
            </div>

            {/* Step Milestones */}
            <div className="grid grid-cols-3 text-[11px] font-thai pt-1 opacity-90">
              <div className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${order.status !== 'cancelled' ? 'bg-current' : 'bg-current/30'}`} />
                <span>{lang === 'th' ? '1. ได้รับออร์เดอร์' : '1. Received'}</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className={`h-2 w-2 rounded-full ${order.status === 'preparing' || order.status === 'ready' || isCompleted ? 'bg-current' : 'bg-current/30'}`} />
                <span>{lang === 'th' ? '2. กำลังเตรียม' : '2. Preparing'}</span>
              </div>
              <div className="flex items-center justify-end gap-1 font-bold">
                <span className={`h-2 w-2 rounded-full ${order.status === 'ready' || isCompleted ? 'bg-current animate-ping' : 'bg-current/30'}`} />
                <span>{lang === 'th' ? '3. พร้อมรับ' : '3. Ready'}</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-4 pt-3 border-t border-current/15 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-thai">
              <Clock className="h-3.5 w-3.5 opacity-70" />
              <span>
                {lang === 'th' ? 'เวลารับสินค้า:' : 'Pickup:'}{' '}
                <strong>{order.pickup_time || (lang === 'th' ? 'เร็วที่สุด' : 'ASAP')}</strong>
              </span>
            </div>

            <Link
              to={`/order/${order.id}`}
              onClick={() => triggerHaptic('tap')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs bg-white text-forest hover:bg-cream transition active:scale-95 shadow-xs"
            >
              <span>{lang === 'th' ? 'ดูรายละเอียดคำสั่งซื้อ' : 'View Order Details'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
