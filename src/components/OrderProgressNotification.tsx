import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellRing,
  ChefHat,
  Package,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  Flame,
  Radio,
  Play,
  Share2,
} from 'lucide-react';
import type { Order } from '../types';
import { playReadyChime } from '../lib/firebase';
import { triggerHaptic } from '../lib/haptics';

interface OrderProgressNotificationProps {
  order: Order;
  lang: 'th' | 'en';
  onStatusUpdate?: (newStatus: Order['status']) => void;
}

interface StatusLogEntry {
  status: Order['status'];
  time: string;
  label: string;
  description: string;
}

export default function OrderProgressNotification({
  order,
  lang,
  onStatusUpdate,
}: OrderProgressNotificationProps) {
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [notificationHistory, setNotificationHistory] = useState<StatusLogEntry[]>([]);
  const [recentNotification, setRecentNotification] = useState<{
    status: Order['status'];
    title: string;
    message: string;
    icon: any;
    color: string;
    bgGradient: string;
  } | null>(null);

  const prevStatusRef = useRef<Order['status'] | null>(null);

  // Helper to get status presentation details
  const getStatusDetails = useCallback((status: Order['status']) => {
    switch (status) {
      case 'ready':
        return {
          title: lang === 'th' ? '🌿 พร้อมรับที่หน้าร้านแล้ว!' : '🌿 Ready for Pickup!',
          message:
            lang === 'th'
              ? 'น้ำเต้าหู้ต้มสดของคุณบรรจุเสร็จเรียบร้อยแล้ว แวะรับได้ที่รถเข็นวันใจ ถนนวัวลาย ซอย 2 เชียงใหม่ ได้ทันทีค่ะ'
              : 'Your fresh soy milk order is freshly packed and ready for pickup at Wanchai cart, Walai Road, Chiang Mai!',
          icon: Package,
          color: 'text-emerald-300',
          bgGradient: 'from-emerald-900/90 via-teal-900/90 to-emerald-950/95 border-emerald-400/50',
          badgeColor: 'bg-emerald-400 text-forest',
          phase: 'ready',
        };
      case 'preparing':
        return {
          title: lang === 'th' ? '🔥 กำลังเตรียมต้มสดและบรรจุ' : '🔥 Preparing Fresh Batch',
          message:
            lang === 'th'
              ? 'แม่ค้ากำลังต้มน้ำเต้าหู้หม้อสดใหม่ หอมกรุ่น ควันฉุย และเตรียมบรรจุถุงตามระดับความหวานที่คุณเลือก'
              : 'Our artisan is boiling your fresh soy milk batch on the stove and packing it to your sweetness preference.',
          icon: ChefHat,
          color: 'text-amber-300',
          bgGradient: 'from-amber-950/90 via-orange-950/90 to-stone-900/95 border-amber-400/50',
          badgeColor: 'bg-amber-400 text-stone-950',
          phase: 'preparing',
        };
      case 'pending':
      case 'paid':
      default:
        return {
          title: lang === 'th' ? '✅ รับออเดอร์เข้าระบบแล้ว' : '✅ Order Received & Confirmed',
          message:
            lang === 'th'
              ? 'รายการสั่งซื้อของคุณยืนยันเข้าระบบเรียบร้อย อยู่ในลำดับคิวเตรียมต้มสดตามสูตรดั้งเดิม'
              : 'Your order has been recorded into the queue and is waiting for our boiler to start the fresh simmer.',
          icon: CheckCircle2,
          color: 'text-honey',
          bgGradient: 'from-stone-900/90 via-forest/80 to-stone-950/95 border-honey/40',
          badgeColor: 'bg-honey text-forest',
          phase: 'received',
        };
    }
  }, [lang]);

  // Announce status aloud using Web Speech API (elder & child friendly)
  const speakStatus = useCallback((text: string) => {
    if (!speechEnabled) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'th' ? 'th-TH' : 'en-US';
        utterance.rate = 0.95; // Slightly slower, clear cadence for elders & kids
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis failed:', err);
      }
    }
  }, [speechEnabled, lang]);

  // React to status changes
  useEffect(() => {
    if (!order) return;
    const currentStatus = order.status;
    const prevStatus = prevStatusRef.current;

    const details = getStatusDetails(currentStatus);
    setRecentNotification({
      status: currentStatus,
      title: details.title,
      message: details.message,
      icon: details.icon,
      color: details.color,
      bgGradient: details.bgGradient,
    });

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Record into status timeline log
    setNotificationHistory((prev) => {
      const alreadyHas = prev.some((p) => p.status === currentStatus);
      if (alreadyHas) return prev;
      return [
        {
          status: currentStatus,
          time: timeStr,
          label: details.title,
          description: details.message,
        },
        ...prev,
      ];
    });

    // If status actually transitioned
    if (prevStatus !== null && prevStatus !== currentStatus) {
      triggerHaptic('success');
      if (currentStatus === 'ready') {
        playReadyChime();
        if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200, 100, 400]);
      } else if (currentStatus === 'preparing') {
        if ('vibrate' in navigator) navigator.vibrate?.([150, 100, 150]);
      }

      // Voice prompt announcement
      const spokenSpeech =
        lang === 'th'
          ? currentStatus === 'ready'
            ? 'น้ำเต้าหู้ของคุณพร้อมรับที่หน้าร้านแล้วค่ะ เชิญมารับได้เลย'
            : currentStatus === 'preparing'
            ? 'กำลังต้มน้ำเต้าหู้สดใหม่ให้คุณค่ะ'
            : 'ได้รับออเดอร์แล้วค่ะ'
          : currentStatus === 'ready'
          ? 'Your soy milk order is ready for pickup!'
          : currentStatus === 'preparing'
          ? 'Your order is being prepared now.'
          : 'Your order has been received.';

      speakStatus(spokenSpeech);
    }

    prevStatusRef.current = currentStatus;
  }, [order, lang, getStatusDetails, speakStatus]);

  if (!recentNotification) return null;

  const IconComponent = recentNotification.icon;
  const currentDetails = getStatusDetails(order.status);

  return (
    <div className="rounded-3xl overflow-hidden border shadow-xl transition-all duration-500 backdrop-blur-md mb-4 bg-gradient-to-br from-forest-dark via-stone-900 to-forest border-white/20 text-cream">
      {/* Top Banner Alert Bar */}
      <div className="p-4 sm:p-5 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-honey/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-start gap-3.5">
          {/* Animated Icon Avatar */}
          <div className="relative shrink-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg">
              <IconComponent className={`h-6 w-6 sm:h-7 sm:w-7 ${recentNotification.color} ${order.status === 'preparing' ? 'animate-bounce' : order.status === 'ready' ? 'animate-pulse' : ''}`} />
            </div>
            {order.status === 'ready' && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white" />
              </span>
            )}
            {order.status === 'preparing' && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white" />
              </span>
            )}
          </div>

          {/* Headline & Body Message */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-mono uppercase tracking-wider text-cream/90 border border-white/15">
                <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
                <span>{lang === 'th' ? 'การแจ้งเตือนความคืบหน้าแบบเรียลไทม์' : 'Real-Time Order Update'}</span>
              </div>

              {/* Speech Voice & Mute Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    const next = !speechEnabled;
                    setSpeechEnabled(next);
                    if (next) {
                      speakStatus(lang === 'th' ? 'เปิดเสียงแจ้งเตือนแล้วค่ะ' : 'Voice alerts enabled');
                    }
                  }}
                  title={speechEnabled ? (lang === 'th' ? 'ปิดเสียงอ่าน' : 'Mute Voice') : (lang === 'th' ? 'เปิดเสียงอ่านสถานะ' : 'Enable Voice')}
                  className={`h-8 px-2.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
                    speechEnabled
                      ? 'bg-honey text-forest font-bold shadow-xs'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {speechEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  <span className="text-[11px] hidden sm:inline">
                    {speechEnabled ? (lang === 'th' ? 'เสียงอ่าน: เปิด' : 'Voice: On') : (lang === 'th' ? 'เสียงอ่าน: ปิด' : 'Voice: Off')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setIsExpanded((prev) => !prev);
                  }}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition"
                  aria-label="Toggle details"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <h3 className="font-display italic font-bold text-xl sm:text-2xl mt-1 text-white leading-tight">
              {recentNotification.title}
            </h3>

            <p className="mt-1 text-xs sm:text-sm text-cream/90 leading-relaxed font-thai">
              {recentNotification.message}
            </p>

            {/* Read aloud action button for elderly users */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  speakStatus(recentNotification.message);
                }}
                className="h-8 px-3 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-white/20"
              >
                <Volume2 className="h-3.5 w-3.5 text-honey" />
                <span>{lang === 'th' ? 'ฟังเสียงอ่านสถานะ' : 'Listen Status Aloud'}</span>
              </button>

              {order.status === 'ready' && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    playReadyChime();
                  }}
                  className="h-8 px-3 rounded-full bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-emerald-400/40"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                  <span>{lang === 'th' ? 'ส่งเสียงกระดิ่งเตือน' : 'Play Chime Again'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Real-Time Simulation & Progress Controls */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-4 pt-4 border-t border-white/15"
            >
              {/* Simulator Bar to demonstrate and test real-time notification updating */}
              <div className="bg-black/25 rounded-2xl p-3 border border-white/10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-cream/80">
                    <Play className="h-3 w-3 text-honey" />
                    <span>
                      {lang === 'th'
                        ? 'จำลองการเปลี่ยนสถานะเรียลไทม์ (สำหรับทดสอบ)'
                        : 'Live Status Simulator (Test Progression)'}
                    </span>
                  </div>
                  <span className="text-[10px] text-cream/50 font-mono">Instant Real-Time</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      onStatusUpdate?.('paid');
                    }}
                    className={`h-9 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 border ${
                      order.status === 'pending' || order.status === 'paid'
                        ? 'bg-honey text-forest border-honey shadow-md scale-[1.02]'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 border-white/15'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{lang === 'th' ? '1. รับออเดอร์' : '1. Received'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      onStatusUpdate?.('preparing');
                    }}
                    className={`h-9 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 border ${
                      order.status === 'preparing'
                        ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md scale-[1.02]'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 border-white/15'
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    <span className="truncate">{lang === 'th' ? '2. กำลังต้มสด' : '2. Preparing'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('success');
                      onStatusUpdate?.('ready');
                    }}
                    className={`h-9 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 border ${
                      order.status === 'ready' || order.status === 'done'
                        ? 'bg-emerald-400 text-forest border-emerald-300 shadow-md scale-[1.02]'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 border-white/15'
                    }`}
                  >
                    <Package className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
                    <span className="truncate">{lang === 'th' ? '3. พร้อมรับ!' : '3. Ready!'}</span>
                  </button>
                </div>
              </div>

              {/* Status Update History Log */}
              {notificationHistory.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cream/60 mb-1.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{lang === 'th' ? 'ประวัติการอัปเดตสถานะล่าสุด' : 'Recent Status Log'}</span>
                  </div>
                  <div className="space-y-1.5">
                    {notificationHistory.map((item, idx) => (
                      <div
                        key={`${item.status}-${idx}`}
                        className="flex items-center justify-between text-xs bg-white/5 rounded-xl px-2.5 py-1.5 border border-white/10"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-honey" />
                          <span className="font-semibold text-white">{item.label}</span>
                        </div>
                        <span className="font-mono text-[10px] text-cream/60">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
