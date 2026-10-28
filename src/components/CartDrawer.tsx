import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Coffee,
  Check,
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LanguageContext';
import { baht } from '../lib/format';
import { triggerHaptic } from '../lib/haptics';
import { playClickCue } from '../lib/sound';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_ALLERGY_TAGS = [
  { th: '🥜 แพ้ถั่วลิสง', en: '🥜 Peanut Allergy' },
  { th: '🥛 แพ้นมวัว / เจแท้', en: '🥛 Dairy Allergy / Pure Vegan' },
  { th: '🌾 ไม่ใส่กลูเตน', en: '🌾 Gluten-Free' },
  { th: '🧊 แยกน้ำแข็ง', en: '🧊 Ice on the Side' },
  { th: '🍬 ไม่หวาน (0%)', en: '🍬 Zero Sugar (0%)' },
  { th: '🌱 ไม่รับช้อนพลาสติก', en: '🌱 No Plastic Cutlery' },
];

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const {
    items,
    updateQty,
    remove,
    clear,
    subtotal,
    count,
    specialInstructions,
    setSpecialInstructions,
  } = useCart();
  const { lang, t } = useLang();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling while drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleAddTag = (tagText: string) => {
    triggerHaptic('light');
    playClickCue();
    if (!specialInstructions.trim()) {
      setSpecialInstructions(tagText);
    } else if (!specialInstructions.includes(tagText)) {
      setSpecialInstructions(`${specialInstructions.trim()}, ${tagText}`);
    }
    textareaRef.current?.focus();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => {
              triggerHaptic('tap');
              onClose();
            }}
            className="fixed inset-0 bg-forest-dark/50 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-over Drawer (Right Side on Tablet/Desktop, Bottom Sheet on Mobile) */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-screen max-w-md bg-cream border-l border-white/70 shadow-2xl flex flex-col relative"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-forest/10 liquid-glass flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-xs">
                    <ShoppingBag className="h-4.5 w-4.5 text-honey" />
                  </div>
                  <div>
                    <h3 className="font-display italic font-bold text-lg text-forest leading-none">
                      {lang === 'th' ? 'ตะกร้าสินค้า' : 'Your Order Cart'}
                    </h3>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {count > 0
                        ? lang === 'th'
                          ? `มี ${count} รายการในตะกร้า`
                          : `${count} item${count > 1 ? 's' : ''} in cart`
                        : lang === 'th'
                        ? 'ยังไม่มีสินค้า'
                        : 'Cart is empty'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('warning');
                        clear();
                      }}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold text-chili hover:bg-chili/10 transition active:scale-95"
                      title={lang === 'th' ? 'ล้างตะกร้า' : 'Clear all'}
                    >
                      {lang === 'th' ? 'ล้างตะกร้า' : 'Clear'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      onClose();
                    }}
                    className="h-8 w-8 rounded-full bg-forest/10 hover:bg-forest/20 text-forest flex items-center justify-center transition active:scale-90"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                    <div className="h-16 w-16 rounded-full bg-forest/10 text-forest flex items-center justify-center mb-3">
                      <Coffee className="h-8 w-8 opacity-70" />
                    </div>
                    <div className="font-display italic font-bold text-xl text-forest">
                      {lang === 'th' ? 'ตะกร้าของคุณยังว่างอยู่' : 'Your cart is empty'}
                    </div>
                    <p className="text-xs text-ink-muted mt-1 max-w-xs">
                      {lang === 'th'
                        ? 'เลือกสั่งน้ำเต้าหู้สดคั้นมือ ปาท่องโก๋กรอบ หรือเต้าฮวยสูตรโบราณ'
                        : 'Explore handcrafted soy milk, crispy crullers, or traditional ginger pudding.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Items List */}
                    <div className="space-y-2.5">
                      {items.map((item) => (
                        <div
                          key={item.key}
                          className="p-3 rounded-2xl liquid-glass border border-white/80 shadow-xs flex items-center gap-3 transition"
                        >
                          {/* Image */}
                          <img
                            src={item.image_url}
                            alt=""
                            className="h-14 w-14 rounded-xl object-cover border border-forest/10 shrink-0"
                          />

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-thai font-bold text-xs sm:text-sm text-forest truncate">
                              {lang === 'th' ? item.name_th : item.name_en}
                            </h4>
                            <p className="text-[10px] sm:text-[11px] text-ink-muted truncate">
                              {item.vessel} · {item.sweetness}
                              {item.temp !== 'na' ? ` · ${item.temp}` : ''}
                              {item.notes ? ` · ${item.notes}` : ''}
                            </p>
                            <span className="font-display italic font-bold text-forest text-xs mt-0.5 block">
                              {baht(item.unit_price * item.qty)}
                            </span>
                          </div>

                          {/* Stepper Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                playClickCue();
                                updateQty(item.key, item.qty - 1);
                              }}
                              className="h-7 w-7 rounded-full bg-cream border border-forest/20 text-forest flex items-center justify-center transition active:scale-90"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono font-bold text-xs w-5 text-center text-forest">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                playClickCue();
                                updateQty(item.key, item.qty + 1);
                              }}
                              className="h-7 w-7 rounded-full bg-forest text-cream flex items-center justify-center transition active:scale-90"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => remove(item.key)}
                            className="h-7 w-7 rounded-full text-chili/70 hover:text-chili hover:bg-chili/10 flex items-center justify-center transition active:scale-90 shrink-0"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Special Requests & Allergy Notes Input Area */}
                    <div className="rounded-2xl liquid-glass border border-white/80 p-3.5 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="cart-drawer-notes"
                          className="font-thai font-bold text-xs text-forest flex items-center gap-1.5"
                        >
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                          <span>
                            {lang === 'th'
                              ? 'ข้อมูลการแพ้อาหารหรือความต้องการพิเศษ'
                              : 'Allergy Information & Special Requests'}
                          </span>
                        </label>
                        <span className="text-[10px] text-ink-muted">
                          {specialInstructions.length}/150
                        </span>
                      </div>

                      <textarea
                        id="cart-drawer-notes"
                        ref={textareaRef}
                        rows={2}
                        maxLength={150}
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder={
                          lang === 'th'
                            ? 'เช่น แพ้ถั่วลิสง, ไม่หวานเลย, แยกน้ำแข็ง, แพ้นมวัว...'
                            : 'e.g. Peanut allergy, completely unsweetened, ice on side...'
                        }
                        className="w-full rounded-xl border border-forest/20 bg-white/80 p-2.5 text-xs text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-forest/30 font-thai resize-none transition"
                      />

                      {/* Quick Allergy / Dietary Clickable Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {QUICK_ALLERGY_TAGS.map((tag) => {
                          const tagLabel = lang === 'th' ? tag.th : tag.en;
                          const isSelected = specialInstructions.includes(tagLabel);
                          return (
                            <button
                              key={tag.en}
                              type="button"
                              onClick={() => handleAddTag(tagLabel)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition active:scale-95 flex items-center gap-1 border ${
                                isSelected
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                                  : 'bg-cream/80 text-forest/90 hover:bg-forest/10 border-forest/15'
                              }`}
                            >
                              <span>{tagLabel}</span>
                              {isSelected && <Check className="h-2.5 w-2.5 text-amber-700" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer Checkout CTA */}
              {items.length > 0 && (
                <div className="p-4 sm:p-5 border-t border-forest/10 liquid-glass shrink-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-ink-muted block">
                        {lang === 'th' ? 'ยอดรวมทั้งสิ้น' : 'Subtotal'}
                      </span>
                      <span className="text-[10px] text-forest/70 font-semibold">
                        {lang === 'th' ? 'รวมภาษีมูลค่าเพิ่มแล้ว' : 'VAT included'}
                      </span>
                    </div>
                    <span className="font-display italic font-bold text-2xl text-forest">
                      {baht(subtotal)}
                    </span>
                  </div>

                  <Link
                    to="/checkout"
                    onClick={() => {
                      triggerHaptic('medium');
                      onClose();
                    }}
                    className="w-full h-12 rounded-full bg-forest text-cream font-bold text-sm hover:bg-forest-dark transition flex items-center justify-center gap-2 active:scale-98 shadow-md"
                  >
                    <span>{lang === 'th' ? 'ดำเนินการชำระเงิน' : 'Proceed to Checkout'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
