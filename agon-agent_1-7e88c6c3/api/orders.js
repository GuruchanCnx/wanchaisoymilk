import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id, phone } = req.query || {};
      let q = supabase.from('orders').select('*').order('id', { ascending: false }).limit(200);
      if (id) q = q.eq('id', id);
      if (phone) q = q.eq('phone', phone);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const b = req.body || {};
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
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders error:', err);
    res.status(500).json({ error: err.message });
  }
}
