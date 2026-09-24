import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { dataUrl, filename } = req.body || {};

      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: 'dataUrl string is required' });
      }

      // If it's a valid image data URL, try writing it to the static upload folder
      if (dataUrl.startsWith('data:image/')) {
        const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1].replace('jpeg', 'jpg');
          const base64Data = matches[2];

          try {
            const uploadDir = path.resolve(process.cwd(), 'public', 'images', 'uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }

            const cleanName = (filename || 'image')
              .replace(/\.[^/.]+$/, '')
              .replace(/[^a-zA-Z0-9-_]/g, '_')
              .toLowerCase();
            const safeFilename = `${cleanName}-${Date.now()}.${ext}`;
            const filePath = path.join(uploadDir, safeFilename);

            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

            // Also mirror to dist if dist/images exists
            const distUploadDir = path.resolve(process.cwd(), 'dist', 'images', 'uploads');
            if (fs.existsSync(path.resolve(process.cwd(), 'dist', 'images'))) {
              if (!fs.existsSync(distUploadDir)) {
                fs.mkdirSync(distUploadDir, { recursive: true });
              }
              fs.writeFileSync(path.join(distUploadDir, safeFilename), Buffer.from(base64Data, 'base64'));
            }

            const publicUrl = `/images/uploads/${safeFilename}`;
            return res.status(200).json({
              url: publicUrl,
              filename: safeFilename,
              success: true,
            });
          } catch (writeErr) {
            console.warn('[Upload API] Filesystem write bypassed, returning inline data URL:', writeErr.message);
            // In read-only or serverless filesystem, return the compressed dataUrl directly
            return res.status(200).json({
              url: dataUrl,
              fallback: true,
              success: true,
            });
          }
        }
      }

      // If already a URL or fallback
      return res.status(200).json({ url: dataUrl, success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[Upload API] error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

