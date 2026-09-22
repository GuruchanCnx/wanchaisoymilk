import { sendOrderSummaryEmail, getEmailLogs, generateOrderSummaryHtml } from './email-service.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const logs = await getEmailLogs();
      return res.status(200).json(logs);
    }
    if (req.method === 'POST') {
      const { order, previewOnly } = req.body || {};
      if (!order) {
        return res.status(400).json({ error: 'Order object is required' });
      }
      if (previewOnly) {
        const html = generateOrderSummaryHtml(order);
        return res.status(200).json({ previewHtml: html });
      }
      const result = await sendOrderSummaryEmail(order);
      return res.status(200).json(result);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Email API error:', err);
    res.status(500).json({ error: err.message });
  }
}
