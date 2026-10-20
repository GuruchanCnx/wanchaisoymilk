import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChefHat,
  Package,
  X,
  ArrowRight,
  Sparkles,
  Volume2,
  CheckCircle2,
  MapPin,
  Clock,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  db,
  playReadyChime,
  playPreparingChime,
  showPushNotification,
} from '../lib/firebase';
import { useLang } from '../contexts/LanguageContext';
import { triggerHaptic } from '../lib/haptics';
import type { Order } from '../types';

interface AlertState {
  orderId: string | number;
  status: 'preparing' | 'ready';
  customerName?: string;
  total?: number;
  itemCount?: number;
}

export default function RealtimeOrderStatusNotifier() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [activeAlert, setActiveAlert] = useState<AlertState | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const lastKnownStatusRef = useRef<Record<string, string>>({});
  const initialMountRef = useRef<boolean>(true);

  // Retrieve latest order ID from localStorage
  const checkLatestOrderId = () => {
    try {
      const id = localStorage.getItem('latest_order_id');
      if (id && id !== activeOrderId) {
        setActiveOrderId(id);
      }
    } catch {}
  };

  useEffect(() => {
    checkLatestOrderId();
    const handleStorageChange = () => checkLatestOrderId();
    const handleOrderPlaced = () => checkLatestOrderId();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('order_placed', handleOrderPlaced);
    const interval = setInterval(checkLatestOrderId, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('order_placed', handleOrderPlaced);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrderId]);

  // Real-time Firestore snapshot listener on active order
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
              const data = docSnap.data() as Order;
              const newStatus = data.status;
              const prevStatus = lastKnownStatusRef.current[activeOrderId];

              // Skip alert on first mount if order is already past or unchanged
              const isFirstObservation = prevStatus === undefined;
              lastKnownStatusRef.current[activeOrderId] = newStatus;

              if (isFirstObservation) {
                // If it's already done or cancelled, don't trigger anything
                return;
              }

              // Transition: pending -> preparing
              if (
                newStatus === 'preparing' &&
                (prevStatus === 'pending' || prevStatus === 'paid')
              ) {
                playPreparingChime();
                triggerHaptic('medium');

                showPushNotification(
                  lang === 'th'
                    ? 'หม้อต้มกำลังทำงาน! น้ำเต้าหู้ของคุณกำลังต้มสด 🌿'
                    : 'Simmering Fresh! Your order is being prepared 🌿',
                  {
                    body:
                      lang === 'th'
                        ? `ออเดอร์ #${activeOrderId} เริ่มต้มสดตามสูตรดั้งเดิมแล้ว`
                        : `Order #${activeOrderId} is now being freshly boiled at WanJai cart`,
                    tag: `order-${activeOrderId}-preparing`,
                  }
                );

                setActiveAlert({
                  orderId: activeOrderId,
                  status: 'preparing',
                  customerName: data.customer_name,
                  total: data.total,
                  itemCount: data.items?.length || 1,
                });
              }

              // Transition: (pending or preparing) -> ready
              else if (
                newStatus === 'ready' &&
                (prevStatus === 'pending' ||
                  prevStatus === 'paid' ||
                  prevStatus === 'preparing')
              ) {
                playReadyChime();
                triggerHaptic('heavy');

                showPushNotification(
                  lang === 'th'
                    ? 'น้ำเต้าหู้พร้อมรับแล้ว! 🔔'
                    : 'Order Ready for Pickup! 🔔',
                  {
                    body:
                      lang === 'th'
                        ? `ออเดอร์ #${activeOrderId} ต้มเสร็จเรียบร้อย แวะรับได้ที่ร้านวันใจ Soy ถนนวัวลาย`
                        : `Order #${activeOrderId} is packed & ready at WanJai Soy cart, Walai Rd`,
                    tag: `order-${activeOrderId}-ready`,
                  }
                );

                setActiveAlert({
                  orderId: activeOrderId,
                  status: 'ready',
                  customerName: data.customer_name,
                  total: data.total,
                  itemCount: data.items?.length || 1,
                });
              }
            }
          },
          (err) => {
            console.warn('[RealtimeOrderStatusNotifier] Listener note:', err.message);
          }
        );
      } catch (e) {
        console.warn('Realtime listener failed:', e);
      }
    }

    // Secondary fallback polling in case of network fluctuations
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders?id=${activeOrderId}`);
        if (!res.ok) return;
        const resData = await res.json();
        const liveOrder = Array.isArray(resData) ? resData[0] : resData;
        if (!liveOrder) return;

        const newStatus = liveOrder.status;
        const prevStatus = lastKnownStatusRef.current[activeOrderId];

        if (prevStatus && prevStatus !== newStatus) {
          lastKnownStatusRef.current[activeOrderId] = newStatus;

          if (
            newStatus === 'preparing' &&
            (prevStatus === 'pending' || prevStatus === 'paid')
          ) {
            playPreparingChime();
            triggerHaptic('medium');
            setActiveAlert({
              orderId: activeOrderId,
              status: 'preparing',
              customerName: liveOrder.customer_name,
              total: liveOrder.total,
              itemCount: liveOrder.items?.length || 1,
            });
          } else if (
            newStatus === 'ready' &&
            (prevStatus === 'pending' ||
              prevStatus === 'paid' ||
              prevStatus === 'preparing')
          ) {
            playReadyChime();
            triggerHaptic('heavy');
            setActiveAlert({
              orderId: activeOrderId,
              status: 'ready',
              customerName: liveOrder.customer_name,
              total: liveOrder.total,
              itemCount: liveOrder.items?.length || 1,
            });
          }
        }
      } catch {}
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [activeOrderId, lang]);

  // Auto-dismiss alert after 12 seconds
  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 12000);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  if (!activeAlert) return null;

  const isReady = activeAlert.status === 'ready';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        className="fixed top-3 sm:top-5 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-50 pointer-events-auto"
        role="alert"
        aria-live="assertive"
      >
        <div
          className={`rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl border flex flex-col gap-3 transition-all ${
            isReady
              ? 'bg-gradient-to-br from-emerald-900/95 via-forest to-emerald-950 text-cream border-emerald-400/50 shadow-emerald-900/40 ring-2 ring-emerald-400/40'
              : 'bg-gradient-to-br from-amber-900/95 via-terracotta to-amber-950 text-cream border-amber-400/50 shadow-amber-900/40 ring-2 ring-amber-400/40'
          }`}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                  isReady
                    ? 'bg-emerald-400 text-forest animate-bounce'
                    : 'bg-honey text-forest animate-pulse'
                }`}
              >
                {isReady ? (
                  <Package className="h-6 w-6" />
                ) : (
                  <ChefHat className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full font-mono ${
                      isReady
                        ? 'bg-emerald-400 text-forest font-extrabold'
                        : 'bg-honey text-forest font-extrabold'
                    }`}
                  >
                    {isReady
                      ? (lang === 'th' ? 'พร้อมรับที่ร้าน' : 'READY FOR PICKUP')
                      : (lang === 'th' ? 'กำลังต้มสดใหม่' : 'NOW PREPARING')}
                  </span>
                  <span className="text-[11px] font-mono text-cream/70">
                    #{activeAlert.orderId}
                  </span>
                </div>
                <h4 className="font-display italic font-bold text-base sm:text-lg text-white mt-0.5 leading-tight">
                  {isReady
                    ? (lang === 'th'
                        ? 'น้ำเต้าหู้ของคุณพร้อมรับแล้ว!'
                        : 'Your Order is Ready!')
                    : (lang === 'th'
                        ? 'ร้านกำลังเริ่มต้มสดออเดอร์ของคุณ!'
                        : 'Simmering Fresh Soy Milk!')}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setActiveAlert(null);
              }}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-cream flex items-center justify-center transition active:scale-95 shrink-0"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-cream/90 leading-relaxed font-thai">
            {isReady
              ? (lang === 'th'
                  ? 'เครื่องดื่มและของว่างต้มสดบรรจุเรียบร้อย แวะรับได้ที่ร้านวันใจ Soy ถนนวัวลาย'
                  : 'Your fresh boiled soy milk and snacks are packed and waiting at WanJai cart, Walai Road.')
              : (lang === 'th'
                  ? 'หม้อต้มกำลังทำงานตามสูตรที่คุณเลือก รอสักครู่กลิ่นหอมกรุ่นจะพร้อมเสิร์ฟ'
                  : 'The soy boiler is simmering your recipe. It will be ready in just a few minutes.')}
          </p>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/15">
            <div className="flex items-center gap-1.5 text-[11px] text-cream/70">
              <Clock className="h-3.5 w-3.5 text-honey" />
              <span>{lang === 'th' ? 'แจ้งเตือนเรียลไทม์' : 'Live Firestore Alert'}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setActiveAlert(null);
                navigate(`/order/${activeAlert.orderId}`);
              }}
              className="h-9 px-4 rounded-full bg-white text-forest font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-cream active:scale-95 transition"
            >
              <span>{lang === 'th' ? 'ดูสถานะออเดอร์' : 'View Order'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
