import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  db,
  playReadyChime,
  playPreparingChime,
  showPushNotification,
} from '../lib/firebase';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';
import type { Order } from '../types';

export default function RealtimeOrderStatusNotifier() {
  const { lang } = useLang();
  const { showOrderStatusToast } = useToast();
  const navigate = useNavigate();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const lastKnownStatusRef = useRef<Record<string, string>>({});

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
                return;
              }

              // Transition: pending/paid -> preparing
              if (
                newStatus === 'preparing' &&
                (prevStatus === 'pending' || prevStatus === 'paid')
              ) {
                playPreparingChime();
                triggerHaptic('medium');

                // Trigger unified OrderStatusToast via ToastContext
                showOrderStatusToast(
                  {
                    orderId: activeOrderId,
                    status: 'preparing',
                    previousStatus: prevStatus,
                    customerName: data.customer_name,
                    total: data.total,
                    itemCount: data.items?.length || 1,
                  },
                  {
                    label: lang === 'th' ? 'ดูสถานะ' : 'View Status',
                    onClick: () => navigate(`/order/${activeOrderId}`),
                  }
                );

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

                // Trigger unified OrderStatusToast via ToastContext
                showOrderStatusToast(
                  {
                    orderId: activeOrderId,
                    status: 'ready',
                    previousStatus: prevStatus,
                    customerName: data.customer_name,
                    total: data.total,
                    itemCount: data.items?.length || 1,
                  },
                  {
                    label: lang === 'th' ? 'ดูออเดอร์' : 'View Order',
                    onClick: () => navigate(`/order/${activeOrderId}`),
                  }
                );

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

            showOrderStatusToast(
              {
                orderId: activeOrderId,
                status: 'preparing',
                previousStatus: prevStatus,
                customerName: liveOrder.customer_name,
                total: liveOrder.total,
                itemCount: liveOrder.items?.length || 1,
              },
              {
                label: lang === 'th' ? 'ดูสถานะ' : 'View Status',
                onClick: () => navigate(`/order/${activeOrderId}`),
              }
            );
          } else if (
            newStatus === 'ready' &&
            (prevStatus === 'pending' ||
              prevStatus === 'paid' ||
              prevStatus === 'preparing')
          ) {
            playReadyChime();
            triggerHaptic('heavy');

            showOrderStatusToast(
              {
                orderId: activeOrderId,
                status: 'ready',
                previousStatus: prevStatus,
                customerName: liveOrder.customer_name,
                total: liveOrder.total,
                itemCount: liveOrder.items?.length || 1,
              },
              {
                label: lang === 'th' ? 'ดูออเดอร์' : 'View Order',
                onClick: () => navigate(`/order/${activeOrderId}`),
              }
            );
          }
        }
      } catch {}
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [activeOrderId, lang, navigate, showOrderStatusToast]);

  return null;
}
