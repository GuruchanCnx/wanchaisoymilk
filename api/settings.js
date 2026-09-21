import supabase from './db-client.js';

let inMemorySettings = {
  shop_status: 'open',
  announcement: 'วันใจ Soy — น้ำเต้าหู้ นมวัว น้ำขิง สดใหม่ทุกเช้า',
  promptpay_number: '0812345678',
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
      try {
        const { data, error } = await supabase.from('settings').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          const map = {};
          data.forEach((r) => {
            map[r.key] = r.value;
          });
          inMemorySettings = { ...inMemorySettings, ...map };
          res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=120');
          return res.status(200).json(inMemorySettings);
        }
      } catch (err) {
        console.warn('Supabase settings fetch failed, falling back to in-memory:', err.message);
      }
      return res.status(200).json(inMemorySettings);
    }
    if (req.method === 'PUT') {
      const { key, value } = req.body || {};
      if (!key) return res.status(400).json({ error: 'key required' });
      try {
        const { data, error } = await supabase
          .from('settings')
          .upsert({ key, value })
          .select()
          .single();
        if (!error && data) {
          inMemorySettings[key] = value;
          return res.status(200).json(data);
        }
      } catch (err) {
        console.warn('Supabase settings upsert failed, updating in-memory:', err.message);
      }
      inMemorySettings[key] = value;
      return res.status(200).json({ key, value });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('settings error:', err);
    res.status(500).json({ error: err.message });
  }
}

