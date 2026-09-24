import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Sparkles,
  X,
  Phone,
  Gift,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Heart,
  Crown,
  Copy,
  Check,
} from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { triggerHaptic } from '../lib/haptics';
import { useToast } from '../contexts/ToastContext';
import {
  getLoyaltyProfile,
  redeemLoyaltyReward,
  LOYALTY_REWARDS,
  type LoyaltyProfile,
  type LoyaltyReward,
} from '../lib/loyalty';
import { baht } from '../lib/format';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { lang, t } = useLang();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<LoyaltyProfile>(() => getLoyaltyProfile());
  const [phoneInput, setPhoneInput] = useState(profile.phone);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProfile(getLoyaltyProfile());
    }
  }, [isOpen]);

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    const clean = phoneInput.trim();
    localStorage.setItem('customer_phone', clean);
    setProfile(getLoyaltyProfile(clean));
    showToast(
      lang === 'th' ? 'บันทึกเบอร์โทรสะสมแต้มแล้ว' : 'Phone saved for points',
      clean,
      'success'
    );
  };

  const handleRedeem = (reward: LoyaltyReward) => {
    triggerHaptic('medium');
    const res = redeemLoyaltyReward(reward);
    if (res.success) {
      triggerHaptic('success');
      setProfile(getLoyaltyProfile());
      showToast(
        lang === 'th' ? 'แลกรางวัลสำเร็จ! 🎉' : 'Reward Redeemed! 🎉',
        res.message,
        'success'
      );
    } else {
      triggerHaptic('error');
      showToast(
        lang === 'th' ? 'แต้มไม่พอ' : 'Insufficient points',
        res.message,
        'error'
      );
    }
  };

  const copyCoupon = (code: string) => {
    triggerHaptic('tap');
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-forest/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={() => {
          triggerHaptic('tap');
          onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-cream w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-forest/20 my-auto flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-forest text-cream p-5 sm:p-6 relative">
            <button
              onClick={() => {
                triggerHaptic('tap');
                onClose();
              }}
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-cream/15 text-cream flex items-center justify-center hover:bg-cream/25 active:scale-95 transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-cream text-forest flex items-center justify-center shadow-lg font-display text-2xl font-bold italic">
                w
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display italic font-bold text-xl sm:text-2xl text-cream">
                    {lang === 'th' ? 'สมาชิกวันใจ Soy' : 'WanJai Loyalty Club'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-honey text-forest flex items-center gap-1 shadow-xs">
                    <Crown className="h-3 w-3" />
                    {lang === 'th' ? profile.tierNameTh.split(' ')[0] : profile.tierNameEn}
                  </span>
                </div>
                <p className="text-xs text-cream/80 mt-0.5">
                  {lang === 'th'
                    ? 'ทุก ฿1 จากยอดสั่งซื้อ = 1 แต้มสะสมแลกเครื่องดื่มและของว่างฟรี'
                    : '฿1 spent = 1 Point. Redeem free soy milk and snacks!'}
                </p>
              </div>
            </div>

            {/* Points Balance Card */}
            <div className="mt-5 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-cream/70 font-semibold">
                  {lang === 'th' ? 'แต้มสะสมพร้อมใช้' : 'Available Points'}
                </div>
                <div className="font-mono text-3xl sm:text-4xl font-bold text-honey flex items-baseline gap-1 mt-0.5">
                  {profile.availablePoints}
                  <span className="text-xs font-normal text-cream/80">{lang === 'th' ? 'แต้ม' : 'pts'}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-cream/70">
                  {lang === 'th' ? 'ยอดสั่งรวมทั้งหมด' : 'Lifetime Total'}
                </div>
                <div className="font-mono text-lg font-bold text-cream mt-0.5">
                  {baht(profile.totalSpent)}
                </div>
                <div className="text-[10px] text-cream/60 mt-0.5">
                  +{profile.totalPoints - profile.totalSpent} {lang === 'th' ? 'แต้มโบนัส' : 'bonus pts'}
                </div>
              </div>
            </div>

            {/* Tier Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-cream/80 mb-1 font-medium">
                <span>{lang === 'th' ? 'ระดับปัจจุบัน: ' + profile.tierNameTh : 'Tier: ' + profile.tierNameEn}</span>
                <span>{profile.progressPercent}%</span>
              </div>
              <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profile.progressPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-honey to-terracotta rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
            {/* Phone Number Association */}
            <div className="p-4 rounded-2xl bg-forest/5 border border-forest/10">
              <form onSubmit={handleSavePhone} className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                <div className="flex-1 relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest/60" />
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder={lang === 'th' ? 'เบอร์โทรสำหรับสะสมแต้ม (08x-xxx-xxxx)' : 'Phone number (08x-xxx-xxxx)'}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-forest/20 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest text-ink"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-forest text-cream font-semibold text-xs hover:bg-forest-dark transition shrink-0 active:scale-95 shadow-sm"
                >
                  {lang === 'th' ? 'บันทึกเบอร์' : 'Save Phone'}
                </button>
              </form>
              <p className="text-[11px] text-ink-muted mt-2">
                {lang === 'th'
                  ? '💡 แต้มจะเพิ่มอัตโนมัติทุกครั้งที่สั่งซื้อผ่านเบอร์นี้ หรือสั่งที่หน้าร้าน'
                  : '💡 Points are added automatically whenever you order with this phone number.'}
              </p>
            </div>

            {/* Active Coupons Section */}
            {profile.activeCoupons.length > 0 && (
              <div>
                <h4 className="font-bold text-forest text-sm flex items-center gap-1.5 mb-2.5">
                  <Gift className="h-4 w-4 text-terracotta" />
                  {lang === 'th' ? 'คูปองที่แลกไว้พร้อมใช้งาน' : 'Active Rewards & Coupons'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {profile.activeCoupons.map((code) => (
                    <div
                      key={code}
                      className="p-3 rounded-xl bg-white border border-terracotta/30 flex items-center justify-between shadow-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-terracotta text-sm">{code}</div>
                        <div className="text-[10px] text-ink-muted">
                          {lang === 'th' ? 'ยื่นให้ร้านหรือกรอกตอนชำระเงิน' : 'Show to cashier at counter'}
                        </div>
                      </div>
                      <button
                        onClick={() => copyCoupon(code)}
                        className="h-8 px-2.5 rounded-lg bg-terracotta/10 text-terracotta text-xs font-semibold flex items-center gap-1 hover:bg-terracotta/20 transition active:scale-95"
                      >
                        {copiedCode === code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedCode === code ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (lang === 'th' ? 'คัดลอก' : 'Copy')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rewards Catalog */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-forest text-base flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-honey" />
                  {lang === 'th' ? 'ของรางวัลที่สามารถแลกได้' : 'Redeemable Rewards'}
                </h4>
                <span className="text-xs text-ink-muted">
                  {lang === 'th' ? `คงเหลือ ${profile.availablePoints} แต้ม` : `${profile.availablePoints} pts left`}
                </span>
              </div>

              <div className="space-y-3">
                {LOYALTY_REWARDS.map((reward) => {
                  const canAfford = profile.availablePoints >= reward.points_required;
                  const isRedeemed = profile.activeCoupons.includes(reward.code);

                  return (
                    <div
                      key={reward.id}
                      className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        canAfford
                          ? 'bg-white border-forest/20 shadow-xs hover:border-forest/40'
                          : 'bg-white/50 border-forest/10 opacity-75'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink text-sm sm:text-base">
                            {lang === 'th' ? reward.title_th : reward.title_en}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-honey/20 text-forest font-bold">
                            {reward.points_required} {lang === 'th' ? 'แต้ม' : 'pts'}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted mt-1">
                          {lang === 'th' ? reward.description_th : reward.description_en}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {isRedeemed ? (
                          <div className="px-3 py-1.5 rounded-xl bg-forest/10 text-forest text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {lang === 'th' ? 'แลกแล้ว' : 'Redeemed'}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRedeem(reward)}
                            disabled={!canAfford}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 ${
                              canAfford
                                ? 'bg-terracotta text-cream hover:bg-terracotta-dark'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {lang === 'th' ? 'แลกแต้ม' : 'Redeem'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
