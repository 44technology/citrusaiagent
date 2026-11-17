#!/usr/bin/env node
// 11 halin geçmiş yıllarını (varsayılan 10 yıl) haftalık ortalama $/kg olarak çekip veri dosyasına ekler.
// Bir kez çalıştırmak yeterli; uzun sürer. Yarıda kesilirse tekrar çalıştırın (biten hal-yıllar atlanır).
//   node hal-history.js            -> son 10 yıl
//   node hal-history.js --years 5  -> son 5 yıl
//   node hal-history.js --csv hal_10yil.csv  -> Python betiğinin ürettiği dosyayı içe aktar (API'ye gitmeden)
'use strict';
const fs = require('fs'), path = require('path');
const P = require('./lib/paths'); // loads server/.env for CLI runs; must come first
const C = require('./lib/convert');
const { fetchReport } = require('./lib/usda');
const { REPORTS } = require('./update');

const LB = 0.45359237;
function pkgKg(p) {
  const s = String(p || '').toLowerCase();
  let m = s.match(/(\d+)\s+(\d+(?:\.\d+)?)\s*-?\s*(lb|kg)/); if (m) return (+m[1]) * (+m[2]) * (m[3] === 'lb' ? LB : 1);
  m = s.match(/(\d+(?:\.\d+)?)\s*-?\s*(kg|lb)/); if (m) return (+m[1]) * (m[2] === 'lb' ? LB : 1);
  return null; // ağırlık yazmıyorsa tahmin yapılmaz
}
const monday = iso => { const [y, m, d] = iso.split('-').map(Number); const t = Date.UTC(y, m - 1, d); return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10); };

function weekly(raw, slug, markets) {
  const g = new Map();
  for (const x of raw) {
    if (!C.KEEP.has(x.commodity) || x.organic === 'Y') continue;
    const kg = pkgKg(x.package); if (!kg) continue;
    const a = C.num(x.mostly_low_price) ?? C.num(x.low_price), b = C.num(x.mostly_high_price) ?? C.num(x.high_price);
    const d = C.isoUS(x.report_date); if (a == null || b == null || !d) continue;
    if (x.market_location_name) markets[slug] = String(x.market_location_name).replace(' Terminal Market', '').trim();
    const k = [monday(d), slug, x.commodity, C.na(x.origin)].join('\u0001');
    const v = g.get(k) || [0, 0]; v[0] += (a + b) / 2 / kg; v[1]++; g.set(k, v);
  }
  return [...g].map(([k, v]) => { const p = k.split('\u0001'); return [p[0], p[1], p[2], p[3], v[1], Math.round(v[0] / v[1] * 1e4) / 1e4]; });
}

function parseCsv(txt) {
  const L = txt.split(/\r?\n/).filter(Boolean), h = L[0].split(',');
  return L.slice(1).map(l => { const c = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(s => s.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')); return Object.fromEntries(h.map((k, i) => [k, c[i] ?? ''])); });
}

async function main() {
  const a = process.argv.slice(2), arg = n => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  const file = P.ensureDataFile();
  const D = C.decode(JSON.parse(fs.readFileSync(file, 'utf8'))); D.halw = D.halw || []; D.meta.halwDone = D.meta.halwDone || [];
  const save = () => { const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(C.encode(D))); fs.renameSync(tmp, file); };

  if (arg('--csv')) {
    const rows = parseCsv(fs.readFileSync(arg('--csv'), 'utf8')).filter(x => x.hafta && C.KEEP.has(x.commodity) && C.num(x.usd_kg) != null)
      .map(x => { if (x.market && !D.markets[x.slug_id]) D.markets[x.slug_id] = x.market; return [x.hafta, String(x.slug_id), x.commodity, C.na(x.origin), +x.n || 1, C.num(x.usd_kg)]; });
    D.halw = C.mergeRows(D.halw, rows, 1, 0); save(); console.log(`İçe aktarıldı: ${rows.length} satır`); return;
  }
  const key = process.env.MARS_API_KEY; if (!key) throw new Error('MARS_API_KEY tanımlı değil');
  const now = new Date(), Y = now.getUTCFullYear(), n = +(arg('--years') || 10);
  for (const slug of REPORTS.hal) for (let y = Y - n; y <= Y; y++) {
    const tag = slug + ':' + y; if (y < Y && D.meta.halwDone.includes(tag)) continue;
    const from = new Date(Date.UTC(y, 0, 1)), to = new Date(Math.min(Date.UTC(y, 11, 31), now.getTime()));
    const rows = weekly(await fetchReport(slug, key, from, to, () => {}), slug, D.markets);
    if (rows.length) D.halw = C.mergeRows(D.halw, rows, 1, 0);
    if (y < Y) D.meta.halwDone.push(tag);
    save(); console.log(`  ${D.markets[slug] || slug} ${y}: ${rows.length} haftalık satır`);
  }
  console.log('Tamam. Toplam haftalık satır:', D.halw.length);
}
main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
