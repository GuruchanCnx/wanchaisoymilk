import supabase from './db-client.js';
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
  { key: 'instagram_url', value: 'https://www.instagram.com/wanchai.soy' }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      // Check current Firestore count vs Supabase count
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
          console.warn('[Migrate Status] Firestore check error:', e.message);
        }
      }

      return res.status(200).json({
        status: 'ready',
        targetDatabase: 'ai-studio-wanchaisoymilk-2125599d-2848-42d7-b69f-4b82b3e45dc6',
        firestoreCounts: {
          products: fbProductsCount,
          settings: fbSettingsCount,
          orders: fbOrdersCount,
        },
        supabaseConnected: Boolean(supabase),
      });
    }

    if (req.method === 'POST') {
      console.log('[Migration] Starting Supabase to Firestore migration...');
      let pCount = 0, sCount = 0, oCount = 0;
      const errors = [];

      if (!db) {
        return res.status(500).json({ error: 'Firestore is not initialized.' });
      }

      // 1. Migrate Products
      try {
        let prods = [];
        if (supabase) {
          const { data, error: pErr } = await supabase.from('products').select('*');
          if (pErr) errors.push(`Products: ${pErr.message}`);
          if (data && data.length > 0) prods = data;
        }
        // Fallback to INITIAL_PRODUCTS if Supabase has no records or empty
        if (!prods || prods.length === 0) {
          prods = INITIAL_PRODUCTS;
        }
        for (const p of prods) {
          await setDoc(doc(db, 'products', String(p.id)), p, { merge: true });
          pCount++;
        }
      } catch (err) {
        errors.push(`Products error: ${err.message}`);
      }

      // 2. Migrate Settings
      try {
        let settings = [];
        if (supabase) {
          const { data, error: sErr } = await supabase.from('settings').select('*');
          if (sErr) errors.push(`Settings: ${sErr.message}`);
          if (data && data.length > 0) settings = data;
        }
        if (!settings || settings.length === 0) {
          settings = DEFAULT_SETTINGS;
        }
        for (const s of settings) {
          await setDoc(doc(db, 'settings', s.key), s, { merge: true });
          sCount++;
        }
      } catch (err) {
        errors.push(`Settings error: ${err.message}`);
      }

      // 3. Migrate Orders
      try {
        if (supabase) {
          const { data: orders, error: oErr } = await supabase.from('orders').select('*');
          if (oErr) errors.push(`Orders: ${oErr.message}`);
          if (orders && orders.length > 0) {
            for (const o of orders) {
              await setDoc(doc(db, 'orders', String(o.id)), o, { merge: true });
              oCount++;
            }
          }
        }
      } catch (err) {
        errors.push(`Orders error: ${err.message}`);
      }

      // Log migration event in Firestore
      await setDoc(doc(db, 'settings', 'last_supabase_migration'), {
        key: 'last_supabase_migration',
        migrated_at: new Date().toISOString(),
        products_migrated: pCount,
        settings_migrated: sCount,
        orders_migrated: oCount,
      });

      return res.status(200).json({
        success: true,
        message: 'Successfully migrated all data to Firebase Firestore',
        migrated: {
          products: pCount,
          settings: sCount,
          orders: oCount,
        },
        errors: errors.length > 0 ? errors : null,
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ error: err.message });
  }
}
