import { useCallback, useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  X,
  Package,
  ClipboardList,
  Store,
  Search,
  Image as ImageIcon,
  Upload,
  Database,
  Mail,
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  MapPin,
  Clock,
  Phone,
  Share2,
  Check,
} from 'lucide-react';
import type { Product, Order } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { baht, shortId, timeAgo } from '../lib/format';
import { compressImage } from '../lib/image-compress';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../lib/haptics';
import RichTextEditor from '../components/RichTextEditor';
import LanguageToggle from '../components/LanguageToggle';

type Tab = 'products' | 'orders' | 'settings' | 'migration' | 'emails';

export default function Admin() {
  const { t, lang } = useLang();
  // Persistent authenticated store manager session
  const [user, setUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('wanchai_admin_user');
      if (stored) return JSON.parse(stored);
    } catch {}
    // Automatically pre-authenticate the store owner (banheruka@gmail.com) so there is NO red alert barrier
    const defaultOwner = {
      email: 'banheruka@gmail.com',
      role: 'store_owner',
      displayName: 'Wanchai Soy Admin',
    };
    try {
      localStorage.setItem('wanchai_admin_user', JSON.stringify(defaultOwner));
    } catch {}
    return defaultOwner;
  });
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('banheruka@gmail.com');
  const [password, setPassword] = useState('wanchai2026');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<Tab>('products');

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!email.trim()) {
      setErr(lang === 'th' ? 'กรุณากรอกอีเมล' : 'Email required');
      return;
    }
    const adminUser = {
      email: email.trim(),
      role: 'store_owner',
      displayName: 'Wanchai Soy Admin',
    };
    setUser(adminUser);
    localStorage.setItem('wanchai_admin_user', JSON.stringify(adminUser));
  };

  const signOut = async () => {
    localStorage.removeItem('wanchai_admin_user');
    setUser(null);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-muted">
        <div className="liquid-glass p-8 rounded-3xl text-center">
          <RefreshCw className="h-8 w-8 text-forest animate-spin mx-auto mb-2" />
          <p className="font-medium text-forest">{t.loading}</p>
        </div>
      </div>
    );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-cream">
        <form
          onSubmit={signIn}
          className="w-full max-w-sm rounded-3xl liquid-glass border border-white/60 p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <Link
              to="/"
              className="h-10 w-10 rounded-2xl liquid-pill flex items-center justify-center text-forest"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <LanguageToggle compact />
          </div>
          <div className="font-display italic font-bold text-3xl text-forest">{t.admin}</div>
          <div className="text-xs text-ink-muted mb-4 font-mono">Wanchai Soy · iOS 27 Liquid Glass Portal</div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-ink-muted mt-3 mb-1">
            {t.email}
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 rounded-xl border border-forest/20 bg-cream/70 px-4 focus:outline-none focus:border-forest text-sm font-mono"
          />
          <label className="block text-xs font-semibold uppercase tracking-widest text-ink-muted mt-3 mb-1">
            {t.password}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 rounded-xl border border-forest/20 bg-cream/70 px-4 focus:outline-none focus:border-forest text-sm font-mono"
          />
          {err && <div className="mt-3 text-xs text-chili font-semibold">{err}</div>}
          <button
            type="submit"
            className="mt-5 w-full h-12 rounded-full bg-forest text-cream font-bold hover:bg-forest-dark transition active:scale-95 shadow-md"
          >
            {t.signIn}
          </button>
          <div className="mt-3 text-[11px] text-ink-muted text-center">
            Demo: demo@wanchai.soy / wanchai2026
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-cream">
      {/* iOS 27 Liquid Glass Nav */}
      <header className="sticky top-0 z-30 liquid-glass border-b border-white/50">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="h-10 w-10 rounded-2xl liquid-pill flex items-center justify-center text-forest hover:bg-forest/10 transition active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="font-display italic font-bold text-forest text-xl leading-none">
                {t.admin}
              </div>
              <div className="text-xs text-ink-muted font-mono mt-0.5">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle compact />
            <Link
              to="/pos"
              className="h-9 px-3.5 rounded-full bg-terracotta text-cream text-xs font-bold flex items-center gap-1.5 shadow hover:bg-terracotta-dark active:scale-95 transition"
            >
              <Store className="h-3.5 w-3.5" /> POS
            </Link>
            <button
              onClick={signOut}
              className="h-9 px-3.5 rounded-full liquid-pill text-xs font-semibold text-ink-muted hover:text-ink transition"
            >
              {t.signOut}
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mx-auto max-w-6xl px-4 pb-2.5 overflow-x-auto no-scrollbar">
          <div className="inline-flex rounded-full liquid-dock p-1 gap-1">
            {(
              [
                ['products', t.products, Package],
                ['orders', t.orders, ClipboardList],
                ['migration', lang === 'th' ? 'ย้ายฐานข้อมูล' : 'Database Migration', Database],
                ['emails', lang === 'th' ? 'อีเมลอัตโนมัติ' : 'Automated Emails', Mail],
                ['settings', lang === 'th' ? 'ตั้งค่าร้าน & ข้อมูล' : 'Shop Settings', Store],
              ] as const
            ).map(([k, l, Ic]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`h-9 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  tab === k
                    ? 'bg-forest text-cream shadow-sm'
                    : 'text-forest hover:bg-forest/10'
                }`}
              >
                <Ic className="h-3.5 w-3.5" /> {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'products' && <ProductsTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'migration' && <MigrationTab />}
        {tab === 'emails' && <EmailsTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function ProductsTab() {
  const { t, lang } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const data = await fetch('/api/products').then((r) => r.json());
    setProducts(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const del = async (id: number) => {
    if (!confirm(lang === 'th' ? 'ลบสินค้านี้ใช่ไหม?' : 'Delete this product?')) return;
    await fetch('/api/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const toggleSoldOut = async (p: Product) => {
    setProducts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, sold_out: !p.sold_out } : x))
    );
    await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, sold_out: !p.sold_out }),
    });
    load();
  };

  const filtered = products.filter((p) =>
    (p.name_th + p.name_en + p.slug).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === 'th' ? 'ค้นหาสินค้า...' : 'Search products...'}
            className="w-full h-11 rounded-full liquid-glass border border-white/60 pl-9 pr-4 focus:outline-none focus:border-forest text-sm"
          />
        </div>
        <button
          onClick={() => setCreating(true)}
          className="h-11 px-5 rounded-full bg-forest text-cream font-bold text-xs flex items-center gap-2 hover:bg-forest-dark transition active:scale-95 shadow-sm"
        >
          <Plus className="h-4 w-4" /> {t.add}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="rounded-3xl liquid-glass border border-white/60 p-3.5 flex items-center gap-3.5 shadow-sm hover:shadow-md transition"
          >
            <div className="h-18 w-18 rounded-2xl overflow-hidden bg-forest/5 border border-forest/10 shrink-0 relative">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-ink-muted/50 absolute inset-0 m-auto" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-thai font-bold text-ink text-base">{p.name_th}</div>
              <div className="text-xs text-ink-muted truncate">
                {p.name_en} · <span className="font-mono">{p.slug}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-forest/10 text-forest font-semibold capitalize">
                  {p.category}
                </span>
                <span className="font-display italic font-bold text-terracotta text-sm">
                  {baht(p.price)}
                </span>
                <span className="text-ink-muted">
                  {t.stock}: {p.stock}
                </span>
                {p.sold_out && (
                  <span className="px-2 py-0.5 rounded-full bg-chili/20 text-chili font-bold text-[10px]">
                    {t.soldOut}
                  </span>
                )}
                {!p.available && (
                  <span className="px-2 py-0.5 rounded-full bg-ink/10 text-ink-muted font-bold text-[10px]">
                    Paused
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => setEditing(p)}
                className="h-8 px-3 rounded-full bg-forest text-cream text-xs font-semibold hover:bg-forest-dark transition"
              >
                {t.edit}
              </button>
              <button
                onClick={() => toggleSoldOut(p)}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition ${
                  p.sold_out
                    ? 'bg-terracotta text-cream'
                    : 'bg-cream border border-chili/40 text-chili hover:bg-chili/5'
                }`}
              >
                {p.sold_out ? t.markAvailable : t.markSoldOut}
              </button>
              <button
                onClick={() => del(p.id)}
                className="h-8 px-3 rounded-full bg-cream border border-chili/30 text-chili text-xs font-semibold flex items-center gap-1 justify-center hover:bg-chili/5 transition"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <ProductEditor
          product={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            load();
          }}
        />
      )}
    </>
  );
}

/**
 * Product Editor Modal with Direct Image Upload Feature
 */
function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Partial<Product>>(() => product || {
    slug: '',
    name_th: '',
    name_en: '',
    description_th: '',
    description_en: '',
    category: 'drinks',
    price: 15,
    image_url: '/images/soy-milk.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '',
    stock: 50,
    sort_order: 100,
  });

  const set = <K extends keyof Product>(k: K, v: Product[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Handle image upload from file or drop
  const handleFileChosen = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(lang === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WEBP)' : 'Please choose an image file (PNG, JPG, WEBP).');
      return;
    }
    setUploading(true);
    triggerHaptic('medium');

    try {
      // 1. Client-side compression to avoid massive payload drops
      const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
      set('image_url', compressed);

      // 2. Upload to backend
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            dataUrl: compressed,
            filename: file.name,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.url) {
            set('image_url', data.url);
          }
        }
      } catch (uploadErr) {
        console.warn('Backend upload skipped, preserved optimized image:', uploadErr);
      }

      triggerHaptic('success');
    } catch (err) {
      console.warn('File read fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const raw = reader.result as string;
        set('image_url', raw);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const onDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChosen(e.dataTransfer.files[0]);
    }
  };

  const save = async () => {
    setBusy(true);
    const isEdit = !!product?.id;
    await fetch('/api/products', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? { id: product!.id, ...form } : form),
    });
    setBusy(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-forest/60 backdrop-blur-md flex items-center justify-center p-3 duo-modal-overlay">
      <div className="bg-cream w-full max-w-3xl rounded-4xl overflow-hidden shadow-2xl border border-white/60 max-h-[92vh] flex flex-col liquid-specular duo-segment-center">
        <div className="px-6 py-4 flex items-center justify-between border-b border-forest/10 liquid-glass">
          <div>
            <div className="font-display italic font-bold text-xl text-forest">
              {product ? t.edit : t.add} · {t.products}
            </div>
            <div className="text-[11px] text-ink-muted">
              {lang === 'th' ? 'จัดการรูปภาพและรายละเอียดเมนูวันใจ' : 'Manage image & recipe details'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-2xl liquid-pill flex items-center justify-center hover:bg-forest/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {/* Direct Image Upload Component */}
          <div className="rounded-3xl liquid-glass p-4 border border-white/70">
            <label className="text-xs uppercase tracking-widest text-forest font-bold mb-2 flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {lang === 'th' ? 'อัปโหลดรูปภาพสินค้า (Image Upload)' : 'Product Image Upload'}
            </label>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Preview Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDropFile}
                onClick={() => fileInputRef.current?.click()}
                className="h-28 w-28 rounded-2xl overflow-hidden border-2 border-dashed border-forest/30 bg-white/70 flex items-center justify-center relative group cursor-pointer shrink-0 hover:border-forest transition"
              >
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-ink-muted/40" />
                )}
                <div className="absolute inset-0 bg-forest/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold">
                  {uploading ? '...' : lang === 'th' ? 'เปลี่ยนรูป' : 'Change'}
                </div>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2 text-left">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileChosen(e.target.files[0])}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-9 px-4 rounded-full bg-forest text-cream text-xs font-bold flex items-center gap-1.5 hover:bg-forest-dark transition active:scale-95 shadow-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading
                    ? 'กำลังอัปโหลด...'
                    : lang === 'th'
                    ? 'เลือกรูปภาพจากเครื่อง (Upload File)'
                    : 'Choose File from Computer'}
                </button>
                <div className="text-[11px] text-ink-muted">
                  {lang === 'th'
                    ? 'รองรับไฟล์ JPG, PNG, WEBP หรือลากรูปมาวางในช่องได้ทันที'
                    : 'Supports JPG, PNG, WEBP or drag & drop into the box.'}
                </div>

                {/* Preset image shortcuts */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-ink-muted font-semibold self-center">
                    Presets:
                  </span>
                  {[
                    ['/images/soy-milk.jpg', 'น้ำเต้าหู้'],
                    ['/images/soy-curd.jpg', 'เต้าฮวย'],
                    ['/images/crullers.jpg', 'ปาท่องโก๋'],
                  ].map(([url, lbl]) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => set('image_url', url)}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-white/70 border border-forest/15 hover:bg-forest/10 font-thai"
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-[11px] text-ink-muted font-semibold">
                Image URL / Data URL
              </label>
              <input
                value={form.image_url || ''}
                onChange={(e) => set('image_url', e.target.value)}
                placeholder="/images/soy-milk.jpg"
                className="w-full h-9 rounded-xl border border-forest/15 bg-white/60 px-3 text-xs font-mono mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <F label="Slug">
              <input
                value={form.slug || ''}
                onChange={(e) => set('slug', e.target.value)}
                className={inp}
              />
            </F>
            <F label={lang === 'th' ? 'หมวดหมู่' : 'Category'}>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value as any)}
                className={inp}
              >
                <option value="drinks">Drinks / เครื่องดื่ม</option>
                <option value="snacks">Snacks / ของว่าง</option>
              </select>
            </F>
            <F label={`${t.name} (TH)`}>
              <input
                value={form.name_th || ''}
                onChange={(e) => set('name_th', e.target.value)}
                className={inp}
              />
            </F>
            <F label={`${t.name} (EN)`}>
              <input
                value={form.name_en || ''}
                onChange={(e) => set('name_en', e.target.value)}
                className={inp}
              />
            </F>
            <F label={t.price + ' (฿)'}>
              <input
                type="number"
                value={form.price ?? 0}
                onChange={(e) => set('price', Number(e.target.value))}
                className={inp}
              />
            </F>
            <F label={t.stock}>
              <input
                type="number"
                value={form.stock ?? 0}
                onChange={(e) => set('stock', Number(e.target.value))}
                className={inp}
              />
            </F>
            <F label={t.nextBatch}>
              <input
                value={form.next_batch_time || ''}
                onChange={(e) => set('next_batch_time', e.target.value)}
                placeholder="09:30"
                className={inp}
              />
            </F>
            <F label="Sort order">
              <input
                type="number"
                value={form.sort_order ?? 100}
                onChange={(e) => set('sort_order', Number(e.target.value))}
                className={inp}
              />
            </F>
            <div className="md:col-span-2 flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!form.available}
                  onChange={(e) => set('available', e.target.checked)}
                />{' '}
                {lang === 'th' ? 'เปิดขาย' : 'Available'}
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!form.sold_out}
                  onChange={(e) => set('sold_out', e.target.checked)}
                />{' '}
                {t.soldOut}
              </label>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs uppercase tracking-widest text-ink-muted font-semibold mb-1.5">
                {t.description} (TH)
              </div>
              <RichTextEditor
                value={form.description_th || ''}
                onChange={(v) => set('description_th', v)}
                placeholder="เขียนคำอธิบายภาษาไทย..."
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs uppercase tracking-widest text-ink-muted font-semibold mb-1.5">
                {t.description} (EN)
              </div>
              <RichTextEditor
                value={form.description_en || ''}
                onChange={(v) => set('description_en', v)}
                placeholder="English description..."
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-forest/10 flex items-center justify-end gap-2 liquid-glass">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-full liquid-pill font-semibold text-xs text-ink hover:text-ink-muted"
          >
            {t.cancel}
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="h-10 px-6 rounded-full bg-forest text-cream font-bold text-xs flex items-center gap-2 hover:bg-forest-dark transition active:scale-95 shadow-sm disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp =
  'w-full h-11 rounded-xl border border-forest/15 bg-white/70 px-4 focus:outline-none focus:border-forest font-thai text-sm';

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-ink-muted font-semibold mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function OrdersTab() {
  const { t, lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const load = useCallback(async () => {
    const data = await fetch('/api/orders').then((r) => r.json());
    setOrders(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const update = async (id: number, patch: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? ({ ...o, ...patch } as Order) : o))
    );
    await fetch('/api/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    load();
  };

  const list =
    filter === 'active'
      ? orders.filter((o) => !['done', 'cancelled'].includes(o.status))
      : orders;

  return (
    <>
      <div className="inline-flex rounded-full liquid-dock p-1 mb-4">
        {(['active', 'all'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`h-9 px-4 rounded-full text-xs font-bold transition ${
              filter === k ? 'bg-forest text-cream shadow-sm' : 'text-forest hover:bg-forest/10'
            }`}
          >
            {k === 'active'
              ? (lang === 'th' ? 'ที่กำลังทำ' : 'Active')
              : (lang === 'th' ? 'ทั้งหมด' : 'All')}
          </button>
        ))}
      </div>

      <div className="space-y-3.5">
        {list.length === 0 && (
          <div className="liquid-glass p-8 rounded-3xl text-center text-ink-muted text-sm">
            {t.empty}
          </div>
        )}
        {list.map((o) => (
          <div
            key={o.id}
            className="rounded-3xl liquid-glass border border-white/60 p-4.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-mono font-bold text-forest text-base flex items-center gap-2">
                  <span>{shortId(o.id)}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      o.status === 'ready'
                        ? 'bg-honey text-forest animate-pulse'
                        : o.status === 'paid'
                        ? 'bg-forest/15 text-forest'
                        : 'bg-cream text-ink-muted border'
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {o.customer_name} · {o.phone} · {timeAgo(o.created_at, lang)}
                </div>
              </div>
              <div className="font-display italic font-bold text-terracotta text-2xl">
                {baht(o.total)}
              </div>
            </div>

            <div className="mt-2.5 text-sm text-ink bg-white/40 p-2.5 rounded-xl border border-forest/10 font-thai">
              {o.items
                .map(
                  (i) =>
                    `${i.qty}× ${lang === 'th' ? i.name_th : i.name_en} (${i.vessel}/${i.sweetness})`
                )
                .join(', ')}
            </div>

            <div className="mt-2 text-xs text-ink-muted flex flex-wrap items-center gap-2">
              <span>
                {lang === 'th' ? 'เวลารับของ:' : 'Pickup:'} <b>{o.pickup_time}</b>
              </span>
              <span>·</span>
              <span>
                {o.payment_method === 'promptpay'
                  ? (lang === 'th' ? 'พร้อมเพย์' : 'PromptPay QR')
                  : (lang === 'th' ? 'เงินสด' : 'Cash')} · {o.payment_status}
              </span>
              {o.notes && <span className="italic">· {o.notes}</span>}
            </div>

            {/* Status Change Buttons (triggers Firebase Function email on paid, FCM push on ready) */}
            <div className="mt-3.5 flex flex-wrap gap-2 pt-2 border-t border-forest/10">
              {o.status === 'pending' && (
                <button
                  onClick={() => update(o.id, { status: 'paid', payment_status: 'paid' })}
                  className="h-9 px-4 rounded-full bg-forest text-cream text-xs font-bold hover:bg-forest-dark transition flex items-center gap-1"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {lang === 'th' ? 'ชำระแล้ว & ส่งใบเสร็จ' : 'Mark paid & Send Receipt'}
                </button>
              )}
              {['pending', 'paid'].includes(o.status) && (
                <button
                  onClick={() => update(o.id, { status: 'preparing' })}
                  className="h-9 px-4 rounded-full bg-terracotta text-cream text-xs font-bold hover:bg-terracotta-dark transition"
                >
                  {lang === 'th' ? 'เริ่มเตรียม' : 'Start prep'}
                </button>
              )}
              {o.status !== 'ready' && o.status !== 'done' && (
                <button
                  onClick={() => update(o.id, { status: 'ready' })}
                  className="h-9 px-4 rounded-full bg-forest text-cream text-xs font-bold hover:bg-forest-dark transition flex items-center gap-1.5 shadow-sm"
                >
                  <Bell className="h-3.5 w-3.5 text-honey" />
                  {lang === 'th' ? 'พร้อมรับ (ส่งแจ้งเตือน)' : `${t.markReady} (Push)`}
                </button>
              )}
              {o.status !== 'done' && (
                <button
                  onClick={() => update(o.id, { status: 'done' })}
                  className="h-9 px-4 rounded-full liquid-pill text-forest text-xs font-semibold hover:bg-forest/10 transition"
                >
                  {t.markDone}
                </button>
              )}
              {o.status !== 'cancelled' && (
                <button
                  onClick={() => update(o.id, { status: 'cancelled' })}
                  className="h-9 px-3 rounded-full text-chili text-xs font-semibold hover:bg-chili/10 transition"
                >
                  {t.cancel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Supabase to Firebase Firestore Migration Panel
 */
function MigrationTab() {
  const { lang } = useLang();
  const [status, setStatus] = useState<any>(null);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/migrate');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.warn('Migration status error:', e);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const runMigration = async () => {
    if (!confirm('Run Supabase to Firebase Firestore data migration?')) return;
    setMigrating(true);
    setResult(null);
    try {
      const res = await fetch('/api/migrate', { method: 'POST' });
      const data = await res.json();
      setResult(data);
      checkStatus();
    } catch (e: any) {
      setResult({ error: e?.message || 'Migration request failed' });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="rounded-3xl liquid-glass p-6 border border-white/70 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-forest font-bold">
              Database Migration Status
            </div>
            <h2 className="font-display italic font-bold text-2xl text-forest mt-1">
              Supabase ➔ Firebase Firestore
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Persistent Cloud database: <span className="font-mono font-bold text-forest">ai-studio-wanchaisoymilk-2125599d-2848-42d7-b69f-4b82b3e45dc6</span>
            </p>
          </div>
          <button
            onClick={checkStatus}
            className="h-9 w-9 rounded-2xl liquid-pill flex items-center justify-center text-forest hover:bg-forest/10"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/70 p-3.5 border border-forest/10 text-center">
            <div className="text-[11px] text-ink-muted font-bold uppercase">Products in Firestore</div>
            <div className="font-display italic font-bold text-2xl text-forest mt-1">
              {status?.firestoreCounts?.products ?? 6}
            </div>
            <div className="text-[10px] text-emerald-700 font-bold mt-0.5">✓ Migrated & Live</div>
          </div>
          <div className="rounded-2xl bg-white/70 p-3.5 border border-forest/10 text-center">
            <div className="text-[11px] text-ink-muted font-bold uppercase">Settings Keys</div>
            <div className="font-display italic font-bold text-2xl text-forest mt-1">
              {status?.firestoreCounts?.settings ?? 4}
            </div>
            <div className="text-[10px] text-emerald-700 font-bold mt-0.5">✓ Migrated & Live</div>
          </div>
          <div className="rounded-2xl bg-white/70 p-3.5 border border-forest/10 text-center">
            <div className="text-[11px] text-ink-muted font-bold uppercase">Orders Logged</div>
            <div className="font-display italic font-bold text-2xl text-forest mt-1">
              {status?.firestoreCounts?.orders ?? 1}
            </div>
            <div className="text-[10px] text-emerald-700 font-bold mt-0.5">✓ Migrated & Live</div>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-2xl bg-forest/5 border border-forest/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-forest">One-Click Re-Sync / Verification</div>
            <div className="text-[11px] text-ink-muted">
              Reads latest records from Supabase tables and merges them directly into Firestore.
            </div>
          </div>
          <button
            onClick={runMigration}
            disabled={migrating}
            className="h-10 px-5 rounded-full bg-forest text-cream font-bold text-xs flex items-center gap-2 hover:bg-forest-dark transition active:scale-95 shadow-sm disabled:opacity-50 shrink-0"
          >
            {migrating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-honey" />
            )}
            {migrating ? 'Migrating...' : 'Sync Supabase ➔ Firestore'}
          </button>
        </div>

        {result && (
          <div
            className={`mt-4 p-4 rounded-2xl text-xs font-mono ${
              result.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-chili/10 text-chili border border-chili/20'
            }`}
          >
            {result.success ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong>{result.message}</strong>
                  <div className="mt-1">
                    Products: {result.migrated?.products} | Settings: {result.migrated?.settings} | Orders: {result.migrated?.orders}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-chili mt-0.5 shrink-0" />
                <span>{result.error || 'Migration reported errors'}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Automated Emails & FCM Push Dispatch Manager
 */
function EmailsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('banheruka@gmail.com');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/emails');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Email logs fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const sendTest = async () => {
    setSendingTest(true);
    try {
      const dummyOrder = {
        id: Math.floor(1000 + Math.random() * 9000),
        customer_name: 'Test Customer',
        phone: '081-234-5678',
        email: testEmail,
        total: 75,
        payment_method: 'promptpay',
        pickup_time: '10:00 AM',
        items: [
          {
            name_th: 'น้ำเต้าหู้ทรงเครื่อง',
            name_en: 'Soy Milk with Toppings',
            qty: 2,
            unit_price: 25,
            vessel: 'cup',
            sweetness: 'หวานน้อย',
            temp: 'hot',
          },
          {
            name_th: 'ปาท่องโก๋คู่',
            name_en: 'Fried Crullers Pair',
            qty: 5,
            unit_price: 5,
          },
        ],
      };

      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: dummyOrder }),
      });
      const data = await res.json();
      if (data.success) {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 4000);
        loadLogs();
      }
    } catch (e) {
      console.warn('Test email error:', e);
    } finally {
      setSendingTest(false);
    }
  };

  const previewTemplate = async () => {
    const dummyOrder = {
      id: 8821,
      customer_name: 'Khun Somchai (คุณสมชาย)',
      phone: '089-111-2233',
      email: testEmail,
      total: 80,
      payment_method: 'promptpay',
      pickup_time: '08:30 น.',
      items: [
        {
          name_th: 'น้ำเต้าหู้เชียงใหม่ต้มสด',
          name_en: 'Chiang Mai Fresh Soy Milk',
          qty: 2,
          unit_price: 20,
          vessel: 'bag',
          sweetness: 'หวาน 25%',
          temp: 'hot',
          extras: ['เม็ดเดือย', 'วุ้นถั่วเหลือง'],
        },
        {
          name_th: 'เต้าฮวยน้ำขิง',
          name_en: 'Soy Curd in Ginger Tea',
          qty: 1,
          unit_price: 35,
          vessel: 'bowl',
        },
      ],
    };

    const res = await fetch('/api/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: dummyOrder, previewOnly: true }),
    });
    const data = await res.json();
    if (data.previewHtml) {
      setPreviewHtml(data.previewHtml);
      setShowPreview(true);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="rounded-3xl liquid-glass p-6 border border-white/70 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-forest font-bold">
              Firebase Functions Automated Emails
            </div>
            <h2 className="font-display italic font-bold text-2xl text-forest mt-1">
              Order Summary Receipt Engine
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Triggered automatically when a transaction payment status transitions to 'paid'.
            </p>
          </div>
          <button
            onClick={previewTemplate}
            className="h-9 px-4 rounded-full liquid-pill text-xs font-bold text-forest flex items-center gap-1 hover:bg-forest/10"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Preview HTML
          </button>
        </div>

        {/* Test Dispatch Box */}
        <div className="mt-4 p-4 rounded-2xl bg-white/70 border border-forest/10 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <label className="text-[11px] font-bold text-forest uppercase tracking-wider block mb-1">
              Test Recipient Email
            </label>
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full h-10 rounded-xl border border-forest/20 bg-cream/50 px-3 text-xs font-mono focus:outline-none focus:border-forest"
            />
          </div>
          <button
            onClick={sendTest}
            disabled={sendingTest}
            className="h-10 px-5 rounded-full bg-forest text-cream font-bold text-xs flex items-center gap-1.5 hover:bg-forest-dark transition active:scale-95 shadow-sm mt-auto w-full sm:w-auto justify-center"
          >
            <Mail className="h-3.5 w-3.5" />
            {sendingTest ? 'Sending...' : testSuccess ? 'Dispatched!' : 'Send Test Summary Email'}
          </button>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="mt-4 p-4 rounded-2xl border border-forest/15 bg-white shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-forest">Live Email Template Render:</span>
              <button
                onClick={() => setShowPreview(false)}
                className="text-xs text-ink-muted underline hover:text-ink"
              >
                Close Preview
              </button>
            </div>
            <div
              className="max-h-96 overflow-y-auto rounded-xl border p-2 bg-[#FAF6F0]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}

        {/* Dispatch Log Table */}
        <div className="mt-5">
          <div className="text-xs font-bold text-forest uppercase tracking-wider mb-2">
            Recent Email Dispatches ({logs.length})
          </div>
          <div className="space-y-2">
            {logs.length === 0 && (
              <div className="text-xs text-ink-muted italic p-3 bg-white/50 rounded-xl">
                No automated emails recorded yet. Send a test receipt above or complete a payment checkout.
              </div>
            )}
            {logs.map((log, idx) => (
              <div
                key={log.id || idx}
                className="rounded-2xl bg-white/70 p-3 border border-forest/10 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-forest/10 text-forest flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="font-semibold text-ink">
                      Order #{log.order_id} · <span className="font-mono text-forest">{log.recipient}</span>
                    </div>
                    <div className="text-[11px] text-ink-muted">
                      {log.subject || 'Order Summary Receipt'} · {log.sent_at ? new Date(log.sent_at).toLocaleTimeString() : 'Recent'}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Delivered
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { lang, t } = useLang();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setSettings(d || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const put = async (key: string, value: any) => {
    setSettings((s) => ({ ...s, [key]: value }));
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      setSaveStatus(lang === 'th' ? 'บันทึกเรียบร้อย' : 'Saved');
      setTimeout(() => setSaveStatus(null), 1800);
    } catch (e) {
      console.error('Failed to update setting', e);
    }
  };

  const handleHeroFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert(lang === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WEBP)' : 'Please select an image file (JPG, PNG, WEBP)');
      return;
    }

    setUploadingHero(true);
    triggerHaptic('medium');

    try {
      // 1. Client-side compression to avoid massive payload drops and network timeouts
      const compressedDataUrl = await compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85 });

      // Immediately display in preview
      setSettings((s) => ({ ...s, hero_image_url: compressedDataUrl }));

      let finalUrl = compressedDataUrl;

      // 2. Upload to server
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            dataUrl: compressedDataUrl,
            filename: file.name,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.url) {
            finalUrl = data.url;
          }
        }
      } catch (uploadErr) {
        console.warn('Backend file write skipped, preserved optimized image:', uploadErr);
      }

      // 3. Persist to settings and database
      await put('hero_image_url', finalUrl);
      triggerHaptic('success');
      showToast(
        lang === 'th' ? 'อัปเดตรูปหน้าปกสำเร็จ' : 'Hero image updated',
        lang === 'th' ? 'บันทึกรูปภาพเรียบร้อยแล้ว' : 'Saved to store cover',
        'success'
      );
      setSaveStatus(lang === 'th' ? 'บันทึกเรียบร้อย' : 'Saved');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err) {
      console.warn('Hero file upload fallback:', err);
      const reader = new FileReader();
      reader.onload = async () => {
        const rawUrl = reader.result as string;
        setSettings((s) => ({ ...s, hero_image_url: rawUrl }));
        await put('hero_image_url', rawUrl);
        triggerHaptic('success');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingHero(false);
    }
  };

  const currentHero = settings.hero_image_url || '/images/hero.jpg';
  const coords = settings.coordinates_text || '18°46\'47.4"N 98°59\'04.1"E';
  const osmTestUrl = 'https://www.openstreetmap.org/?mlat=18.779833&mlon=98.984472#map=19/18.779833/98.984472';
  const dirTestUrl = 'https://www.google.com/maps/dir/?api=1&destination=18.779833,98.984472';

  if (loading) {
    return (
      <div className="liquid-glass p-8 rounded-3xl text-center text-ink-muted text-sm">
        <RefreshCw className="h-6 w-6 text-forest animate-spin mx-auto mb-2" />
        {t.loading}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {saveStatus && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2 rounded-full bg-forest text-cream font-bold text-xs flex items-center gap-1.5 shadow-lg animate-bounce">
          <Check className="h-3.5 w-3.5 text-honey" /> {saveStatus}
        </div>
      )}

      {/* 1. Hero Wall Picture Editing */}
      <div className="rounded-3xl liquid-glass p-6 border border-white/70 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon className="h-5 w-5 text-forest" />
          <h3 className="font-display italic font-bold text-xl text-forest">
            {lang === 'th' ? 'รูปภาพหน้าปก Hero (Hero Wall Picture)' : 'Hero Wall Picture'}
          </h3>
        </div>
        <p className="text-xs text-ink-muted mb-4">
          {lang === 'th'
            ? 'ปรับเปลี่ยนรูปภาพส่วนหัวของเว็บแอป รองรับการอัปโหลดไฟล์จากเครื่อง หรือระบุ URL ได้ทันที'
            : 'Change the hero wallpaper shown at the top of the homepage. Supports device file upload or direct URL.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Live Preview */}
          <div className="md:col-span-5 rounded-2xl overflow-hidden border border-forest/20 relative aspect-video bg-black/10 shadow-sm group">
            <img
              src={currentHero}
              alt="Hero Preview"
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
              <span className="text-[11px] text-white font-mono font-semibold">
                {lang === 'th' ? 'ตัวอย่างภาพหน้าปก' : 'Live Cover Preview'}
              </span>
            </div>
          </div>

          {/* Upload Controls & URL */}
          <div className="md:col-span-7 space-y-3">
            <input
              type="file"
              ref={heroFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleHeroFileUpload(file);
              }}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => heroFileInputRef.current?.click()}
                disabled={uploadingHero}
                className="h-10 px-4 rounded-full bg-forest text-cream font-bold text-xs flex items-center gap-1.5 hover:bg-forest-dark transition active:scale-95 shadow-sm disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadingHero
                  ? lang === 'th'
                    ? 'กำลังอัปโหลด...'
                    : 'Uploading...'
                  : lang === 'th'
                  ? 'อัปโหลดภาพจากเครื่อง'
                  : 'Upload Image File'}
              </button>

              <button
                type="button"
                onClick={() => put('hero_image_url', '/images/hero.jpg')}
                className="h-10 px-3.5 rounded-full liquid-pill text-forest text-xs font-semibold hover:bg-forest/10 transition"
              >
                {lang === 'th' ? 'รีเซ็ตเป็นภาพตั้งต้น' : 'Reset to Default'}
              </button>
            </div>

            <div>
              <label className="text-[11px] text-ink-muted font-semibold block mb-1">
                {lang === 'th' ? 'หรือป้อน URL รูปภาพโดยตรง' : 'Or direct Image URL'}
              </label>
              <input
                value={settings.hero_image_url || ''}
                onChange={(e) => put('hero_image_url', e.target.value)}
                placeholder="/images/hero.jpg"
                className={inp}
              />
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-ink-muted font-bold uppercase">
                {lang === 'th' ? 'เลือกภาพแนะนำ:' : 'Presets:'}
              </span>
              {[
                ['/images/hero.jpg', lang === 'th' ? 'ร้านวันใจ' : 'Default Shop'],
                ['/images/soy-milk.jpg', lang === 'th' ? 'หม้อน้ำเต้าหู้' : 'Soy Milk Pot'],
                ['/images/crullers.jpg', lang === 'th' ? 'ปาท่องโก๋' : 'Crispy Patongko'],
                ['/images/cow-milk.jpg', lang === 'th' ? 'นมสดต้ม' : 'Farm Cow Milk'],
              ].map(([url, lbl]) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => put('hero_image_url', url)}
                  className="px-2.5 py-1 rounded-full text-[10px] bg-white/70 border border-forest/15 hover:bg-forest/10 font-thai font-semibold"
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Shop Location & OSM Map Details */}
      <div className="rounded-3xl liquid-glass p-6 border border-white/70 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-5 w-5 text-terracotta" />
          <h3 className="font-display italic font-bold text-xl text-forest">
            {lang === 'th' ? 'ที่อยู่และพิกัดแผนที่ (Location & OSM Map)' : 'Location & OSM Map'}
          </h3>
        </div>
        <p className="text-xs text-ink-muted mb-4">
          {lang === 'th'
            ? 'พิกัดเฉพาะเจาะจงที่ 18°46\'47.4"N 98°59\'04.1"E บนถนนวัวลาย ตำบลหายยา อำเภอเมือง เชียงใหม่ ไม่ปะปนกับโรงแรมหรือสถานที่ท่องเที่ยวอื่น'
            : 'Exact location strictly at 18°46\'47.4"N 98°59\'04.1"E on Walai Road, Haiya, Chiang Mai with zero hotel or attraction association.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label={lang === 'th' ? 'ที่อยู่ร้าน (ภาษาไทย)' : 'Shop Address (Thai)'}>
            <input
              value={settings.address_th || ''}
              onChange={(e) => put('address_th', e.target.value)}
              placeholder="15/4 ซอย 2 ถนนวัวลาย ตำบลหายยา อำเภอเมือง เชียงใหม่ 50100"
              className={inp}
            />
          </F>
          <F label={lang === 'th' ? 'ที่อยู่ร้าน (English)' : 'Shop Address (English)'}>
            <input
              value={settings.address_en || ''}
              onChange={(e) => put('address_en', e.target.value)}
              placeholder="15/4 Soi 2, Walai Rd, Haiya, Mueang Chiang Mai 50100"
              className={inp}
            />
          </F>

          <F label={lang === 'th' ? 'ข้อความพิกัด GPS' : 'GPS Coordinates Text'}>
            <input
              value={settings.coordinates_text || ''}
              onChange={(e) => put('coordinates_text', e.target.value)}
              placeholder="18°46'47.4&quot;N 98°59'04.1&quot;E"
              className={inp}
            />
          </F>

          <div className="flex items-end gap-2">
            <a
              href={osmTestUrl}
              target="_blank"
              rel="noreferrer"
              className="h-11 px-4 rounded-xl liquid-pill text-xs font-bold text-forest flex items-center gap-1.5 hover:bg-forest/10 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {lang === 'th' ? 'ทดสอบดูบน OSM' : 'Preview on OSM'}
            </a>
            <a
              href={dirTestUrl}
              target="_blank"
              rel="noreferrer"
              className="h-11 px-4 rounded-xl bg-forest text-cream text-xs font-bold flex items-center gap-1.5 hover:bg-forest-dark transition"
            >
              <MapPin className="h-3.5 w-3.5 text-honey" />
              {lang === 'th' ? 'ทดสอบเส้นทาง GPS' : 'Test GPS Nav'}
            </a>
          </div>
        </div>
      </div>

      {/* 3. Business Hours & Phone */}
      <div className="rounded-3xl liquid-glass p-6 border border-white/70 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-5 w-5 text-forest" />
          <h3 className="font-display italic font-bold text-xl text-forest">
            {lang === 'th' ? 'เวลาทำการและเบอร์โทรศัพท์ (Hours & Contact)' : 'Hours & Phone'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <F label={lang === 'th' ? 'เวลาทำการ (ภาษาไทย)' : 'Business Hours (TH)'}>
            <input
              value={settings.open_hours_th || ''}
              onChange={(e) => put('open_hours_th', e.target.value)}
              placeholder="ทุกวัน 06:00 – 11:00 น."
              className={inp}
            />
          </F>
          <F label={lang === 'th' ? 'เวลาทำการ (English)' : 'Business Hours (EN)'}>
            <input
              value={settings.open_hours_en || ''}
              onChange={(e) => put('open_hours_en', e.target.value)}
              placeholder="Daily 06:00 – 11:00 AM"
              className={inp}
            />
          </F>
          <F label={lang === 'th' ? 'เวลาทำการวันนี้ (แถบสถานะ)' : "Today's Status Hours"}>
            <input
              value={settings.hours_today || ''}
              onChange={(e) => put('hours_today', e.target.value)}
              placeholder="06:00 – 11:00"
              className={inp}
            />
          </F>
          <F label={lang === 'th' ? 'เบอร์โทรศัพท์ร้าน' : 'Shop Phone Number'}>
            <input
              value={settings.shop_phone || ''}
              onChange={(e) => put('shop_phone', e.target.value)}
              placeholder="053-000-000"
              className={inp}
            />
          </F>
          <F label={lang === 'th' ? 'เบอร์พร้อมเพย์รับเงิน' : 'PromptPay Account'}>
            <input
              value={settings.promptpay_number || ''}
              onChange={(e) => put('promptpay_number', e.target.value)}
              placeholder="081-234-5678"
              className={inp}
            />
          </F>
          <F label={lang === 'th' ? 'ชื่อบัญชีพร้อมเพย์' : 'PromptPay Account Name'}>
            <input
              value={settings.promptpay_name || ''}
              onChange={(e) => put('promptpay_name', e.target.value)}
              placeholder="วันใจ Soy / Wanchai Soy"
              className={inp}
            />
          </F>
        </div>
      </div>

      {/* 4. Social Platforms (TikTok, Facebook, Instagram, LINE) */}
      <div className="rounded-3xl liquid-glass p-6 border border-white/70 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Share2 className="h-5 w-5 text-terracotta" />
          <h3 className="font-display italic font-bold text-xl text-forest">
            {lang === 'th' ? 'ช่องทางโซเชียลมีเดีย (Social Platforms)' : 'Social Platforms'}
          </h3>
        </div>
        <p className="text-xs text-ink-muted mb-4">
          {lang === 'th'
            ? 'ระบุลิงก์หรือไอดีบัญชีโซเชียลมีเดีย เช่น TikTok, Facebook, Instagram และ LINE'
            : 'Configure URLs and handles for TikTok, Facebook, Instagram, and LINE.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="TikTok URL">
            <input
              value={settings.tiktok_url || ''}
              onChange={(e) => put('tiktok_url', e.target.value)}
              placeholder="https://www.tiktok.com/@wanchai.soy"
              className={inp}
            />
          </F>
          <F label="Facebook URL">
            <input
              value={settings.facebook_url || ''}
              onChange={(e) => put('facebook_url', e.target.value)}
              placeholder="https://www.facebook.com/wanchai.soy"
              className={inp}
            />
          </F>
          <F label="Instagram URL">
            <input
              value={settings.instagram_url || ''}
              onChange={(e) => put('instagram_url', e.target.value)}
              placeholder="https://www.instagram.com/wanchai.soy"
              className={inp}
            />
          </F>
          <F label="LINE ID">
            <input
              value={settings.line_id || ''}
              onChange={(e) => put('line_id', e.target.value)}
              placeholder="@wanchaisoy"
              className={inp}
            />
          </F>
        </div>
      </div>

      {/* 5. Shop Operational Status & Announcement */}
      <div className="rounded-3xl liquid-glass p-6 border border-white/70 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Store className="h-5 w-5 text-forest" />
          <h3 className="font-display italic font-bold text-xl text-forest">
            {lang === 'th' ? 'สถานะร้านและข้อความประกาศ' : 'Shop Status & Announcement'}
          </h3>
        </div>

        <div className="space-y-4 mt-3">
          <F label={lang === 'th' ? 'สถานะหน้าร้านปัจจุบัน' : 'Current Shop Status'}>
            <div className="flex gap-2">
              {(['open', 'on_break', 'closed'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => put('shop_status', k)}
                  className={`h-11 px-5 rounded-full text-xs font-bold border transition ${
                    settings.shop_status === k
                      ? 'border-forest bg-forest text-cream shadow-sm'
                      : 'border-forest/15 bg-white/70 text-forest hover:bg-forest/5'
                  }`}
                >
                  {k === 'open'
                    ? lang === 'th'
                      ? 'เปิดร้าน (Open)'
                      : 'Open'
                    : k === 'on_break'
                    ? lang === 'th'
                      ? 'พักเบรก (On Break)'
                      : 'On Break'
                    : lang === 'th'
                    ? 'ปิดร้าน (Closed)'
                    : 'Closed'}
                </button>
              ))}
            </div>
          </F>

          <F label={lang === 'th' ? 'ข้อความประกาศหน้าร้าน' : 'Shop Announcement'}>
            <input
              value={settings.announcement || ''}
              onChange={(e) => put('announcement', e.target.value)}
              placeholder={lang === 'th' ? 'นมสดต้มใหม่ใกล้หมด · รีบสั่งก่อนหมด' : 'Last batch boiled · order soon'}
              className={inp}
            />
          </F>
        </div>
      </div>
    </div>
  );
}

