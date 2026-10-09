import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Clock,
  Phone,
  User,
  Wallet,
  QrCode,
  Sparkles,
  Award,
  ArrowRight,
  CheckCircle2,
  X,
  Edit3,
} from 'lucide-react';
import type { CartItem } from '../contexts/CartContext';
import { useLang } from '../contexts/LanguageContext';
import { baht } from '../lib/format';
import { triggerHaptic } from '../lib/haptics';

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: CartItem[];
  total: number;
  customerName: string;
  phone: string;
  email?: string;
  pickupTime: string;
  paymentMethod: 'promptpay' | 'cash';
  notes?: string;
  isSubmitting?: boolean;
}

export default function OrderSummaryModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  total,
  customerName,
  phone,
  email,
  pickupTime,
  paymentMethod,
  notes,
  isSubmitting = false,
}: OrderSummaryModalProps) {
  const { lang, t } = useLang();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-forest/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto duo-modal-overlay"
        onClick={() => {
          if (!isSubmitting) {
            triggerHaptic('tap');
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-4xl liquid-glass border border-white/60 p-5 sm:p-6 shadow-2xl text-ink duo-segment-center relative max-h-[90vh] flex flex-col my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-forest/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-sm">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display italic font-bold text-xl text-forest leading-none">
                  {lang === 'th' ? 'ตรวจสอบคำสั่งซื้อ' : 'Order Summary'}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {lang === 'th' ? 'กรุณาตรวจสอบความถูกต้องก่อนยืนยัน' : 'Please review your items before final checkout'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                triggerHaptic('tap');
                onClose();
              }}
              className="h-8 w-8 rounded-full bg-forest/10 hover:bg-forest/15 text-forest flex items-center justify-center transition active:scale-95 disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto space-y-4 py-3 flex-1 pr-1">
            {/* Items List */}
            <div className="rounded-2xl bg-white/70 p-3.5 border border-forest/10 space-y-2.5">
              <div className="text-xs uppercase tracking-wider text-forest font-bold flex items-center justify-between">
                <span>{lang === 'th' ? 'รายการสินค้า' : 'Your Items'} ({items.reduce((s, i) => s + i.qty, 0)})</span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    onClose();
                  }}
                  className="text-[11px] text-terracotta hover:underline font-semibold flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" /> {lang === 'th' ? 'แก้ไข' : 'Edit'}
                </button>
              </div>

              <div className="divide-y divide-forest/5 max-h-44 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={item.key || idx} className="py-2 flex items-start justify-between gap-2 text-xs">
                    <div className="flex-1">
                      <div className="font-thai font-semibold text-ink">
                        <span className="font-mono font-bold text-forest mr-1.5">{item.qty}×</span>
                        {lang === 'th' ? item.name_th : item.name_en}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        {[
                          item.vessel === 'bag' ? 'ใส่ถุง' : item.vessel === 'cup' ? 'ใส่แก้ว' : item.vessel === 'bottle' ? 'ใส่ขวด' : item.vessel === 'own' ? 'นำแก้วมาเอง (-฿2)' : '',
                          item.temp === 'hot' ? 'ร้อน' : item.temp === 'cold' ? 'เย็น' : '',
                          item.sweetness === 'none' ? 'ไม่หวาน (0%)' : item.sweetness === 'less' ? 'หวานน้อย (50%)' : item.sweetness === 'extra' ? 'หวานมาก' : '',
                          ...(item.extras || []).map((e) => (e === 'ice' ? 'ใส่น้ำแข็ง (+฿3)' : e)),
                          item.notes ? `"${item.notes}"` : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-forest shrink-0">
                      {baht(item.unit_price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer & Pickup Details Card */}
            <div className="rounded-2xl bg-white/70 p-3.5 border border-forest/10 space-y-2 text-xs">
              <div className="text-xs uppercase tracking-wider text-forest font-bold mb-1">
                {lang === 'th' ? 'ข้อมูลการรับสินค้า' : 'Pickup & Customer'}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 text-ink">
                  <User className="h-3.5 w-3.5 text-forest/70 shrink-0" />
                  <span className="truncate"><b>{customerName || 'ลูกค้า'}</b></span>
                </div>
                <div className="flex items-center gap-1.5 text-ink font-mono">
                  <Phone className="h-3.5 w-3.5 text-forest/70 shrink-0" />
                  <span>{phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-ink pt-1 border-t border-forest/5">
                <Clock className="h-3.5 w-3.5 text-terracotta shrink-0" />
                <span>
                  {lang === 'th' ? 'เวลารับของ:' : 'Pickup Time:'}{' '}
                  <strong className="text-forest">{pickupTime}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-ink">
                {paymentMethod === 'cash' ? (
                  <Wallet className="h-3.5 w-3.5 text-forest/70 shrink-0" />
                ) : (
                  <QrCode className="h-3.5 w-3.5 text-forest/70 shrink-0" />
                )}
                <span>
                  {lang === 'th' ? 'วิธีชำระ:' : 'Payment:'}{' '}
                  <strong className="text-forest">
                    {paymentMethod === 'cash'
                      ? lang === 'th' ? 'เงินสดตอนรับที่ร้าน' : 'Cash on Pickup'
                      : 'PromptPay Thai QR'}
                  </strong>
                </span>
              </div>

              {notes && (
                <div className="text-[11px] text-ink-muted italic pt-1 border-t border-forest/5">
                  โน้ต: "{notes}"
                </div>
              )}
            </div>

            {/* Loyalty Points Bonus Notice */}
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/90 border border-amber-300/60 p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-amber-900 font-semibold">
                  {lang === 'th' ? 'แต้มสะสมที่คุณจะได้รับ:' : 'Points you will earn:'}
                </span>
              </div>
              <span className="font-mono font-bold text-amber-800 text-sm">
                +{Math.round(total)} {lang === 'th' ? 'แต้ม' : 'pts'}
              </span>
            </div>
          </div>

          {/* Footer Grand Total & Confirm CTA */}
          <div className="pt-3 border-t border-forest/10 shrink-0 space-y-3">
            <div className="flex items-baseline justify-between px-1">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-ink-muted font-bold block">
                  {lang === 'th' ? 'ยอดสุทธิที่ต้องชำระ' : 'Grand Total Due'}
                </span>
                <span className="text-xs text-ink-muted">
                  {lang === 'th' ? 'รวมภาษีและส่วนลดแล้ว' : 'All taxes included'}
                </span>
              </div>
              <div className="font-display italic font-bold text-3xl text-forest">
                {baht(total)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  triggerHaptic('tap');
                  onClose();
                }}
                className="h-12 rounded-2xl liquid-pill text-forest font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-forest/10 active:scale-95 transition disabled:opacity-50"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{lang === 'th' ? 'กลับไปแก้ไข' : 'Edit Items'}</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  triggerHaptic('medium');
                  onConfirm();
                }}
                className="h-12 rounded-2xl bg-terracotta text-cream hover:bg-terracotta-dark font-bold text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>{lang === 'th' ? 'กำลังส่งคำสั่งซื้อ...' : 'Submitting...'}</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{lang === 'th' ? 'ยืนยันสั่งซื้อ' : 'Confirm Order'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
