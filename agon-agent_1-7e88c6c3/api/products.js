import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw error;
      // Cache hint: menu can be cached at edge for 30s but frontend does SWR
      res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=60');
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const body = req.body || {};
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
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('products error:', err);
    res.status(500).json({ error: err.message });
  }
}
