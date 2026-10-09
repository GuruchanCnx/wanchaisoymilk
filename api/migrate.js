import { db, INITIAL_PRODUCTS } from './firestore-db.js';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';

const DEFAULT_SETTINGS = [
  { key: 'shop_status', value: 'open' },
  { key: 'announcement', value: 'วันใจ Soy — น้ำเต้าหู้ นมวัว น้ำขิง สดใหม่ทุกเช้า' },
  { key: 'promptpay_number', value: '081-234-5678' },
  { key: 'promptpay_name', value: 'วันใจ Soy (Wanchai Soy Milk)' },
  { key: 'shop_phone', value: '053-000-000' },
  { key: 'open_hours_th', value: 'ทุกวัน 06:00 – 11:00 น.' },
  { key: 'open_hours_en', value: 'Daily 06:00 – 11:00 AM' },
  { key: 'hours_today', value: '06:00 – 11:00' },
  { key: 'address_th', value: '15/4 ซอย 2 ถนนวัวลาย ตำบลหายยา อำเภอเมือง เชียงใหม่ 50100' },
  { key: 'address_en', value: '15/4 Soi 2, Walai Rd, Haiya, Mueang Chiang Mai 50100' },
  { key: 'hero_image_url', value: '/images/hero.jpg' },
  { key: 'line_id', value: '@wanchaisoy' },
  { key: 'instagram_url', value: 'https://www.instagram.com/wanchai.soy' },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    let fbProductsCount = 0;
    let fbSettingsCount = 0;
    let fbOrdersCount = 0;

    if (db) {
      try {
        const pSnap = await getDocs(collection(db, 'products'));
        fbProductsCount = pSnap.size;
        const sSnap = await getDocs(collection(db, 'settings'));
        fbSettingsCount = sSnap.size;
        const oSnap = await getDocs(collection(db, 'orders'));
        fbOrdersCount = oSnap.size;
      } catch (e) {
        console.warn('[Firestore Status] Check error:', e.message);
      }
    }

    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'active',
        database: 'Firebase Firestore',
        targetDatabase: 'ai-studio-wanchaisoymilk-2125599d-2848-42d7-b69f-4b82b3e45dc6',
        firestoreCounts: {
          products: fbProductsCount,
          settings: fbSettingsCount,
          orders: fbOrdersCount,
        },
      });
    }

    if (req.method === 'POST') {
      let migratedProducts = 0;
      let migratedSettings = 0;

      if (db) {
        // Seed default products if empty
        if (fbProductsCount === 0) {
          for (const p of INITIAL_PRODUCTS) {
            await setDoc(doc(db, 'products', String(p.id)), p, { merge: true });
            migratedProducts++;
          }
        }
        // Seed default settings if empty
        if (fbSettingsCount === 0) {
          for (const s of DEFAULT_SETTINGS) {
            await setDoc(doc(db, 'settings', s.key), s, { merge: true });
            migratedSettings++;
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Firestore initialization verified successfully.',
        migrated: {
          products: migratedProducts,
          settings: migratedSettings,
        },
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Firestore handler error:', err);
    res.status(500).json({ error: err.message });
  }
}
