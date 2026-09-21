import express from 'express';
import path from 'path';
// @ts-ignore
import productsHandler from './api/products.js';
// @ts-ignore
import ordersHandler from './api/orders.js';
// @ts-ignore
import settingsHandler from './api/settings.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.all('/api/products', (req, res) => productsHandler(req, res));
app.all('/api/orders', (req, res) => ordersHandler(req, res));
app.all('/api/settings', (req, res) => settingsHandler(req, res));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
