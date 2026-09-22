import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let db = null;
let firestoreInitialized = false;

// Load config
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const app = !getApps().length ? initializeApp(config) : getApp();
    db = getFirestore(app, config.firestoreDatabaseId || '(default)');
    firestoreInitialized = true;
    console.log('[Firestore] Connected to Firebase project:', config.projectId, 'database:', config.firestoreDatabaseId || '(default)');
  }
} catch (err) {
  console.warn('[Firestore] Initialization warning:', err.message);
}

// Initial mock products for seed & fallback
export const INITIAL_PRODUCTS = [
  {
    id: 1,
    slug: 'soy-milk',
    name_th: 'น้ำเต้าหู้',
    name_en: 'Fresh Soy Milk',
    description_th: '<p>สูตรดั้งเดิมของวันใจ ต้มสดทุกเช้า หอมถั่วเหลืองแท้ ไม่ผสมแป้ง เลือกความหวานและภาชนะได้</p>',
    description_en: '<p>Our signature recipe boiled fresh every morning from 100% non-GMO soybeans. Rich, creamy, naturally sweet.</p>',
    category: 'drinks',
    price: 15,
    image_url: '/images/soy-milk.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '',
    stock: 40,
    sort_order: 1,
  },
  {
    id: 2,
    slug: 'cow-milk',
    name_th: 'นมวัวสดแท้',
    name_en: 'Fresh Cow Milk',
    description_th: '<p>นมโคสดแท้ 100% จากฟาร์มเชียงใหม่ ตุ๋นไฟอ่อนหอมมัน เข้มข้น นุ่มคอ ดื่มร้อนหรือเย็นก็ชื่นใจ</p>',
    description_en: '<p>100% pure whole milk from local Chiang Mai dairy farms, gently simmered for a rich aroma.</p>',
    category: 'drinks',
    price: 25,
    image_url: '/images/cow-milk.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '',
    stock: 3, // Low stock for demonstration
    sort_order: 2,
  },
  {
    id: 3,
    slug: 'black-sesame',
    name_th: 'น้ำเต้าหู้งาดำ',
    name_en: 'Black Sesame Soy Milk',
    description_th: '<p>งาดำคั่วหอมบดละเอียด ผสมน้ำเต้าหู้สดเข้มข้น อุดมด้วยแคลเซียมและสารต้านอนุมูลอิสระ</p>',
    description_en: '<p>Slow-roasted aromatic black sesame ground fine and blended into fresh soy milk. Rich in calcium.</p>',
    category: 'drinks',
    price: 25,
    image_url: '/images/black-sesame.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '',
    stock: 18,
    sort_order: 3,
  },
  {
    id: 4,
    slug: 'ginger-tea',
    name_th: 'น้ำขิงแก่ต้มสด',
    name_en: 'Fresh Ginger Tea',
    description_th: '<p>ขิงแก่แท้ต้มเตาถ่าน รสเผ็ดร้อนถึงใจ ช่วยขับลม บำรุงการไหลเวียน เติมบัวลอยงาดำได้</p>',
    description_en: '<p>Old ginger simmered over charcoal for hours. Robust, spicy, naturally warming. Great with sesame dumplings.</p>',
    category: 'drinks',
    price: 20,
    image_url: '/images/ginger-tea.jpg',
    available: false,
    sold_out: true, // Out of stock for demonstration
    next_batch_time: '18:00',
    stock: 0,
    sort_order: 4,
  },
  {
    id: 5,
    slug: 'patongko',
    name_th: 'ปาท่องโก๋เกลียวกรอบ',
    name_en: 'Crispy Patongko (4 pcs)',
    description_th: '<p>ทอดใหม่กระทะต่อกระทะ แป้งกรอบนอกนุ่มใน ไม่อมน้ำมัน จิ้มนมข้นหรือสังขยาใบเตยสด</p>',
    description_en: '<p>Fried fresh per batch. Crispy exterior, airy tender interior, never greasy. Served with condensed milk.</p>',
    category: 'snacks',
    price: 20,
    image_url: '/images/patongko.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '',
    stock: 4, // Low stock
    sort_order: 5,
  },
  {
    id: 6,
    slug: 'salapao',
    name_th: 'ซาลาเปาทอดไส้หมูแดง',
    name_en: 'Fried Char Siu Bao',
    description_th: '<p>ซาลาเปาทอดกรอบนอก แป้งนุ่มหอม ไส้หมูแดงฮ่องกงสูตรพิเศษ เคี่ยวน้ำผึ้งและเครื่องเทศ</p>',
    description_en: '<p>Golden fried bun with house-made honey roasted pork filling. Crispy bottom, pillowy top.</p>',
    category: 'snacks',
    price: 25,
    image_url: '/images/salapao.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '',
    stock: 20,
    sort_order: 6,
  },
];

