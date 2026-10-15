import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Clock, Flame, Check, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLang } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';
import type { Product } from '../types';

export interface DailySpecialItem {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  description_th: string;
  description_en: string;
  category: 'drinks' | 'snacks';
  price: number;
  image_url: string;
  badge_th: string;
  badge_en: string;
  available: boolean;
  batch_time: string;
  stock_left?: number;
}

const DEFAULT_SPECIALS: DailySpecialItem[] = [
  {
    id: 'special-1',
    slug: 'black-sesame-soy',
    name_th: 'น้ำเต้าหู้งาดำคั่วบด',
    name_en: 'Roasted Black Sesame Soy Milk',
    description_th: 'งาดำอินทรีย์คั่วเตาถ่านหอมกรุ่น บดละเอียดผสมน้ำเต้าหู้สดเข้มข้น อุดมด้วยแคลเซียมและสารต้านอนุมูลอิสระ',
    description_en: 'Organic charcoal-roasted black sesame ground fresh into rich soy milk. High calcium and wholesome nuttiness.',
    category: 'drinks',
    price: 25,
    image_url: '/images/soy-milk.jpg',
    badge_th: 'ซิกเนเจอร์ประจำฤดู',
    badge_en: 'Seasonal Signature',
    available: true,
    batch_time: 'ต้มสดใหม่รอบ 06:30 น.',
    stock_left: 18,
  },
  {
    id: 'special-2',
    slug: 'purple-sweet-potato-milk',
    name_th: 'นมสดมันม่วงเชียงใหม่',
    name_en: 'Chiang Mai Purple Potato Milk',
    description_th: 'นมวัวแท้ตุ๋นไฟอ่อน ผสมเนื้อมันม่วงดอยนึ่งสุกหวานธรรมชาติ นุ่มนวลละมุนลิ้น ไม่ใส่สีสังเคราะห์',
    description_en: '100% Chiang Mai fresh cow milk gently blended with steamed purple sweet potato mash. Naturally creamy.',
    category: 'drinks',
    price: 30,
    image_url: '/images/cow-milk.jpg',
    badge_th: 'วัตถุดิบท้องถิ่น',
    badge_en: 'Local Farm Origin',
    available: true,
    batch_time: 'สดจากฟาร์มเช้าวันนี้',
    stock_left: 14,
  },
  {
    id: 'special-3',
    slug: 'jujube-ginger-tea',
    name_th: 'น้ำขิงแก่พุทราจีนเก๋ากี้',
    name_en: 'Old Ginger Jujube Herbal Tea',
    description_th: 'ขิงแก่อายุ 12 เดือน ต้มตุ๋นพุทราจีนไร้เมล็ดและเก๋ากี้ บำรุงเลือด ไล่ลม รสเผ็ดหวานชุ่มคอ',
    description_en: '12-month aged spicy ginger simmered with red dates and goji berries. Warming, soothing, and restorative.',
    category: 'drinks',
    price: 28,
    image_url: '/images/ginger-tea.jpg',
    badge_th: 'สูตรบำรุงธาตุ',
    badge_en: 'Herbal Wellness',
    available: true,
    batch_time: 'เคี่ยวไฟอ่อน 4 ชั่วโมง',
    stock_left: 20,
  },
  {
    id: 'special-4',
    slug: 'pandan-dip-patongko',
    name_th: 'ปาท่องโก๋สังขยาใบเตยสด',
    name_en: 'Crispy Patongko with Pandan Dip',
    description_th: 'ปาท่องโก๋คู่ตัวโตทอดกรอบไม่อมน้ำมัน เสิร์ฟพร้อมสังขยาใบเตยแท้เคี่ยวกะทิสด หอมละมุนไม่หวานแหลม',
    description_en: 'Golden crispy fried crullers served with artisanal steamed pandan coconut custard dip.',
    category: 'snacks',
    price: 25,
    image_url: '/images/patongko.jpg',
    badge_th: 'จับคู่ยอดนิยม',
    badge_en: 'Bestseller Pair',
    available: true,
    batch_time: 'ทอดร้อนใหม่จากเตา',
    stock_left: 25,
  },
];

