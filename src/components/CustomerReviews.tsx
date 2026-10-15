import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, Send, ThumbsUp, Sparkles, Check, Heart, User, Coffee } from 'lucide-react';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';

export interface ReviewItem {
  id: string;
  author: string;
  product_name: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
}

const SEED_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    author: 'คุณพิมลดา (Pim)',
    product_name: 'น้ำเต้าหู้งาดำคั่วบด',
    rating: 5,
    comment: 'น้ำเต้าหู้หอมกลิ่นงาดำคั่วชัดเจนมาก หวานน้อย 50% กำลังดี รสสัมผัสเข้มข้น ไม่เจือจางเลย ดื่มร้อนๆ ตอนเช้าอร่อยมากค่ะ',
    created_at: 'เมื่อวานนี้',
  },
  {
    id: 'rev-2',
    author: 'ลุงสมศักดิ์',
    product_name: 'น้ำขิงแก่พุทราจีนเก๋ากี้',
    rating: 5,
    comment: 'ขิงแก่เผ็ดร้อนสะใจคนวัยเกษียณจริงๆ มีรสหวานจากพุทราจีนธรรมชาติ ช่วยไล่ลมในท้องดีมาก แวะซื้อทุกวันที่มาเดินตลาด',
    created_at: '2 วันที่แล้ว',
  },
  {
    id: 'rev-3',
    author: 'น้องน้ำหวาน',
    product_name: 'ปาท่องโก๋สังขยาใบเตยสด',
    rating: 5,
    comment: 'ปาท่องโก๋กรอบนอกนุ่มในมากกก สังขยาใบเตยหอมละมุนไม่หวานบาดคอ ทานคู่กับนมสดอุ่นๆ คือที่สุด!',
    created_at: '3 วันที่แล้ว',
  },
  {
    id: 'rev-4',
    author: 'David R.',
    product_name: 'Chiang Mai Purple Potato Milk',
    rating: 5,
    comment: 'Best milk drink in Chiang Mai! The steamed purple sweet potato blend gives it a velvety texture. Super fresh and not overly sweet.',
    created_at: '4 days ago',
  },
];

const MENU_OPTIONS = [
  { th: 'น้ำเต้าหู้งาดำคั่วบด (Roasted Black Sesame Soy)', en: 'Roasted Black Sesame Soy Milk' },
  { th: 'นมสดมันม่วงเชียงใหม่ (Purple Potato Milk)', en: 'Chiang Mai Purple Potato Milk' },
  { th: 'น้ำขิงแก่พุทราจีนเก๋ากี้ (Jujube Ginger Tea)', en: 'Old Ginger Jujube Herbal Tea' },
  { th: 'ปาท่องโก๋สังขยาใบเตยสด (Pandan Patongko)', en: 'Crispy Patongko with Pandan Dip' },
  { th: 'น้ำเต้าหู้สูตรดั้งเดิม (Classic Soy Milk)', en: 'Classic Fresh Soy Milk' },
  { th: 'นมวัวสดแท้ 100% (Fresh Cow Milk)', en: '100% Farm Fresh Cow Milk' },
];

