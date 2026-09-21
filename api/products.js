import supabase from './db-client.js';

let inMemoryProducts = [
  {
    id: 1,
    slug: 'soy-milk',
    name_th: 'น้ำเต้าหู้',
    name_en: 'Fresh Soy Milk',
    description_th:
      '<p>สูตรดั้งเดิมของวันใจ ต้มสดทุกเช้าจากถั่วเหลืองไทยแท้ ไม่ใส่นมผง ไม่ใส่สารกันบูด. เสิร์ฟใน<strong>ถุงพลาสติกใส</strong>ตามแบบพ่อค้าแม่ค้าเชียงใหม่ พร้อมหลอด.</p><ul><li>ไม่มีน้ำตาล / น้อย / ปกติ / มาก</li><li>ร้อนหรือเย็น</li><li>เอาภาชนะมาเอง ลด 2 บาท</li></ul>',
    description_en:
      '<p>Our house original — simmered fresh every morning from Thai soybeans. No milk powder, no preservatives. Served in a <strong>clear plastic bag</strong> Chiang Mai style, with a bamboo straw.</p><ul><li>Sweetness: none / less / normal / extra</li><li>Hot or cold</li><li>BYO container: save 2 baht</li></ul>',
    category: 'drinks',
    price: 15,
    image_url: '/images/soy-milk.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '09:30',
    stock: 80,
    sort_order: 10,
  },
  {
    id: 2,
    slug: 'cow-milk',
    name_th: 'นมวัวสด',
    name_en: 'Fresh Cow Milk',
    description_th:
      '<p>นมวัวสดจากฟาร์มเชียงใหม่ พาสเจอร์ไรส์เบา ๆ ให้ยังคงรสชาติสด. เย็นจัด หวานตามธรรมชาติ.</p>',
    description_en:
      '<p>Fresh dairy from a Chiang Mai farm, gently pasteurized so the sweetness stays. Ice-cold, naturally rich.</p>',
    category: 'drinks',
    price: 20,
    image_url: '/images/cow-milk.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '07:30',
    stock: 40,
    sort_order: 20,
  },
  {
    id: 3,
    slug: 'ginger-tea',
    name_th: 'น้ำขิงร้อน',
    name_en: 'Hot Ginger Tea',
    description_th:
      '<p>ขิงสด บดคั้นเอง เคี่ยวกับน้ำตาลอ้อยจนได้กลิ่นหอมชัด. อุ่นท้อง เผ็ดร้อนกำลังดี. เลือกใส่มะนาวได้.</p>',
    description_en:
      '<p>Fresh ginger, hand-pressed and simmered with palm sugar. Warms the belly on a cool Chiang Mai morning. Add lime if you like.</p>',
    category: 'drinks',
    price: 15,
    image_url: '/images/ginger-tea.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '09:00',
    stock: 30,
    sort_order: 30,
  },
  {
    id: 4,
    slug: 'black-sesame',
    name_th: 'น้ำเต้าหู้งาดำ',
    name_en: 'Black Sesame Soy',
    description_th:
      '<p>น้ำเต้าหู้สูตรเดิม เติมงาดำคั่วบดสด กลิ่นหอมเข้ม บำรุงกระดูก.</p>',
    description_en:
      '<p>Our soy milk with fresh-roasted black sesame stirred in. Nutty aroma, calcium boost.</p>',
    category: 'drinks',
    price: 20,
    image_url: '/images/black-sesame.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '10:00',
    stock: 25,
    sort_order: 40,
  },
  {
    id: 5,
    slug: 'patongko',
    name_th: 'ปาท่องโก๋',
    name_en: 'Patongko (Thai fried dough)',
    description_th:
      '<p>ทอดใหม่ทุกเช้าให้กรอบนอกนุ่มใน. คู่กับน้ำเต้าหู้ร้อน ๆ เข้าคู่ที่สุด.</p><p><strong>ชิ้นละ ฿3</strong></p>',
    description_en:
      '<p>Twin-stick fried dough, crisp outside soft inside. Best dunked in hot soy milk.</p><p><strong>฿3 per piece</strong></p>',
    category: 'snacks',
    price: 3,
    image_url: '/images/patongko.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '06:30',
    stock: 120,
    sort_order: 50,
  },
  {
    id: 6,
    slug: 'salapao',
    name_th: 'ซาลาเปา',
    name_en: 'Salapao (Steamed Bun)',
    description_th:
      '<p>ซาลาเปาไส้หมูสับ นึ่งใหม่ในลังไม้ไผ่. แป้งนุ่ม ไส้หวานเค็มกำลังดี.</p><p><strong>ลูกละ ฿3</strong></p>',
    description_en:
      '<p>Steamed pork buns from the bamboo basket. Pillowy dough, savory-sweet filling.</p><p><strong>฿3 each</strong></p>',
    category: 'snacks',
    price: 3,
    image_url: '/images/salapao.jpg',
    available: true,
    sold_out: false,
    next_batch_time: '07:30',
    stock: 60,
    sort_order: 60,
  },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          inMemoryProducts = data;
          res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=60');
          return res.status(200).json(data);
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to in-memory products:', err.message);
      }
      return res.status(200).json(inMemoryProducts);
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      try {
        const { data, error } = await supabase
          .from('products')
          .insert({
            slug: body.slug,
            name_th: body.name_th,
            name_en: body.name_en,
            description_th: body.description_th || '',
            description_en: body.description_en || '',
            category: body.category,
            price: body.price,
            image_url: body.image_url || '',
            available: body.available ?? true,
            sold_out: body.sold_out ?? false,
            next_batch_time: body.next_batch_time || '',
            stock: body.stock ?? 0,
            sort_order: body.sort_order ?? 100,
          })
          .select()
          .single();
        if (!error && data) return res.status(201).json(data);
      } catch (err) {
        console.warn('Supabase insert failed, adding to in-memory:', err.message);
      }
      const newProd = {
        id: Date.now(),
        ...body,
      };
      inMemoryProducts.push(newProd);
      return res.status(201).json(newProd);
    }
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      try {
        const { data, error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return res.status(200).json(data);
      } catch (err) {
        console.warn('Supabase update failed, updating in-memory:', err.message);
      }
      const idx = inMemoryProducts.findIndex((p) => p.id === id);
      if (idx !== -1) {
        inMemoryProducts[idx] = { ...inMemoryProducts[idx], ...updates };
        return res.status(200).json(inMemoryProducts[idx]);
      }
      return res.status(200).json({ id, ...updates });
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) return res.status(200).json({ ok: true });
      } catch (err) {
        console.warn('Supabase delete failed, removing from in-memory:', err.message);
      }
      inMemoryProducts = inMemoryProducts.filter((p) => p.id !== id);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('products error:', err);
    res.status(500).json({ error: err.message });
  }
}

