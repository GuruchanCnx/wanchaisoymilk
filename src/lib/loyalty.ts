/**
 * Customer Loyalty & Points Tracker System for WanJai Soy Milk
 * Increments points automatically based on order values:
 * 1 Baht spent = 1 Loyalty Point (คะแนนสะสมวันใจ)
 */

export interface LoyaltyReward {
  id: string;
  title_th: string;
  title_en: string;
  points_required: number;
  discount_baht: number;
  description_th: string;
  description_en: string;
  code: string;
}

export const LOYALTY_REWARDS: LoyaltyReward[] = [
  {
    id: 'patongko-pair',
    title_th: 'ฟรี! ปาท่องโก๋ 1 คู่',
    title_en: 'Free Patongko Pair',
    points_required: 50,
    discount_baht: 6,
    description_th: 'แลกรับปาท่องโก๋ทอดกรอบร้อนๆ 2 ตัว ทานคู่กับน้ำเต้าหู้',
    description_en: 'Crispy golden Chinese crullers pair',
    code: 'WANJAI50',
  },
  {
    id: 'soy-milk-bag',
    title_th: 'ฟรี! น้ำเต้าหู้ร้อน 1 ถุง',
    title_en: 'Free Hot Soy Milk Bag',
    points_required: 100,
    discount_baht: 15,
    description_th: 'น้ำเต้าหู้ทำสดใหม่ทุกเช้าสูตรดั้งเดิม เลือกระดับความหวานได้',
    description_en: 'Fresh traditional hot soy milk bag',
    code: 'WANJAI100',
  },
  {
    id: 'cow-milk-cup',
    title_th: 'ฟรี! นมวัวสดแท้ 1 แก้ว',
    title_en: 'Free Farm Cow Milk Cup',
    points_required: 180,
    discount_baht: 25,
    description_th: 'นมวัวแท้ 100% ส่งตรงจากฟาร์มเชียงใหม่ หอมมันเข้มข้น',
    description_en: 'Fresh whole farm cow milk cup',
    code: 'WANJAI180',
  },
  {
    id: 'signature-set',
    title_th: 'ฟรี! วันใจ คอมโบเซ็ต VIP',
    title_en: 'Free Wanchai Combo Set VIP',
    points_required: 300,
    discount_baht: 45,
    description_th: 'น้ำเต้าหู้ทรงเครื่อง + นมสด + ปาท่องโก๋ 2 ตัว',
    description_en: 'Soy milk with toppings + Cow milk + 2 Patongko',
    code: 'WANJAI300',
  },
];

export interface LoyaltyProfile {
  phone: string;
  name: string;
  totalSpent: number;
  totalPoints: number;
  redeemedPoints: number;
  availablePoints: number;
  tier: 'friend' | 'master' | 'vip';
  tierNameTh: string;
  tierNameEn: string;
  nextTierPoints: number;
  progressPercent: number;
  activeCoupons: string[];
}

export function getLoyaltyProfile(phoneParam?: string): LoyaltyProfile {
  const phone = phoneParam || (typeof window !== 'undefined' ? localStorage.getItem('customer_phone') || '' : '');
  const name = typeof window !== 'undefined' ? localStorage.getItem('customer_name') || 'ลูกค้าคนสนิทวันใจ' : 'ลูกค้าคนสนิทวันใจ';

  let totalSpent = 0;
  let redeemedPoints = 0;

  if (typeof window !== 'undefined') {
    try {
      // 1. Calculate from local orders
      const rawOrders = localStorage.getItem('wanjai_orders');
      if (rawOrders) {
        const orders = JSON.parse(rawOrders);
        if (Array.isArray(orders)) {
          totalSpent = orders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
        }
      }

      // 2. Add extra stored points (bonus welcome points)
      const storedRedeemed = Number(localStorage.getItem('wanjai_redeemed_points') || '0');
      redeemedPoints = isNaN(storedRedeemed) ? 0 : storedRedeemed;
    } catch {}
  }

  // Minimum welcome points for all users
  const welcomeBonus = 30;
  const totalPoints = Math.round(totalSpent) + welcomeBonus;
  const availablePoints = Math.max(0, totalPoints - redeemedPoints);

  // Tier determination
  let tier: 'friend' | 'master' | 'vip' = 'friend';
  let tierNameTh = 'เพื่อนวันใจ (Soy Friend)';
  let tierNameEn = 'Soy Friend';
  let nextTierPoints = 200;
  let progressPercent = Math.min(100, Math.round((totalPoints / 200) * 100));

  if (totalPoints >= 500) {
    tier = 'vip';
    tierNameTh = 'มังกรทอง VIP (Golden Dragon VIP)';
    tierNameEn = 'Golden Dragon VIP';
    nextTierPoints = 1000;
    progressPercent = 100;
  } else if (totalPoints >= 200) {
    tier = 'master';
    tierNameTh = 'คอเต้าหู้ตัวจริง (Bean Master)';
    tierNameEn = 'Bean Master';
    nextTierPoints = 500;
    progressPercent = Math.min(100, Math.round(((totalPoints - 200) / 300) * 100));
  }

  // Active coupons
  let activeCoupons: string[] = [];
  try {
    const rawCoupons = localStorage.getItem('wanjai_active_coupons');
    if (rawCoupons) activeCoupons = JSON.parse(rawCoupons);
  } catch {}

  return {
    phone,
    name,
    totalSpent,
    totalPoints,
    redeemedPoints,
    availablePoints,
    tier,
    tierNameTh,
    tierNameEn,
    nextTierPoints,
    progressPercent,
    activeCoupons,
  };
}

export function redeemLoyaltyReward(reward: LoyaltyReward): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Unavailable' };

  const profile = getLoyaltyProfile();
  if (profile.availablePoints < reward.points_required) {
    return {
      success: false,
      message: `คะแนนสะสมไม่เพียงพอ (ต้องการ ${reward.points_required} แต้ม แต่มี ${profile.availablePoints} แต้ม)`,
    };
  }

  const newRedeemed = profile.redeemedPoints + reward.points_required;
  localStorage.setItem('wanjai_redeemed_points', String(newRedeemed));

  // Store active coupon
  const activeCoupons = profile.activeCoupons || [];
  if (!activeCoupons.includes(reward.code)) {
    activeCoupons.push(reward.code);
    localStorage.setItem('wanjai_active_coupons', JSON.stringify(activeCoupons));
  }

  return {
    success: true,
    message: `แลกรับ "${reward.title_th}" สำเร็จ! คูปองโค้ด ${reward.code} ถูกเปิดใช้งานแล้ว`,
  };
}
