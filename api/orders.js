import {
  getFirestoreOrders,
  createFirestoreOrder,
  updateFirestoreOrder,
  db,
} from './firestore-db.js';
import { sendOrderSummaryEmail } from './email-service.js';
import { collection, addDoc } from 'firebase/firestore';

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

      // Automated email trigger: if payment is confirmed upon checkout
      if (order.payment_status === 'paid' || b.payment_status === 'paid' || b.is_paid) {
        try {
          await sendOrderSummaryEmail(order);
        } catch (emailErr) {
          console.warn('[Orders API] Email trigger error:', emailErr.message);
        }
      }

      return res.status(201).json(order);
    }
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const updated = await updateFirestoreOrder(id, updates);

      // 1. Check if payment was just marked as paid -> trigger automated email
      if (updates.payment_status === 'paid') {
        try {
          await sendOrderSummaryEmail({ ...updated, ...updates });
        } catch (emailErr) {
          console.warn('[Orders API] Automated payment email error:', emailErr.message);
        }
      }

      // 2. Check if status was updated to 'ready' -> trigger FCM push notification
      if (updates.status === 'ready') {
        console.log(`[FCM Push] Order #${id} is READY FOR PICKUP! Dispatching push notification...`);
        if (db) {
          try {
            await addDoc(collection(db, 'fcm_notifications'), {
              order_id: String(id),
              customer_name: updated?.customer_name || 'Customer',
              phone: updated?.phone || '',
              fcm_token: updated?.fcm_token || null,
              title: 'น้ำเต้าหู้ของคุณพร้อมรับแล้ว! 🌿',
              title_en: 'Your order is ready for pickup!',
              body: `ออเดอร์ #${id} ต้มร้อนๆ พร้อมส่งมอบที่หน้าร้านวันใจ Soy ถนนวัวลาย`,
              body_en: `Order #${id} is freshly packed and waiting for you at Walai Road.`,
              timestamp: new Date().toISOString(),
              status: 'pushed',
            });
          } catch (fcmErr) {
            console.warn('[FCM Push] Notification log error:', fcmErr.message);
          }
        }
      }

      return res.status(200).json(updated);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders error:', err);
    res.status(500).json({ error: err.message });
  }
}


