import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Image as ImageIcon,
  Upload,
  Check,
  X,
  Flame,
  Clock,
  RotateCcw,
  AlertCircle,
  Save,
  Eye,
  Store,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';
import { compressImage } from '../lib/image-compress';
import RichTextEditor from './RichTextEditor';
import type { DailySpecialItem } from './DailySpecials';

const DEFAULT_SPECIALS: DailySpecialItem[] = [
  {
    id: 'special-1',
    slug: 'black-sesame-soy',
    name_th: 'น้ำเต้าหู้งาดำคั่วบด',
    name_en: 'Roasted Black Sesame Soy Milk',
    description_th:
      '<p>งาดำอินทรีย์คั่วเตาถ่านหอมกรุ่น บดละเอียดผสมน้ำเต้าหู้สดเข้มข้น อุดมด้วยแคลเซียมและสารต้านอนุมูลอิสระ</p>',
    description_en:
      '<p>Organic charcoal-roasted black sesame ground fresh into rich soy milk. High calcium and wholesome nuttiness.</p>',
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
    description_th:
      '<p>นมวัวแท้ตุ๋นไฟอ่อน ผสมเนื้อมันม่วงดอยนึ่งสุกหวานธรรมชาติ นุ่มนวลละมุนลิ้น ไม่ใส่สีสังเคราะห์</p>',
    description_en:
      '<p>100% Chiang Mai fresh cow milk gently blended with steamed purple sweet potato mash. Naturally creamy.</p>',
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
    description_th:
      '<p>ขิงแก่อายุ 12 เดือน ต้มตุ๋นพุทราจีนไร้เมล็ดและเก๋ากี้ บำรุงเลือด ไล่ลม รสเผ็ดหวานชุ่มคอ</p>',
    description_en:
      '<p>12-month aged spicy ginger simmered with red dates and goji berries. Warming, soothing, and restorative.</p>',
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
    description_th:
      '<p>ปาท่องโก๋คู่ตัวโตทอดกรอบไม่อมน้ำมัน เสิร์ฟพร้อมสังขยาใบเตยแท้เคี่ยวกะทิสด หอมละมุนไม่หวานแหลม</p>',
    description_en:
      '<p>Golden crispy fried crullers served with artisanal steamed pandan coconut custard dip.</p>',
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

const PRESET_GALLERY = [
  { label: 'Soy Milk / น้ำเต้าหู้', url: '/images/soy-milk.jpg' },
  { label: 'Fresh Milk / นมสดมันม่วง', url: '/images/cow-milk.jpg' },
  { label: 'Ginger Tea / น้ำขิง', url: '/images/ginger-tea.jpg' },
  { label: 'Patongko / ปาท่องโก๋', url: '/images/patongko.jpg' },
  { label: 'Soy Pudding / เต้าฮวย', url: '/images/soy-curd.jpg' },
  { label: 'Steamed Buns / ซาลาเปา', url: '/images/steamed-buns.jpg' },
];

export default function SeasonalRotationsManager() {
  const { lang, t } = useLang();
  const { showToast } = useToast();
  const [items, setItems] = useState<DailySpecialItem[]>(DEFAULT_SPECIALS);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<DailySpecialItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to Firestore 'daily_specials'
  useEffect(() => {
    let unsub = () => {};
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      const colRef = collection(db, 'daily_specials');
      unsub = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: DailySpecialItem[] = [];
            snapshot.forEach((d) => {
              list.push({ id: d.id, ...(d.data() as Omit<DailySpecialItem, 'id'>) });
            });
            setItems(list);
          } else {
            setItems(DEFAULT_SPECIALS);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Firestore daily_specials notice:', err);
          setItems(DEFAULT_SPECIALS);
          setLoading(false);
        }
      );
    } catch {
      setItems(DEFAULT_SPECIALS);
      setLoading(false);
    }

    return () => unsub();
  }, []);

  const handleCreateNew = () => {
    triggerHaptic('tap');
    const newId = `special-${Date.now()}`;
    setEditingItem({
      id: newId,
      slug: `seasonal-${Date.now()}`,
      name_th: '',
      name_en: '',
      description_th: '<p>สูตรพิเศษประจำฤดู คัดสรรวัตถุดิบท้องถิ่นเชียงใหม่...</p>',
      description_en: '<p>Small-batch seasonal rotation handcrafted with local ingredients...</p>',
      category: 'drinks',
      price: 25,
      image_url: '/images/soy-milk.jpg',
      badge_th: 'ซิกเนเจอร์ประจำฤดู',
      badge_en: 'Seasonal Signature',
      available: true,
      batch_time: 'ต้มสดใหม่รอบ 06:30 น.',
      stock_left: 20,
    });
    setIsNew(true);
  };

  const handleEdit = (item: DailySpecialItem) => {
    triggerHaptic('tap');
    setEditingItem({ ...item });
    setIsNew(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        lang === 'th'
          ? `ต้องการลบเมนู "${name}" ออกจากรสชาติเฉพาะฤดูกาลใช่หรือไม่?`
          : `Delete "${name}" from seasonal rotations?`
      )
    ) {
      return;
    }
    triggerHaptic('warning');

    try {
      if (db) {
        await deleteDoc(doc(db, 'daily_specials', id));
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
      showToast(
        lang === 'th' ? 'ลบเมนูสำเร็จ' : 'Seasonal item deleted',
        lang === 'th' ? `ลบ "${name}" เรียบร้อยแล้ว` : `Removed "${name}" from live rotations`,
        'info'
      );
    } catch (e) {
      console.warn('Delete failed:', e);
      showToast('Error', 'Failed to delete seasonal special', 'error');
    }
  };

  const handleHeroImageUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingImage(true);
    triggerHaptic('medium');

    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });

      let finalUrl = compressed;
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: compressed, filename: file.name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.url) finalUrl = data.url;
        }
      } catch (e) {
        console.warn('Upload API fallback:', e);
      }

      if (editingItem) {
        setEditingItem({ ...editingItem, image_url: finalUrl });
      }
      triggerHaptic('success');
      showToast(
        lang === 'th' ? 'อัปโหลดรูปภาพสำเร็จ' : 'Image Uploaded',
        lang === 'th' ? 'ปรับใช้รูปภาพใหม่เรียบร้อยแล้ว' : 'New hero image applied to special',
        'success'
      );
    } catch {
      triggerHaptic('error');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editingItem.name_th.trim() || !editingItem.name_en.trim()) {
      showToast(
        lang === 'th' ? 'กรุณาระบุชื่อเมนู' : 'Name Required',
        lang === 'th' ? 'กรุณากรอกชื่อทั้งภาษาไทยและอังกฤษ' : 'Please provide both Thai and English names',
        'error'
      );
      return;
    }

    setSaving(true);
    triggerHaptic('success');

    try {
      // 1. Save to Firestore
      if (db) {
        await setDoc(doc(db, 'daily_specials', editingItem.id), editingItem, { merge: true });
      }

      // 2. Update local state
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === editingItem.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = editingItem;
          return updated;
        }
        return [...prev, editingItem];
      });

      showToast(
        lang === 'th' ? 'บันทึกรสชาติเฉพาะฤดูกาลสำเร็จ!' : 'Seasonal Rotation Saved!',
        lang === 'th'
          ? `อัปเดตเมนู "${editingItem.name_th}" ลงระบบเรียบร้อยแล้ว`
          : `Updated "${editingItem.name_en}" live on storefront`,
        'success'
      );
      setEditingItem(null);
    } catch (err: any) {
      console.warn('Save seasonal item error:', err);
      showToast('Error', err?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl liquid-glass border border-white/70 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-forest text-cream flex items-center justify-center shadow-xs">
            <Sparkles className="h-5 w-5 text-honey" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display italic font-bold text-lg text-forest leading-none">
                {lang === 'th' ? 'จัดการรสชาติเฉพาะฤดูกาล (Seasonal Rotations)' : 'Seasonal Rotations Editor'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-honey/20 text-forest text-[10px] font-mono font-bold uppercase">
                Live Firestore
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              {lang === 'th'
                ? 'แก้ไขเมนูหมุนเวียนประจำวัน อัปโหลดรูปภาพ และแก้ไขรายละเอียดด้วย Rich Text Editor'
                : 'Edit daily rotating specials, upload photography, and craft descriptions with rich text'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateNew}
          className="h-10 px-4 rounded-full bg-forest text-cream font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-forest-dark transition active:scale-95 shadow-xs shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{lang === 'th' ? '+ เพิ่มรสชาติใหม่' : '+ Add Seasonal Special'}</span>
        </button>
      </div>

      {/* Grid of Current Seasonal Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl liquid-glass border border-white/80 p-4.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start gap-3">
                <img
                  src={item.image_url}
                  alt={item.name_th}
                  className="h-20 w-20 rounded-2xl object-cover border border-forest/15 shrink-0 shadow-xs"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-forest-dark text-cream text-[10px] font-bold flex items-center gap-1">
                      <Flame className="h-3 w-3 text-honey" />
                      <span>{lang === 'th' ? item.badge_th : item.badge_en}</span>
                    </span>
                    <span className="font-display italic font-bold text-terracotta text-sm">
                      ฿{item.price}
                    </span>
                    {item.stock_left && (
                      <span className="px-1.5 py-0.5 rounded bg-cream text-forest text-[10px] font-mono font-bold border border-forest/15">
                        {lang === 'th' ? `เหลือ ${item.stock_left}` : `${item.stock_left} left`}
                      </span>
                    )}
                  </div>

                  <h4 className="font-display italic font-bold text-forest text-base mt-1 truncate">
                    {lang === 'th' ? item.name_th : item.name_en}
                  </h4>
                  <p className="text-[11px] text-ink-muted truncate">
                    {lang === 'th' ? item.name_en : item.name_th}
                  </p>
                  <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-terracotta" />
                    <span>{item.batch_time}</span>
                  </div>
                </div>
              </div>

              {/* Rich text preview snippet */}
              <div
                className="mt-3 p-2.5 rounded-xl bg-white/50 border border-forest/10 text-xs text-ink line-clamp-2 rte-preview font-thai"
                dangerouslySetInnerHTML={{
                  __html: lang === 'th' ? item.description_th : item.description_en,
                }}
              />
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-forest/10 flex items-center justify-between">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  item.available
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {item.available
                  ? lang === 'th'
                    ? 'พร้อมเสิร์ฟ (Active)'
                    : 'Available'
                  : lang === 'th'
                  ? 'หมดชั่วคราว (Sold out)'
                  : 'Sold Out'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(item)}
                  className="h-8 px-3 rounded-full bg-forest/10 hover:bg-forest hover:text-cream text-forest text-xs font-bold flex items-center gap-1 transition active:scale-95"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{lang === 'th' ? 'แก้ไข' : 'Edit'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.name_th)}
                  className="h-8 w-8 rounded-full text-chili hover:bg-chili/10 flex items-center justify-center transition active:scale-90"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Seasonal Rotation Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-forest-dark/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-cream w-full max-w-3xl rounded-4xl shadow-2xl border border-white/70 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-forest/10 liquid-glass flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-forest text-cream flex items-center justify-center">
                  <Sparkles className="h-4.5 w-4.5 text-honey" />
                </div>
                <div>
                  <h3 className="font-display italic font-bold text-xl text-forest leading-none">
                    {isNew
                      ? lang === 'th'
                        ? 'เพิ่มรสชาติเฉพาะฤดูกาลใหม่'
                        : 'New Seasonal Rotation'
                      : lang === 'th'
                      ? 'แก้ไขรสชาติเฉพาะฤดูกาล'
                      : 'Edit Seasonal Rotation'}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {lang === 'th'
                      ? 'อัปโหลดภาพถ่ายและแต่งรายละเอียดด้วย Rich Text Editor'
                      : 'Upload photography and edit rich descriptions'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="h-8 w-8 rounded-full bg-forest/10 hover:bg-forest/20 text-forest flex items-center justify-center transition active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Image Upload Feature with Preview & Preset Gallery */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-forest">
                  {lang === 'th' ? 'รูปภาพเมนูประจำฤดู (Cover Image)' : 'Special Cover Photo'}
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-3xl border border-forest/15 bg-white/60">
                  <div className="relative group shrink-0">
                    <img
                      src={editingItem.image_url}
                      alt="Preview"
                      className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl object-cover border-2 border-forest/20 shadow-sm"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-mono">
                      Preview
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleHeroImageUpload(e.target.files[0]);
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-10 px-4 rounded-full bg-forest text-cream font-bold text-xs flex items-center gap-1.5 hover:bg-forest-dark transition active:scale-95 shadow-xs"
                      >
                        <Upload className="h-4 w-4 text-honey" />
                        <span>
                          {uploadingImage
                            ? lang === 'th'
                              ? 'กำลังประมวลผลรูปภาพ...'
                              : 'Uploading...'
                            : lang === 'th'
                            ? 'อัปโหลดรูปภาพใหม่ (Upload Photo)'
                            : 'Upload New Photo'}
                        </span>
                      </button>

                      <span className="text-xs text-ink-muted">
                        {lang === 'th' ? 'หรือเลือกภาพพรีเซ็ต:' : 'or choose preset:'}
                      </span>
                    </div>

                    {/* Quick Preset Gallery */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {PRESET_GALLERY.map((p) => (
                        <button
                          key={p.url}
                          type="button"
                          onClick={() => {
                            triggerHaptic('tap');
                            setEditingItem({ ...editingItem, image_url: p.url });
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                            editingItem.image_url === p.url
                              ? 'bg-forest text-cream border-forest font-bold shadow-xs'
                              : 'bg-white/80 text-forest/80 hover:bg-forest/10 border-forest/15'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest mb-1">
                    {lang === 'th' ? 'ชื่อภาษาไทย (Thai Name)' : 'Thai Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.name_th}
                    onChange={(e) => setEditingItem({ ...editingItem, name_th: e.target.value })}
                    placeholder="เช่น น้ำเต้าหู้งาดำคั่วบด"
                    className="w-full h-11 px-3.5 rounded-xl border border-forest/20 bg-white focus:outline-none focus:ring-2 focus:ring-forest text-sm font-thai"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest mb-1">
                    {lang === 'th' ? 'ชื่อภาษาอังกฤษ (English Name)' : 'English Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.name_en}
                    onChange={(e) => setEditingItem({ ...editingItem, name_en: e.target.value })}
                    placeholder="e.g. Roasted Black Sesame Soy Milk"
                    className="w-full h-11 px-3.5 rounded-xl border border-forest/20 bg-white focus:outline-none focus:ring-2 focus:ring-forest text-sm"
                  />
                </div>
              </div>

              {/* Price, Stock, Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest mb-1">
                    {lang === 'th' ? 'ราคา (บาท)' : 'Price (THB)'} *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editingItem.price}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, price: Number(e.target.value) || 0 })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-forest/20 bg-white focus:outline-none focus:ring-2 focus:ring-forest text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest mb-1">
                    {lang === 'th' ? 'สต็อกจำกัดต่อวัน (Stock)' : 'Daily Batch Stock'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingItem.stock_left || 20}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, stock_left: Number(e.target.value) || 0 })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-forest/20 bg-white focus:outline-none focus:ring-2 focus:ring-forest text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest mb-1">
                    {lang === 'th' ? 'หมวดหมู่' : 'Category'}
                  </label>
                  <select
                    value={editingItem.category}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        category: e.target.value as 'drinks' | 'snacks',
                      })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-forest/20 bg-white focus:outline-none focus:ring-2 focus:ring-forest text-sm font-semibold"
                  >
                    <option value="drinks">{lang === 'th' ? 'เครื่องดื่ม (Drinks)' : 'Drinks'}</option>
                    <option value="snacks">{lang === 'th' ? 'ขนม/ของว่าง (Snacks)' : 'Snacks'}</option>
                  </select>
                </div>
              </div>

              {/* Badge & Batch Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest mb-1">
                    {lang === 'th' ? 'ป้ายแท็ก (Badge Tag)' : 'Badge Label (Thai / EN)'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editingItem.badge_th}
                      onChange={(e) => setEditingItem({ ...editingItem, badge_th: e.target.value })}
                      placeholder="เช่น ซิกเนเจอร์ประจำฤดู"
                      className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-xs font-thai"
                    />
                    <input
                      type="text"
                      value={editingItem.badge_en}
                      onChange={(e) => setEditingItem({ ...editingItem, badge_en: e.target.value })}
                      placeholder="e.g. Seasonal Signature"
                      className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest mb-1">
                    {lang === 'th' ? 'รอบเวลาต้มสด (Batch Fresh Time)' : 'Fresh Batch Time Note'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.batch_time}
                    onChange={(e) => setEditingItem({ ...editingItem, batch_time: e.target.value })}
                    placeholder="เช่น ต้มสดใหม่รอบ 06:30 น. หรือ Rotated every morning"
                    className="w-full h-10 px-3 rounded-xl border border-forest/20 bg-white text-xs font-thai"
                  />
                </div>
              </div>

              {/* Rich Text Editor for Thai Description with Upload Image */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest">
                    {lang === 'th'
                      ? 'คำอธิบายสูตรภาษาไทย (Rich Text Editor พร้อมอัปโหลดรูปภาพ)'
                      : 'Thai Description (Rich Text Editor with Image Upload)'}
                  </label>
                  <span className="text-[10px] text-ink-muted">
                    {lang === 'th' ? 'จัดรูปแบบตัวหนา เอียง หัวข้อ และแทรกรูปภาพ' : 'Supports formatting & images'}
                  </span>
                </div>
                <RichTextEditor
                  value={editingItem.description_th}
                  onChange={(val) => setEditingItem({ ...editingItem, description_th: val })}
                  placeholder="เขียนเรื่องราว ความหอม และเอกลักษณ์ของรสชาตินี้..."
                  minHeight="120px"
                />
              </div>

              {/* Rich Text Editor for English Description with Upload Image */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest">
                    {lang === 'th'
                      ? 'คำอธิบายสูตรภาษาอังกฤษ (English Rich Text Description)'
                      : 'English Description (Rich Text Editor with Image Upload)'}
                  </label>
                  <span className="text-[10px] text-ink-muted">
                    {lang === 'th' ? 'แทรกรูปภาพหรือลากวางได้' : 'Drag & drop or paste photos'}
                  </span>
                </div>
                <RichTextEditor
                  value={editingItem.description_en}
                  onChange={(val) => setEditingItem({ ...editingItem, description_en: val })}
                  placeholder="Craft a descriptive tasting note for English speakers..."
                  minHeight="120px"
                />
              </div>

              {/* Available Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-forest/15 bg-white/60">
                <div>
                  <div className="font-bold text-xs text-forest">
                    {lang === 'th' ? 'สถานะเปิดจำหน่าย (Available on Menu)' : 'Active On Storefront'}
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    {lang === 'th'
                      ? 'เมื่อเปิดใช้งาน ลูกค้าจะสามารถสั่งซื้อเมนูพิเศษนี้ได้ทันที'
                      : 'When active, customers can add this special to cart'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditingItem({ ...editingItem, available: !editingItem.available })
                  }
                  className={`h-7 w-12 rounded-full transition-colors relative p-0.5 ${
                    editingItem.available ? 'bg-forest' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                      editingItem.available ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-forest/10">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="h-10 px-5 rounded-full text-xs font-semibold text-ink-muted hover:text-ink hover:bg-forest/10 transition"
                >
                  {t.cancel}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-6 rounded-full bg-forest text-cream font-bold text-xs hover:bg-forest-dark transition active:scale-95 shadow-md flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4 text-honey" />
                  <span>
                    {saving
                      ? lang === 'th'
                        ? 'กำลังบันทึก...'
                        : 'Saving...'
                      : lang === 'th'
                      ? 'บันทึกรสชาติเฉพาะฤดูกาล'
                      : 'Save Seasonal Special'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
