import {
  getFirestoreOrders,
  createFirestoreOrder,
  updateFirestoreOrder,
} from './firestore-db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id, phone } = req.query || {};
      const orders = await getFirestoreOrders({ id, phone });
      return res.status(200).json(orders);
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      const order = await createFirestoreOrder(b);
      return res.status(201).json(order);
    }
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const updated = await updateFirestoreOrder(id, updates);
      return res.status(200).json(updated);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders error:', err);
    res.status(500).json({ error: err.message });
  }
}


