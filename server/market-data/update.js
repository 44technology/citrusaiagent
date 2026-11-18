#!/usr/bin/env node
// Sweet Fresh – Market Data güncelleyici.
// Kullanım:
//   node update.js                 -> son 21 günün USDA verisi (+ ayın ilk haftasıysa Census)
//   node update.js --days 60       -> son 60 gün
//   node update.js --census        -> Census'u da zorla güncelle (son 6 ay)
//   node update.js --from 2024-01-01 --census-from 2024-01   -> geçmişi baştan doldur
//   node update.js --from 2018-01-01 --to 2018-12-31          -> yalnızca bir yıl (bellek az ise yıl yıl doldurun)
// Ortam değişkenleri: MARS_API_KEY (zorunlu), CENSUS_API_KEY (Census için), MARKET_DATA_FILE (varsayılan: UPLOADS_DIR/market-data.json)
'use strict';

const fs = require('fs');
const path = require('path');
const P = require('./lib/paths'); // loads server/.env for CLI runs; must come first
const C = require('./lib/convert');
const { fetchReport } = require('./lib/usda');
const { fetchCensus } = require('./lib/census');

const REPORTS = {
  vol: ['3283', '3125'],     // İthalat hareketi: Washington DC ulusal ithalat + Nogales
  price: ['2401'],           // İthal meyve FOB fiyatları (Philadelphia/NY bölgesi)
  hal: ['2314', '2318', '2285', '2281', '2290', '2302', '2277', '2294', '3913', '2310', '2306'], // 11 hal (Fruit)
};

const ym = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

async function runUpdate(opts = {}) {
  const log = opts.log || console.log;
  const file = opts.dataFile || P.ensureDataFile();
  const marsKey = opts.marsKey || process.env.MARS_API_KEY;
  const censusKey = opts.censusKey || process.env.CENSUS_API_KEY;
  if (!marsKey) throw new Error('MARS_API_KEY tanımlı değil');

  const D = fs.existsSync(file) ? C.decode(JSON.parse(fs.readFileSync(file, 'utf8')))
    : { meta: {}, markets: {}, vol: [], price: [], hal: [], cen: [] };
  D.cen = D.cen || [];

  const to = opts.to ? new Date(opts.to + 'T23:59:59Z') : new Date();
  const from = opts.from ? new Date(opts.from + 'T00:00:00Z') : new Date(to.getTime() - (opts.days || 21) * 864e5);
  const summary = {};

  for (const slug of REPORTS.vol) {
    const raw = await fetchReport(slug, marsKey, from, to, log);
    const rows = C.convVol(raw);
    const pub = raw.map(x => C.isoUS(x.report_date)).filter(Boolean).sort().pop();
    if (pub && (!D.meta.vPub || pub > D.meta.vPub)) D.meta.vPub = pub;
    if (rows.length) D.vol = C.mergeRows(D.vol, rows, 2, 1);
    summary['hareket ' + slug] = rows.length;
  }
  for (const slug of REPORTS.price) {
    const rows = C.convPrice(await fetchReport(slug, marsKey, from, to, log));
    if (rows.length) D.price = C.mergeRows(D.price, rows, 1, 0);
    summary['FOB ' + slug] = rows.length;
  }
  for (const slug of REPORTS.hal) {
    const rows = C.convHal(await fetchReport(slug, marsKey, from, to, log), D.markets);
    if (rows.length) D.hal = C.mergeRows(D.hal, rows, 1, 0);
    summary['hal ' + slug] = rows.length;
  }

  const wantCensus = opts.census || opts.censusFrom || (!opts.to && to.getUTCDate() <= 7);
  if (wantCensus && censusKey) {
    const cFrom = opts.censusFrom || ym(new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 6, 1)));
    const rows = C.convCen(await fetchCensus(censusKey, cFrom, ym(to), log));
    if (rows.length) D.cen = C.mergeRows(D.cen, rows, null, 0);
    summary['census'] = rows.length;
  } else if (wantCensus) log('  CENSUS_API_KEY yok — Census atlandı');

  D.meta.updatedAt = new Date().toISOString();
  const tmp = file + '.tmp';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(C.encode(D)));
  fs.renameSync(tmp, file); // yarım yazılmış dosya olmasın
  log('Güncelleme tamam:', JSON.stringify(summary));
  return summary;
}

if (require.main === module) {
  const a = process.argv.slice(2), arg = n => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  runUpdate({ days: +(arg('--days') || 21), from: arg('--from'), to: arg('--to'), census: a.includes('--census'), censusFrom: arg('--census-from') })
    .catch(e => { console.error('HATA:', e.message); process.exit(1); });
}

module.exports = { runUpdate, REPORTS };
