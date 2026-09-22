import {
  getFirestoreSettings,
  updateFirestoreSetting,
} from './firestore-db.js';

let defaultSettings = {
  shop_status: 'open',
  announcement: 'วันใจ Soy — น้ำเต้าหู้ นมวัว น้ำขิง สดใหม่ทุกเช้า',
  promptpay_number: '081-234-5678',
  promptpay_name: 'วันใจ Soy (Wanchai Soy Milk)',
  shop_phone: '081-234-5678',
  open_hours_th: '06:00 - 11:00 น. (ทุกวัน)',
  open_hours_en: '06:00 - 11:00 AM (Daily)',
  address_th: 'ถนนวัวลาย ตำบลหายยา อำเภอเมือง เชียงใหม่',
  address_en: 'Wua Lai Rd, Hai Ya, Mueang Chiang Mai',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const list = await getFirestoreSettings();
      const map = { ...defaultSettings };
      if (Array.isArray(list)) {
        list.forEach((r) => {
          if (r && r.key) map[r.key] = r.value;
        });
      }
      res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=120');
      return res.status(200).json(map);
    }
    if (req.method === 'PUT') {
      const { key, value } = req.body || {};
      if (!key) return res.status(400).json({ error: 'key required' });
      await updateFirestoreSetting(key, value);
      defaultSettings[key] = value;
      return res.status(200).json({ key, value });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('settings error:', err);
    res.status(500).json({ error: err.message });
  }
}


