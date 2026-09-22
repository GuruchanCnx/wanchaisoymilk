import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, X, Package, ClipboardList, Store, Search, Image as ImageIcon } from 'lucide-react';
import type { Product, Order } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { baht, shortId, timeAgo } from '../lib/format';
import supabase from '../lib/supabase';
import RichTextEditor from '../components/RichTextEditor';
import LanguageToggle from '../components/LanguageToggle';

type Tab = 'products' | 'orders' | 'settings';

export default function Admin() {
  const { t, lang } = useLang();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('demo@wanchai.soy');
  const [password, setPassword] = useState('wanchai2026');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<Tab>('products');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user || null); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-muted">{t.loading}</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <form onSubmit={signIn} className="w-full max-w-sm rounded-3xl bg-cream-soft border-2 border-forest/15 p-6">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="h-10 w-10 rounded-full bg-cream border border-forest/15 flex items-center justify-center"><ArrowLeft className="h-4 w-4 text-forest" /></Link>
            <LanguageToggle compact />
          </div>
          <div className="font-display italic font-bold text-3xl text-forest">{t.admin}</div>
          <div className="text-sm text-ink-muted mb-4">Wanchai Soy · back office</div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-ink-muted mt-3 mb-1">{t.email}</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-12 rounded-xl border-2 border-forest/15 bg-cream px-4 focus:outline-none focus:border-forest" />
          <label className="block text-xs font-semibold uppercase tracking-widest text-ink-muted mt-3 mb-1">{t.password}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 rounded-xl border-2 border-forest/15 bg-cream px-4 focus:outline-none focus:border-forest" />
          {err && <div className="mt-3 text-sm text-chili">{err}</div>}
          <button type="submit" className="mt-5 w-full h-12 rounded-full bg-forest text-cream font-bold">{t.signIn}</button>
          <div className="mt-3 text-xs text-ink-muted text-center">Demo: demo@wanchai.soy / wanchai2026</div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b-2 border-forest/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Link to="/" className="h-10 w-10 rounded-full bg-cream-soft border border-forest/15 flex items-center justify-center"><ArrowLeft className="h-4 w-4 text-forest" /></Link>
          <div className="flex-1">
            <div className="font-display italic font-bold text-forest text-xl leading-none">{t.admin}</div>
            <div className="text-xs text-ink-muted">{user.email}</div>
          </div>
          <LanguageToggle compact />
          <Link to="/pos" className="h-10 px-4 rounded-full bg-terracotta text-cream text-sm font-semibold flex items-center gap-2"><Store className="h-4 w-4" /> POS</Link>
          <button onClick={signOut} className="h-10 px-4 rounded-full bg-cream-soft border border-forest/15 text-sm font-semibold">{t.signOut}</button>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <div className="inline-flex rounded-full bg-cream-soft border-2 border-forest/15 p-1">
            {([['products', t.products, Package], ['orders', t.orders, ClipboardList], ['settings', lang === 'th' ? 'ตั้งค่าร้าน' : 'Settings', Store]] as const).map(([k, l, Ic]) => (
              <button key={k} onClick={() => setTab(k)} className={`h-9 px-4 rounded-full text-sm font-semibold flex items-center gap-2 ${tab === k ? 'bg-forest text-cream' : 'text-forest'}`}>
                <Ic className="h-4 w-4" /> {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'products' && <ProductsTab />}
        {tab === 'orders' && <OrdersTab />}
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

  useEffect(() => { load(); }, [load]);

  const del = async (id: number) => {
    if (!confirm(lang === 'th' ? 'ลบสินค้านี้ใช่ไหม?' : 'Delete this product?')) return;
    await fetch('/api/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  };

  const toggleSoldOut = async (p: Product) => {
    // Optimistic
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, sold_out: !p.sold_out } : x));
    await fetch('/api/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, sold_out: !p.sold_out }) });
    load();
  };

  const filtered = products.filter((p) => (p.name_th + p.name_en + p.slug).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === 'th' ? 'ค้นหาสินค้า' : 'Search products'} className="w-full h-11 rounded-full border-2 border-forest/15 bg-cream-soft pl-9 pr-4 focus:outline-none focus:border-forest" />
        </div>
        <button onClick={() => setCreating(true)} className="h-11 px-5 rounded-full bg-forest text-cream font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> {t.add}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-2xl bg-cream-soft border-2 border-forest/10 p-3 flex items-center gap-3">
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-beige shrink-0">
              {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="h-6 w-6 text-ink-muted m-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-thai font-semibold text-ink">{p.name_th}</div>
              <div className="text-xs text-ink-muted truncate">{p.name_en} · {p.slug}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-forest/10 text-forest capitalize">{p.category}</span>
                <span className="font-display italic font-bold text-terracotta">{baht(p.price)}</span>
                <span className="text-ink-muted">{t.stock}: {p.stock}</span>
                {p.sold_out && <span className="px-2 py-0.5 rounded-full bg-chili/20 text-chili font-semibold">{t.soldOut}</span>}
                {!p.available && <span className="px-2 py-0.5 rounded-full bg-ink/10 text-ink-muted font-semibold">Paused</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setEditing(p)} className="h-8 px-3 rounded-full bg-forest text-cream text-xs font-semibold">{t.edit}</button>
              <button onClick={() => toggleSoldOut(p)} className={`h-8 px-3 rounded-full text-xs font-semibold ${p.sold_out ? 'bg-terracotta text-cream' : 'bg-cream border border-chili/40 text-chili'}`}>{p.sold_out ? t.markAvailable : t.markSoldOut}</button>
              <button onClick={() => del(p.id)} className="h-8 px-3 rounded-full bg-cream border border-chili/30 text-chili text-xs font-semibold flex items-center gap-1 justify-center"><Trash2 className="h-3 w-3" /> {t.delete}</button>
            </div>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <ProductEditor
          product={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </>
  );
}

function ProductEditor({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const { t, lang } = useLang();
  const [form, setForm] = useState<Partial<Product>>(() => product || {
    slug: '', name_th: '', name_en: '', description_th: '', description_en: '',
    category: 'drinks', price: 15, image_url: '', available: true, sold_out: false, next_batch_time: '', stock: 50, sort_order: 100,
  });
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);

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
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-cream w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border-4 border-forest max-h-[92vh] flex flex-col">
        <div className="px-5 py-3 flex items-center justify-between border-b-2 border-forest/10">
          <div className="font-display italic font-bold text-xl text-forest">{product ? t.edit : t.add} · {t.products}</div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-cream-soft border border-forest/15 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="Slug"><input value={form.slug || ''} onChange={(e) => set('slug', e.target.value)} className={inp} /></F>
          <F label={lang === 'th' ? 'หมวดหมู่' : 'Category'}>
            <select value={form.category} onChange={(e) => set('category', e.target.value as any)} className={inp}>
              <option value="drinks">Drinks / เครื่องดื่ม</option>
              <option value="snacks">Snacks / ของว่าง</option>
            </select>
          </F>
          <F label={`${t.name} (TH)`}><input value={form.name_th || ''} onChange={(e) => set('name_th', e.target.value)} className={inp} /></F>
          <F label={`${t.name} (EN)`}><input value={form.name_en || ''} onChange={(e) => set('name_en', e.target.value)} className={inp} /></F>
          <F label={t.price + ' (฿)'}><input type="number" value={form.price ?? 0} onChange={(e) => set('price', Number(e.target.value))} className={inp} /></F>
          <F label={t.stock}><input type="number" value={form.stock ?? 0} onChange={(e) => set('stock', Number(e.target.value))} className={inp} /></F>
          <F label="Image URL">
            <input value={form.image_url || ''} onChange={(e) => set('image_url', e.target.value)} placeholder="/images/soy-milk.jpg" className={inp} />
          </F>
          <F label={t.nextBatch}><input value={form.next_batch_time || ''} onChange={(e) => set('next_batch_time', e.target.value)} placeholder="09:30" className={inp} /></F>
          <F label="Sort order"><input type="number" value={form.sort_order ?? 100} onChange={(e) => set('sort_order', Number(e.target.value))} className={inp} /></F>
          <div className="md:col-span-2 flex items-center gap-4">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!form.available} onChange={(e) => set('available', e.target.checked)} /> {lang === 'th' ? 'เปิดขาย' : 'Available'}</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!form.sold_out} onChange={(e) => set('sold_out', e.target.checked)} /> {t.soldOut}</label>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs uppercase tracking-widest text-ink-muted font-semibold mb-1.5">{t.description} (TH)</div>
            <RichTextEditor value={form.description_th || ''} onChange={(v) => set('description_th', v)} placeholder="เขียนคำอธิบายภาษาไทย..." />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs uppercase tracking-widest text-ink-muted font-semibold mb-1.5">{t.description} (EN)</div>
            <RichTextEditor value={form.description_en || ''} onChange={(v) => set('description_en', v)} placeholder="English description..." />
          </div>
        </div>
        <div className="px-5 py-3 border-t-2 border-forest/10 flex items-center justify-end gap-2 bg-cream-soft">
          <button onClick={onClose} className="h-11 px-5 rounded-full bg-cream border-2 border-forest/15 font-semibold">{t.cancel}</button>
          <button onClick={save} disabled={busy} className="h-11 px-5 rounded-full bg-forest text-cream font-semibold flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> {t.save}</button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full h-11 rounded-xl border-2 border-forest/15 bg-cream-soft px-4 focus:outline-none focus:border-forest font-thai';

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-ink-muted font-semibold mb-1.5">{label}</div>
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
  useEffect(() => { load(); const iv = setInterval(load, 6000); return () => clearInterval(iv); }, [load]);

  const update = async (id: number, patch: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...patch } as Order : o));
    await fetch('/api/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) });
    load();
  };

  const list = filter === 'active' ? orders.filter((o) => !['done', 'cancelled'].includes(o.status)) : orders;

  return (
    <>
      <div className="inline-flex rounded-full bg-cream-soft border-2 border-forest/15 p-1 mb-3">
        {(['active', 'all'] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`h-9 px-4 rounded-full text-sm font-semibold ${filter === k ? 'bg-forest text-cream' : 'text-forest'}`}>{k === 'active' ? (lang === 'th' ? 'ที่กำลังทำ' : 'Active') : (lang === 'th' ? 'ทั้งหมด' : 'All')}</button>
        ))}
      </div>
      <div className="space-y-3">
        {list.length === 0 && <div className="text-ink-muted text-sm">{t.empty}</div>}
        {list.map((o) => (
          <div key={o.id} className="rounded-2xl bg-cream-soft border-2 border-forest/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-mono font-bold text-forest">{shortId(o.id)}</div>
                <div className="text-xs text-ink-muted">{o.customer_name} · {o.phone} · {timeAgo(o.created_at, lang)}</div>
              </div>
              <div className="font-display italic font-bold text-terracotta text-2xl">{baht(o.total)}</div>
            </div>
            <div className="mt-2 text-sm text-ink">{o.items.map((i) => `${i.qty}× ${lang === 'th' ? i.name_th : i.name_en} (${i.vessel}/${i.sweetness})`).join(', ')}</div>
            <div className="mt-2 text-xs text-ink-muted flex flex-wrap items-center gap-2">
              <span>Pickup: <b>{o.pickup_time}</b></span>
              <span>·</span>
              <span>{o.payment_method === 'promptpay' ? 'QR' : 'Cash'} · {o.payment_status}</span>
              {o.notes && <span className="italic">· {o.notes}</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {o.status === 'pending' && <button onClick={() => update(o.id, { status: 'paid', payment_status: 'paid' })} className="h-9 px-4 rounded-full bg-forest text-cream text-sm font-semibold">Mark paid</button>}
              {['pending', 'paid'].includes(o.status) && <button onClick={() => update(o.id, { status: 'preparing' })} className="h-9 px-4 rounded-full bg-terracotta text-cream text-sm font-semibold">Start prep</button>}
              {o.status !== 'ready' && o.status !== 'done' && <button onClick={() => update(o.id, { status: 'ready' })} className="h-9 px-4 rounded-full bg-forest text-cream text-sm font-semibold">{t.markReady}</button>}
              {o.status !== 'done' && <button onClick={() => update(o.id, { status: 'done' })} className="h-9 px-4 rounded-full bg-cream border-2 border-forest/15 text-forest text-sm font-semibold">{t.markDone}</button>}
              {o.status !== 'cancelled' && <button onClick={() => update(o.id, { status: 'cancelled' })} className="h-9 px-4 rounded-full bg-cream border-2 border-chili/30 text-chili text-sm font-semibold">{t.cancel}</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SettingsTab() {
  const { lang } = useLang();
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => setSettings(d || {}));
  }, []);

  const put = async (key: string, value: any) => {
    setSettings((s) => ({ ...s, [key]: value }));
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
  };

  return (
    <div className="grid gap-4 max-w-2xl">
      <F label={lang === 'th' ? 'สถานะร้าน' : 'Shop status'}>
        <div className="flex gap-2">
          {(['open', 'on_break', 'closed'] as const).map((k) => (
            <button key={k} onClick={() => put('shop_status', k)} className={`h-11 px-4 rounded-full text-sm font-semibold border-2 ${settings.shop_status === k ? 'border-forest bg-forest text-cream' : 'border-forest/15 bg-cream-soft'}`}>{k}</button>
          ))}
        </div>
      </F>
      <F label={lang === 'th' ? 'เวลาทำการวันนี้' : "Today's hours"}>
        <input value={settings.hours_today || ''} onChange={(e) => put('hours_today', e.target.value)} placeholder="06:00 – 11:00" className={inp} />
      </F>
      <F label="PromptPay number">
        <input value={settings.promptpay_number || ''} onChange={(e) => put('promptpay_number', e.target.value)} placeholder="053-000-000" className={inp} />
      </F>
      <F label={lang === 'th' ? 'ข้อความประกาศหน้าร้าน' : 'Shop announcement'}>
        <input value={settings.announcement || ''} onChange={(e) => put('announcement', e.target.value)} placeholder="นมหมดเร็ว · last batch soon" className={inp} />
      </F>
    </div>
  );
}
