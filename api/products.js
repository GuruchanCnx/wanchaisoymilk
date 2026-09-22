import {
  getFirestoreProducts,
  createFirestoreProduct,
  updateFirestoreProduct,
  deleteFirestoreProduct,
} from './firestore-db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const data = await getFirestoreProducts();
      res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=60');
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      const product = await createFirestoreProduct(body);
      return res.status(201).json(product);
    }
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const updated = await updateFirestoreProduct(id, updates);
      return res.status(200).json(updated);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      await deleteFirestoreProduct(id);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('products error:', err);
    res.status(500).json({ error: err.message });
  }
}


