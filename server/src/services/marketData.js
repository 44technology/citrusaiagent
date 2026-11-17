import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

// Market Data module (server/market-data) is plain CommonJS with its own
// package.json — load it through require so the ESM server can use it.
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const paths = require('../../market-data/lib/paths.js');

export const DASHBOARD_FILE = path.join(__dirname, '../../market-data/public/dashboard.html');
export const getDataFile = () => paths.ensureDataFile();

// Product-restricted copies (grapes-only / citrus-only), cached until the data file changes.
const { filterGroup } = require('../../market-data/lib/filter.js');
const scopedCache = new Map();
export function getScopedData(group) {
  const file = getDataFile();
  const st = fs.statSync(file);
  const key = `${st.size}-${Math.round(st.mtimeMs)}`;
  const hit = scopedCache.get(group);
  if (hit && hit.key === key) return hit;
  const json = Buffer.from(JSON.stringify(filterGroup(JSON.parse(fs.readFileSync(file, 'utf8')), group)));
  const entry = { key, etag: `"${group}-${key}"`, json, gz: zlib.gzipSync(json) };
  scopedCache.set(group, entry);
  return entry;
}

// Date parts as seen on a New York wall clock.
const etParts = () => Object.fromEntries(
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short',
  }).formatToParts(new Date()).map(p => [p.type, p.value])
);
const etDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d); // YYYY-MM-DD

// Once per weekday after 15:15 New York time. USDA publishes a day's data the
// next business day around noon. The "already ran today" check uses the data
// file's own mtime, so a deploy/restart later in the day doesn't re-run it, and
// a restart after a missed slot still catches up.
export function startMarketDataScheduler(log = console.log) {
  if (process.env.MARKET_DATA_CRON === 'off') return;
  if (!process.env.MARS_API_KEY) { log('[market-data] MARS_API_KEY not set — daily update disabled'); return; }
  if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') return; // pm2 cluster: one runner only

  const { runUpdate } = require('../../market-data/update.js');
  let running = false;
  const tick = async () => {
    if (running) return;
    const p = etParts();
    if (p.weekday === 'Sat' || p.weekday === 'Sun') return;
    if (Number(p.hour) * 60 + Number(p.minute) < 15 * 60 + 15) return;
    try {
      const file = getDataFile();
      if (etDay(fs.statSync(file).mtime) === `${p.year}-${p.month}-${p.day}`) return; // already updated today
      running = true;
      log('[market-data] daily update starting');
      await runUpdate({ log: (...a) => log('[market-data]', ...a) });
    } catch (e) {
      console.error('[market-data] daily update failed:', e.message);
    } finally { running = false; }
  };
  setInterval(tick, 60 * 1000);
  setTimeout(tick, 30 * 1000); // catch up shortly after boot
  log('[market-data] daily update scheduled (weekdays after 15:15 America/New_York)');
}