export default function DailySpecials({
  onSelectProduct,
}: {
  onSelectProduct: (product: Product) => void;
}) {
  const { lang } = useLang();
  const { add } = useCart();
  const { showToast } = useToast();
  const [specials, setSpecials] = useState<DailySpecialItem[]>(DEFAULT_SPECIALS);
  const [loading, setLoading] = useState(true);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};

    if (!db) {
      setLoading(false);
      return;
    }

    try {
      const specialsRef = collection(db, 'daily_specials');
      unsubscribe = onSnapshot(
        specialsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const items: DailySpecialItem[] = [];
            snapshot.forEach((d) => {
              items.push({ id: d.id, ...(d.data() as Omit<DailySpecialItem, 'id'>) });
            });
            setSpecials(items);
          } else {
            // Seed initial specials into Firestore for live persistence
            DEFAULT_SPECIALS.forEach(async (item) => {
              try {
                await setDoc(doc(db!, 'daily_specials', item.id), item, { merge: true });
              } catch {}
            });
            setSpecials(DEFAULT_SPECIALS);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('[Daily Specials] Firestore live listener notice:', err.message);
          setSpecials(DEFAULT_SPECIALS);
          setLoading(false);
        }
      );
    } catch {
      setSpecials(DEFAULT_SPECIALS);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const handleQuickAdd = (item: DailySpecialItem, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');

    const productCompatible: Product = {
      id: Math.abs(item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)),
      slug: item.slug,
      name_th: item.name_th,
      name_en: item.name_en,
      description_th: `<p>${item.description_th}</p>`,
      description_en: `<p>${item.description_en}</p>`,
      category: item.category,
      price: item.price,
      image_url: item.image_url,
      available: item.available,
      sold_out: !item.available,
      stock: item.stock_left || 20,
    };

    add(productCompatible, {
      temp: 'warm',
      sweet: 'less',
      container: 'bag',
    });

    setJustAddedId(item.id);
    setTimeout(() => setJustAddedId(null), 1200);

    showToast(
      lang === 'th' ? `เพิ่ม ${item.name_th} ลงตะกร้าแล้ว` : `Added ${item.name_en}`,
      lang === 'th' ? 'สูตรพิเศษประจำวัน หอมอร่อยสดใหม่' : 'Daily seasonal special added to your cart',
      'cart'
    );
  };

  const handleOpenDetail = (item: DailySpecialItem) => {
    triggerHaptic('tap');
    const productCompatible: Product = {
      id: Math.abs(item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)),
      slug: item.slug,
      name_th: item.name_th,
      name_en: item.name_en,
      description_th: `<p>${item.description_th}</p>`,
      description_en: `<p>${item.description_en}</p>`,
      category: item.category,
      price: item.price,
      image_url: item.image_url,
      available: item.available,
      sold_out: !item.available,
      stock: item.stock_left || 20,
    };
    onSelectProduct(productCompatible);
  };

  return (
    <section className="mb-12" id="daily-specials">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-honey/20 text-forest text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-700 animate-pulse" />
            <span>{lang === 'th' ? 'เมนูพิเศษประจำวัน · อัปเดตสดจากเตา' : 'Daily Specials · Live Firestore'}</span>
          </div>
          <h2 className="font-display italic font-bold text-3xl sm:text-4xl text-forest leading-tight">
            {lang === 'th' ? 'รสชาติเฉพาะฤดูกาล' : 'Seasonal Rotations'}
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            {lang === 'th'
              ? 'คัดสรรเครื่องดื่มและขนมสูตรพิเศษ ต้มใหม่จำนวนจำกัดในแต่ละวัน'
              : 'Small-batch seasonal creations crafted daily from Chiang Mai local ingredients'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-forest/70 self-start sm:self-auto">
          <Clock className="h-3.5 w-3.5 text-terracotta" />
          <span>{lang === 'th' ? 'ผลัดเปลี่ยนสูตรทุกวัน' : 'Rotated every morning'}</span>
        </div>
      </div>

      {/* Grid of Specials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {specials.map((item, index) => {
          const isJustAdded = justAddedId === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              onClick={() => handleOpenDetail(item)}
              className="group cursor-pointer rounded-3xl liquid-glass border border-white/80 hover:border-forest/30 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Image and Badges */}
                <div className="relative aspect-4/3 overflow-hidden bg-cream-deep">
                  <img
                    src={item.image_url}
                    alt={lang === 'th' ? item.name_th : item.name_en}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-forest-dark/85 text-cream text-[10px] font-bold shadow-xs backdrop-blur-md flex items-center gap-1 border border-white/20">
                      <Flame className="h-3 w-3 text-honey" />
                      <span>{lang === 'th' ? item.badge_th : item.badge_en}</span>
                    </span>
                  </div>

                  {/* Price Tag */}
                  <div className="absolute bottom-3 left-3 text-white">
                    <span className="text-xl sm:text-2xl font-bold font-display italic leading-none drop-shadow-md">
                      ฿{item.price}
                    </span>
                  </div>

                  {/* Live Stock / Batch Indicator */}
                  {item.stock_left && (
                    <div className="absolute bottom-3 right-3">
                      <span className="px-2 py-0.5 rounded-md bg-white/90 text-forest text-[10px] font-mono font-bold shadow-xs">
                        {lang === 'th' ? `เหลือ ${item.stock_left} ที่` : `${item.stock_left} left`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-1.5">
                  <h3 className="font-display italic font-bold text-lg text-forest group-hover:text-terracotta transition">
                    {lang === 'th' ? item.name_th : item.name_en}
                  </h3>
                  <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                    {lang === 'th' ? item.description_th : item.description_en}
                  </p>
                  <div className="text-[11px] text-amber-800 font-medium pt-1 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-honey" />
                    <span>{item.batch_time}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 pt-0">
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(item, e)}
                  className={`w-full h-10 px-4 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 ${
                    isJustAdded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-forest hover:bg-forest-dark text-cream hover:shadow-md'
                  }`}
                >
                  {isJustAdded ? (
                    <>
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>{lang === 'th' ? 'ใส่ตะกร้าแล้ว!' : 'Added!'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>{lang === 'th' ? 'สั่งเมนูพิเศษนี้' : 'Order Special'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
