import express from 'express';
import fs from 'fs';
import zlib from 'zlib';
import { DASHBOARD_FILE, getDataFile, getScopedData } from '../services/marketData.js';
import { marketScope } from '../middleware/marketRole.js';

// Mounted at /api/market-data behind authMiddleware — any logged-in user.
const router = express.Router();

// Dashboard HTML. The React page loads it with the user's token and shows it in
// an iframe; the username goes in the footer watermark.
router.get('/page', (req, res) => {
  try {
    const name = req.user?.username || '';
    // JSON in a <script> block: escape "<" so a username can't close the tag
    const tag = `<script>window.SF_USER_EMAIL=${JSON.stringify(name).replace(/</g, '\\u003c')}</script>`;
    const html = fs.readFileSync(DASHBOARD_FILE, 'utf8').replace('<!--SF_USER-->', () => tag);
    res.set('Cache-Control', 'private, no-store').type('html').send(html);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dataset (single JSON file, gzip when the client accepts it)
router.get('/', (req, res) => {
  // Grapes-only / citrus-only accounts get a server-side filtered copy
  const scope = marketScope(req.user?.role);
  if (scope) {
    try {
      const d = getScopedData(scope);
      if (req.headers['if-none-match'] === d.etag) return res.status(304).end();
      res.set({ 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300', ETag: d.etag });
      if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) return res.set('Content-Encoding', 'gzip').send(d.gz);
      return res.send(d.json);
    } catch (e) { return res.status(503).json({ error: 'data not ready' }); }
  }
  let file;
  try { file = getDataFile(); } catch (e) { return res.status(503).json({ error: 'data not ready' }); }
  fs.stat(file, (err, st) => {
    if (err) return res.status(503).json({ error: 'data not ready' });
    const etag = `"${st.size}-${Math.round(st.mtimeMs)}"`;
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.set({ 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300', ETag: etag });
    const stream = fs.createReadStream(file);
    stream.on('error', () => res.destroy());
    if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      res.set('Content-Encoding', 'gzip');
      stream.pipe(zlib.createGzip()).pipe(res);
    } else {
      stream.pipe(res);
    }
  });
});

export default router;
