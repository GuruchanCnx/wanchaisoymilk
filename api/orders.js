import supabase from './db-client.js';

let inMemoryOrders = [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id, phone } = req.query || {};
      try {
        let q = supabase.from('orders').select('*').order('id', { ascending: false }).limit(200);
        if (id) q = q.eq('id', id);
        if (phone) q = q.eq('phone', phone);
        const { data, error } = await q;
        if (!error && Array.isArray(data)) {
          return res.status(200).json(data);
        }
      } catch (err) {
        console.warn('Supabase orders fetch failed, falling back to in-memory:', err.message);
      }
      let filtered = [...inMemoryOrders];
      if (id) filtered = filtered.filter((o) => String(o.id) === String(id));
      if (phone) filtered = filtered.filter((o) => o.phone === phone);
      return res.status(200).json(filtered);
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      try {
        const { data, error } = await supabase
          .from('orders')
          .insert({
            customer_name: b.customer_name || '',
            phone: b.phone || '',
            items: b.items || [],
            total: b.total || 0,
            pickup_time: b.pickup_time || '',
            status: 'pending',
            payment_status: b.payment_method === 'cash' ? 'unpaid' : 'unpaid',
            payment_method: b.payment_method || 'promptpay',
            notes: b.notes || '',
          })
          .select()
          .single();
        if (!error && data) {
          inMemoryOrders.unshift(data);
          return res.status(201).json(data);
        }
      } catch (err) {
        console.warn('Supabase order insert failed, saving to in-memory:', err.message);
      }
      const newOrder = {
        id: Date.now(),
        customer_name: b.customer_name || '',
        phone: b.phone || '',
        items: b.items || [],
        total: b.total || 0,
        pickup_time: b.pickup_time || '',
        status: 'pending',
        payment_status: 'unpaid',
        payment_method: b.payment_method || 'promptpay',
        notes: b.notes || '',
        created_at: new Date().toISOString(),
      };
      inMemoryOrders.unshift(newOrder);
      return res.status(201).json(newOrder);
    }
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      try {
        const { data, error } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          const idx = inMemoryOrders.findIndex((o) => String(o.id) === String(id));
          if (idx !== -1) inMemoryOrders[idx] = data;
          return res.status(200).json(data);
        }
      } catch (err) {
        console.warn('Supabase order update failed, updating in-memory:', err.message);
      }
      const idx = inMemoryOrders.findIndex((o) => String(o.id) === String(id));
      if (idx !== -1) {
        inMemoryOrders[idx] = { ...inMemoryOrders[idx], ...updates };
        return res.status(200).json(inMemoryOrders[idx]);
      }
      return res.status(200).json({ id, ...updates });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders error:', err);
    res.status(500).json({ error: err.message });
  }
}

