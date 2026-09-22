import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { dataUrl, filename } = req.body || {};
      if (!dataUrl) {
        return res.status(400).json({ error: 'dataUrl is required' });
      }

      // If it's a data URL, we can either save it as a local file or return the optimized URL
      if (dataUrl.startsWith('data:image/')) {
        const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1].replace('jpeg', 'jpg');
          const base64Data = matches[2];
          const uploadDir = path.resolve(process.cwd(), 'public', 'images', 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const cleanName = (filename || 'item').replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
          const safeFilename = `${cleanName}-${Date.now()}.${ext}`;
          const filePath = path.join(uploadDir, safeFilename);

          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          const publicUrl = `/images/uploads/${safeFilename}`;
          return res.status(200).json({ url: publicUrl, filename: safeFilename });
        }
      }

      // Fallback: return dataUrl directly so it immediately renders
      return res.status(200).json({ url: dataUrl });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Upload API error:', err);
    res.status(500).json({ error: err.message });
  }
}