export const INITIAL_SETTINGS = [
  { key: 'shop_status', value: 'open' },
  { key: 'announcement', value: 'น้ำเต้าหู้เตาแรกพร้อม 06:00 น. | Fresh batch daily from 6 AM' },
  { key: 'opening_hours', value: 'ทุกวัน 06:00 - 11:00 น. และ 17:00 - 21:00 น.' },
  { key: 'promptpay_number', value: '053-000-000' },
  { key: 'promptpay_name', value: 'วันใจ Soy (Wanchai Soy Milk)' },
];

let inMemoryProducts = [...INITIAL_PRODUCTS];
let inMemorySettings = [...INITIAL_SETTINGS];
let inMemoryOrders = [];

// Seed database if empty
let seedAttempted = false;
async function ensureSeeded() {
  if (!firestoreInitialized || seedAttempted) return;
  seedAttempted = true;
  try {
    const productsRef = collection(db, 'products');
    const snap = await getDocs(productsRef);
    if (snap.empty) {
      console.log('[Firestore] Seeding initial products...');
      for (const p of INITIAL_PRODUCTS) {
        await setDoc(doc(db, 'products', String(p.id)), p);
      }
    }
    const settingsRef = collection(db, 'settings');
    const setSnap = await getDocs(settingsRef);
    if (setSnap.empty) {
      console.log('[Firestore] Seeding initial settings...');
      for (const s of INITIAL_SETTINGS) {
        await setDoc(doc(db, 'settings', s.key), s);
      }
    }
  } catch (err) {
    console.warn('[Firestore] Seed check warning:', err.message);
  }
}

// Products API
export async function getFirestoreProducts() {
  await ensureSeeded();
  if (firestoreInitialized) {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        const list = [];
        snap.forEach((d) => list.push(d.data()));
        list.sort((a, b) => (a.sort_order || a.id || 0) - (b.sort_order || b.id || 0));
        inMemoryProducts = list;
        return list;
      }
    } catch (err) {
      console.warn('[Firestore] getFirestoreProducts fallback:', err.message);
    }
  }
  return inMemoryProducts;
}

export async function createFirestoreProduct(product) {
  const newProduct = {
    ...product,
    id: product.id || Date.now(),
    sort_order: product.sort_order || inMemoryProducts.length + 1,
  };
  inMemoryProducts.push(newProduct);
  if (firestoreInitialized) {
    try {
      await setDoc(doc(db, 'products', String(newProduct.id)), newProduct);
    } catch (err) {
      console.warn('[Firestore] createProduct error:', err.message);
    }
  }
  return newProduct;
}

export async function updateFirestoreProduct(id, updates) {
  const numId = Number(id);
  const idx = inMemoryProducts.findIndex((p) => p.id === numId || String(p.id) === String(id));
  if (idx !== -1) {
    inMemoryProducts[idx] = { ...inMemoryProducts[idx], ...updates };
  }
  if (firestoreInitialized) {
    try {
      const docRef = doc(db, 'products', String(id));
      await setDoc(docRef, updates, { merge: true });
    } catch (err) {
      console.warn('[Firestore] updateProduct error:', err.message);
    }
  }
  return idx !== -1 ? inMemoryProducts[idx] : { id: numId, ...updates };
}

