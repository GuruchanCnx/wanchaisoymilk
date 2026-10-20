import { motion } from 'framer-motion';
import { ChefHat, Package, ArrowRight, X, Sparkles, Clock } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { useLang } from '../contexts/LanguageContext';

export interface OrderStatusToastData {
  orderId: string | number;
  status: 'pending' | 'preparing' | 'ready' | 'picked_up' | 'cancelled';
  previousStatus?: string;
  customerName?: string;
  total?: number;
  itemCount?: number;
}

interface OrderStatusToastProps {
  orderData: OrderStatusToastData;
  onDismiss: () => void;
  onAction?: () => void;
}

export default function OrderStatusToast({
  orderData,
  onDismiss,
  onAction,
}: OrderStatusToastProps) {
  const { lang } = useLang();
  const isReady = orderData.status === 'ready';
  const isPreparing = orderData.status === 'preparing';

  const title = isReady
    ? lang === 'th'
      ? 'น้ำเต้าหู้พร้อมรับแล้ว! ✨'
      : 'Your Order is Ready! ✨'
    : isPreparing
    ? lang === 'th'
      ? 'กำลังต้มสดใหม่ 🔥'
      : 'Simmering Fresh Now 🔥'
    : lang === 'th'
    ? 'อัปเดตสถานะออเดอร์'
    : 'Order Status Updated';

  const desc = isReady
    ? lang === 'th'
      ? 'ต้มเสร็จใหม่ๆ บรรจุเรียบร้อย รอส่งมอบที่ร้านวันใจ Soy ถนนวัวลาย'
      : 'Packed & waiting for you at WanJai Soy cart, Walai Road'
    : isPreparing
    ? lang === 'th'
      ? 'ร้านเริ่มต้มสดออเดอร์ของคุณตามสูตรดั้งเดิมแล้ว หอมกรุ่นจากเตา'
      : 'Boiling fresh soybeans right now. Simmering warm and rich'
    : lang === 'th'
    ? `สถานะออเดอร์ #${orderData.orderId} เปลี่ยนแปลงแล้ว`
    : `Order #${orderData.orderId} status changed`;

  const badgeText = isReady
    ? lang === 'th'
      ? 'พร้อมรับที่ร้าน'
      : 'READY FOR PICKUP'
    : isPreparing
    ? lang === 'th'
      ? 'กำลังต้มสด'
      : 'NOW PREPARING'
    : orderData.status.toUpperCase();

  const handleActionClick = () => {
    triggerHaptic('medium');
    if (onAction) {
      onAction();
    }
    onDismiss();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative w-full rounded-3xl p-4 shadow-2xl backdrop-blur-xl border flex flex-col gap-2.5 transition-all select-none ${
        isReady
          ? 'bg-gradient-to-br from-emerald-950/95 via-forest to-emerald-900/95 text-cream border-emerald-400/50 shadow-emerald-950/50 ring-2 ring-emerald-400/40'
          : isPreparing
          ? 'bg-gradient-to-br from-amber-950/95 via-terracotta to-amber-900/95 text-cream border-amber-400/50 shadow-amber-950/50 ring-2 ring-amber-400/40'
          : 'bg-forest/95 text-cream border-forest/30 shadow-forest/40'
      }`}
    >
      {/* Top Row: Icon + Badges + Dismiss */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: [1, 1.15, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              isReady
                ? 'bg-emerald-400 text-forest'
                : 'bg-honey text-forest'
            }`}
          >
            {isReady ? (
              <Package className="h-5 w-5 animate-bounce" />
            ) : isPreparing ? (
              <ChefHat className="h-5 w-5 animate-pulse" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </motion.div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-mono uppercase font-extrabold px-2 py-0.5 rounded-full ${
                  isReady
                    ? 'bg-emerald-400 text-forest shadow-xs'
                    : 'bg-honey text-forest shadow-xs'
                }`}
              >
                {badgeText}
              </span>
              <span className="text-[11px] font-mono text-cream/70 font-semibold">
                #{orderData.orderId}
              </span>
            </div>
            <h4 className="font-display italic font-bold text-sm sm:text-base text-white mt-0.5 leading-tight truncate">
              {title}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('tap');
            onDismiss();
          }}
          className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-cream flex items-center justify-center transition active:scale-95 shrink-0"
          aria-label="Dismiss toast"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Description Text */}
      <p className="text-xs text-cream/90 leading-snug font-thai pl-1">
        {desc}
      </p>

      {/* Action Row */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/15">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-cream/75">
          <Clock className="h-3 w-3 text-honey shrink-0" />
          <span>{lang === 'th' ? 'อัปเดตอัตโนมัติ' : 'Live Snapshot'}</span>
        </div>

        {onAction && (
          <button
            type="button"
            onClick={handleActionClick}
            className="h-8 px-3.5 rounded-full bg-cream text-forest font-bold text-xs flex items-center gap-1 shadow-md hover:bg-white active:scale-95 transition shrink-0"
          >
            <span>{lang === 'th' ? 'ดูออเดอร์' : 'View Order'}</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