export default function CustomerReviews() {
  const { lang } = useLang();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<ReviewItem[]>(SEED_REVIEWS);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('customer_name') || '');
  const [selectedProduct, setSelectedProduct] = useState(MENU_OPTIONS[0].th);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Listen to Firestore reviews collection in real time
  useEffect(() => {
    if (!db) return;

    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'reviews'), orderBy('created_at', 'desc'), limit(15));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: ReviewItem[] = [];
            snapshot.forEach((d) => {
              const data = d.data();
              list.push({
                id: d.id,
                author: data.author || 'ลูกค้าวันใจ',
                product_name: data.product_name || 'น้ำเต้าหู้สด',
                rating: Number(data.rating) || 5,
                comment: data.comment || '',
                created_at: data.created_at?.toDate
                  ? data.created_at.toDate().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'เร็วๆ นี้',
              });
            });
            setReviews(list);
          }
        },
        (err) => {
          console.warn('[CustomerReviews] Live listener notice:', err.message);
        }
      );
    } catch (e) {
      console.warn('Reviews setup notice:', e);
    }

    return () => unsubscribe();
  }, [lang]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      showToast(
        lang === 'th' ? 'กรุณากรอกชื่อและความคิดเห็น' : 'Please enter your name and review',
        '',
        'error'
      );
      return;
    }

    setSubmitting(true);
    triggerHaptic('medium');

    const newRevObj = {
      author: authorName.trim(),
      product_name: selectedProduct,
      rating,
      comment: comment.trim(),
      created_at: serverTimestamp(),
    };

    try {
      if (db) {
        await addDoc(collection(db, 'reviews'), newRevObj);
      }

      // Optimistic local update
      const localItem: ReviewItem = {
        id: `local-${Date.now()}`,
        author: authorName.trim(),
        product_name: selectedProduct,
        rating,
        comment: comment.trim(),
        created_at: lang === 'th' ? 'เมื่อสักครู่' : 'Just now',
      };
      setReviews((prev) => [localItem, ...prev]);

      showToast(
        lang === 'th' ? 'ขอบคุณสำหรับรีวิวของคุณ!' : 'Thank you for your review!',
        lang === 'th' ? 'ความคิดเห็นของคุณถูกบันทึกลงระบบแล้ว' : 'Your feedback was shared to the community',
        'success'
      );

      setComment('');
      setShowForm(false);
    } catch (err) {
      console.warn('Review submit fallback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate average rating
  const averageRating = (
    reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)
  ).toFixed(1);

  return (
    <section className="mb-14" id="reviews">
      <div className="rounded-3xl liquid-glass border border-white/80 p-5 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-forest/10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-honey/20 text-forest text-xs font-bold uppercase tracking-wider mb-2">
              <Star className="h-3.5 w-3.5 fill-honey text-honey" />
              <span>{lang === 'th' ? 'รีวิวและความประทับใจลูกค้า' : 'Customer Reviews & Feedback'}</span>
            </div>
            <h2 className="font-display italic font-bold text-3xl sm:text-4xl text-forest leading-tight">
              {lang === 'th' ? 'เสียงจากผู้ดื่มวันใจ Soy' : 'Community Love & Stories'}
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              {lang === 'th'
                ? 'แบ่งปันความรู้สึกและรสชาติเครื่องดื่มประจำวันของคุณ'
                : 'Real reviews from locals and travelers enjoying fresh morning soy'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Average Rating Badge */}
            <div className="flex items-center gap-2 bg-white/90 border border-forest/15 px-3.5 py-2 rounded-2xl shadow-xs">
              <div className="flex items-center text-honey">
                <Star className="h-5 w-5 fill-honey" />
              </div>
              <div>
                <div className="font-display italic font-bold text-lg text-forest leading-none">
                  {averageRating} <span className="text-xs font-normal text-ink-muted">/ 5.0</span>
                </div>
                <div className="text-[10px] text-ink-muted font-thai">
                  {reviews.length} {lang === 'th' ? 'รีวิวจากลูกค้า' : 'reviews'}
                </div>
              </div>
            </div>

            {/* Write Review Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowForm((prev) => !prev);
              }}
              className="h-11 px-4 sm:px-5 rounded-full bg-forest hover:bg-forest-dark text-cream font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{showForm ? (lang === 'th' ? 'ปิดแบบฟอร์ม' : 'Close Form') : (lang === 'th' ? 'เขียนรีวิว' : 'Write Review')}</span>
            </button>
          </div>
        </div>

        {/* Review Submission Form Drawer */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmitReview}
              className="mt-6 pt-2 pb-6 border-b border-forest/10 space-y-4"
            >
              <div className="p-4 sm:p-5 rounded-2xl bg-white/90 border border-forest/15 shadow-sm space-y-3.5">
                <h4 className="font-display italic font-bold text-base text-forest">
                  {lang === 'th' ? 'แบ่งปันความคิดเห็นของคุณ' : 'Share Your Experience'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-forest mb-1 font-thai">
                      {lang === 'th' ? 'ชื่อของคุณ:' : 'Your Name:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder={lang === 'th' ? 'เช่น คุณสมชาย หรือ Pim' : 'e.g. Somchai or Pim'}
                      className="w-full h-10 px-3 rounded-xl border border-forest/20 text-xs focus:outline-none focus:border-forest bg-cream/30"
                    />
                  </div>

                  {/* Menu Item Select */}
                  <div>
                    <label className="block text-xs font-bold text-forest mb-1 font-thai">
                      {lang === 'th' ? 'เลือกเมนูที่ต้องการรีวิว:' : 'Select Menu Item:'}
                    </label>
                    <select
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-forest/20 text-xs focus:outline-none focus:border-forest bg-cream/30"
                    >
                      {MENU_OPTIONS.map((opt, i) => (
                        <option key={i} value={opt.th}>
                          {lang === 'th' ? opt.th : opt.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Star Rating Picker */}
                <div>
                  <label className="block text-xs font-bold text-forest mb-1.5 font-thai">
                    {lang === 'th' ? 'คะแนนความพึงพอใจ:' : 'Your Rating:'}
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (hoverRating !== null ? hoverRating : rating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => {
                            triggerHaptic('selection');
                            setRating(star);
                          }}
                          className="p-1 text-honey hover:scale-115 transition"
                          aria-label={`${star} Stars`}
                        >
                          <Star
                            className={`h-6 w-6 transition-colors ${
                              isFilled ? 'fill-honey text-honey' : 'text-gray-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 font-mono text-xs font-bold text-forest">
                      {rating} / 5
                    </span>
                  </div>
                </div>

                {/* Comment Textarea */}
                <div>
                  <label className="block text-xs font-bold text-forest mb-1 font-thai">
                    {lang === 'th' ? 'ความคิดเห็นเกี่ยวกับรสชาติและการบริการ:' : 'Your Comments & Feedback:'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      lang === 'th'
                        ? 'เช่น หอมงาดำมาก หวานน้อยกำลังดี ดื่มอุ่นๆ ยามเช้าสดชื่นมาก...'
                        : 'Tell us how you enjoyed the drink or snack...'
                    }
                    className="w-full p-3 rounded-xl border border-forest/20 text-xs focus:outline-none focus:border-forest bg-cream/30 leading-relaxed"
                  />
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="h-9 px-4 rounded-full text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-9 px-5 rounded-full bg-forest hover:bg-forest-dark text-cream font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{submitting ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (lang === 'th' ? 'ส่งรีวิวทันที' : 'Post Review')}</span>
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 sm:p-5 rounded-2xl bg-white/70 hover:bg-white border border-forest/10 hover:border-forest/25 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                {/* Reviewer Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-forest/10 text-forest flex items-center justify-center font-bold text-xs">
                      {rev.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold font-thai text-xs text-forest">
                        {rev.author}
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        {rev.created_at}
                      </div>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center text-honey">
                    {Array(5)
                      .fill(0)
                      .map((_, idx) => (
                        <Star
                          key={idx}
                          className={`h-3.5 w-3.5 ${
                            idx < rev.rating ? 'fill-honey text-honey' : 'text-gray-200'
                          }`}
                        />
                      ))}
                  </div>
                </div>

                {/* Target Product Badge */}
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-forest/5 text-forest text-[11px] font-semibold mb-2.5">
                  <Coffee className="h-3 w-3 text-terracotta" />
                  <span>{rev.product_name}</span>
                </div>

                {/* Comment */}
                <p className="text-xs text-ink/90 leading-relaxed font-thai italic">
                  "{rev.comment}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