export async function deleteFirestoreProduct(id) {
  inMemoryProducts = inMemoryProducts.filter((p) => String(p.id) !== String(id));
  if (firestoreInitialized) {
    try {
      await deleteDoc(doc(db, 'products', String(id)));
    } catch (err) {
      console.warn('[Firestore] deleteProduct error:', err.message);
    }
  }
  return { success: true };
}

// Settings API
export async function getFirestoreSettings() {
  await ensureSeeded();
  if (firestoreInitialized) {
    try {
      const snap = await getDocs(collection(db, 'settings'));
      if (!snap.empty) {
        const list = [];
        snap.forEach((d) => list.push(d.data()));
        inMemorySettings = list;
        return list;
      }
    } catch (err) {
      console.warn('[Firestore] getFirestoreSettings fallback:', err.message);
    }
  }
  return inMemorySettings;
}

export async function updateFirestoreSetting(key, value) {
  const idx = inMemorySettings.findIndex((s) => s.key === key);
  if (idx !== -1) {
    inMemorySettings[idx].value = value;
  } else {
    inMemorySettings.push({ key, value });
  }
  if (firestoreInitialized) {
    try {
      await setDoc(doc(db, 'settings', key), { key, value }, { merge: true });
    } catch (err) {
      console.warn('[Firestore] updateSetting error:', err.message);
    }
  }
  return { key, value };
}

// Orders API
export async function getFirestoreOrders({ id, phone } = {}) {
  if (firestoreInitialized) {
    try {
      const ordersRef = collection(db, 'orders');
      let q = query(ordersRef, orderBy('id', 'desc'), limit(200));
      if (id) {
        q = query(ordersRef, where('id', '==', Number(id) || id));
      } else if (phone) {
        q = query(ordersRef, where('phone', '==', phone), limit(100));
      }
      const snap = await getDocs(q);
      const list = [];
      snap.forEach((d) => list.push(d.data()));
      if (list.length > 0) {
        return list;
      }
    } catch (err) {
      console.warn('[Firestore] getOrders fallback:', err.message);
    }
  }
  let filtered = [...inMemoryOrders];
  if (id) filtered = filtered.filter((o) => String(o.id) === String(id));
  if (phone) filtered = filtered.filter((o) => o.phone === phone);
  return filtered;
}

export async function createFirestoreOrder(orderData) {
  const newOrder = {
    id: Date.now(),
    customer_name: orderData.customer_name || '',
    phone: orderData.phone || '',
    items: orderData.items || [],
    total: orderData.total || 0,
    pickup_time: orderData.pickup_time || '',
    status: orderData.status || 'pending',
    payment_status: orderData.payment_status || 'unpaid',
    payment_method: orderData.payment_method || 'promptpay',
    notes: orderData.notes || '',
    created_at: new Date().toISOString(),
  };
  inMemoryOrders.unshift(newOrder);
  if (firestoreInitialized) {
    try {
      await setDoc(doc(db, 'orders', String(newOrder.id)), newOrder);
    } catch (err) {
      console.warn('[Firestore] createOrder error:', err.message);
    }
  }
  return newOrder;
}

export async function updateFirestoreOrder(id, updates) {
  const idx = inMemoryOrders.findIndex((o) => String(o.id) === String(id));
  if (idx !== -1) {
    inMemoryOrders[idx] = { ...inMemoryOrders[idx], ...updates };
  }
  if (firestoreInitialized) {
    try {
      await setDoc(doc(db, 'orders', String(id)), updates, { merge: true });
    } catch (err) {
      console.warn('[Firestore] updateOrder error:', err.message);
    }
  }
  return idx !== -1 ? inMemoryOrders[idx] : { id, ...updates };
}

export { db };
