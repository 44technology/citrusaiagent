// Sweet Fresh – Market Data: dönüştürme, birleştirme ve sıkıştırma (encode/decode)
// Bu dosya panodaki (dashboard.html) mantıkla birebir aynıdır. Değiştirirseniz ikisini birlikte değiştirin.
'use strict';

const KEEP = new Set(['Grapes', 'Oranges', 'Royal Mandarin', 'Tangerines', 'Mandarins', 'Clementines', 'Lemons',
  'Limes', 'Grapefruit', 'Tangelos', 'Minneolas', 'Pomelos', 'Blood Orange']);

// Her tablonun hangi sütunları metin (sözlükle sıkıştırılır)
const SPEC = {
  vol:   [1, 1, 1, 1, 1, 1, 1, 0],                         // [tarih, rapor_baslangic, slug, ürün, menşe, district, taşıma, lb]
  price: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1],
  dom:   [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1],    // yurt içi çıkış (shipping point) fiyatları — price ile aynı sütunlar, ithal ortalamaya karışmaz    // [tarih, slug, ürün, district, çeşit, ambalaj, boy, low, high, mlow, mhigh, arz, talep, piyasa, not]
  hal:   [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1],             // [tarih, slug, ürün, menşe, çeşit, ambalaj, boylar, low, high, ort, piyasa, kalite]
  cen:   [1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  halw:  [1, 1, 1, 1, 0, 0],                               // haftalık hal geçmişi: [hafta(pazartesi), slug, ürün, menşe, kayıt sayısı, ort. $/kg]             // [ay, ülke, hs10, bölge, değer, cif, miktar, birim, kont.değer, kont.ağırlık, gemi.değer, gemi.ağırlık]
};

const isoUS = s => { const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[1]}-${m[2]}` : ''; };
const num = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? null : n; };
const na = v => { v = String(v ?? '').trim(); return v === 'N/A' ? '' : v; };

// USDA hareket (Movement) kayıtları -> vol satırları
function convVol(rows) {
  return rows.filter(x => String(x['import/Export'] || '').startsWith('I') && KEEP.has(x.commodity)
      && !String(x.asw_Flag || '').includes('Week Ending') && !/dried|frozen/i.test(x.properties || ''))
    .map(x => { const rb = isoUS(x.report_begin_date);
      return [isoUS(x.asw_date) || rb, rb, String(x.slug_id || ''), x.commodity, x.origin || '', x.district || '', x.trans_Mode || '', num(x['1 lb units']) || 0]; })
    .filter(r => r[0] && r[1]);
}

// USDA ithal meyve FOB fiyatları (2401) -> price satırları
function convPrice(rows) {
  return rows.filter(x => KEEP.has(x.commodity)).map(x => [isoUS(x.report_date), String(x.slug_id || ''), x.commodity, x.district || '',
    na(x.var), na(x.pkg), na(x.item_size), num(x.low_price), num(x.high_price), num(x.mostly_low_price), num(x.mostly_high_price),
    x.supply_tone_comments || '', x.demand_tone_comments || '', x.market_tone_comments || '', x.rep_cmt || '']).filter(r => r[0]);
}

// Karışık FOB raporları (2402 Phoenix + McAllen, 2390 Fresno): her satırda import_export_flag var.
// 'I' (ithal) satırlar FOB (price) tablosuna menşe ülkesiyle, 'D' (yurt içi) satırlar ayrı 'dom' tablosuna gider.
const flagOf = x => String(x.import_export_flag || '').trim().toUpperCase();
function impDistrict(d) { // "MEXICO CROSSINGS THROUGH TEXAS" -> "MEXICO IMPORTS - CROSSINGS THROUGH TEXAS" (panonun menşe ayrıştırıcısı " IMPORTS" arar)
  const s = String(d || '').trim();
  if (/ IMPORTS/i.test(s)) return s;
  const m = s.match(/^(.+?) CROSSINGS\b(.*)$/i);
  return m ? `${m[1]} IMPORTS - CROSSINGS${m[2]}` : s;
}
function splitMixed(rows) {
  const imp = rows.filter(x => flagOf(x).startsWith('I')).map(x => ({ ...x, district: impDistrict(x.district) }));
  const dom = rows.filter(x => flagOf(x).startsWith('D'));
  return { imp: convPrice(imp), dom: convPrice(dom) };
}

// USDA hal (Terminal Market) fiyatları -> günlük ortalama hal satırları (organik hariç, kalite ayrı)
function convHal(rows, markets) {
  const agg = new Map();
  rows.forEach(x => {
    if (!KEEP.has(x.commodity) || x.organic === 'Y') return;
    const lo = num(x.low_price), hi = num(x.high_price), ml = num(x.mostly_low_price), mh = num(x.mostly_high_price);
    const a = ml ?? lo, b = mh ?? hi; if (a == null || b == null) return;
    const slug = String(x.slug_id || '');
    markets[slug] = String(x.market_location_name || slug).replace(' Terminal Market', '').trim();
    const k = [isoUS(x.report_date), slug, x.commodity, na(x.origin), na(x.variety), na(x.package), na(x.grade)].join('\u0001');
    let g = agg.get(k); if (!g) { g = { sizes: [], lo: lo ?? a, hi: hi ?? b, s: 0, n: 0, tone: '' }; agg.set(k, g); }
    const sz = na(x.item_size); if (sz && !g.sizes.includes(sz)) g.sizes.push(sz);
    g.lo = Math.min(g.lo, lo ?? a); g.hi = Math.max(g.hi, hi ?? b); g.s += (a + b) / 2; g.n++;
    if (!g.tone && x.market_tone_comments) g.tone = x.market_tone_comments;
  });
  return [...agg.entries()].map(([k, g]) => { const p = k.split('\u0001');
    return [p[0], p[1], p[2], p[3], p[4], p[5], g.sizes.join(', '), g.lo, g.hi, Math.round(g.s / g.n * 1000) / 1000, g.tone, p[6] || '']; })
    .filter(r => r[0]);
}

// Census ithalat değeri -> cen satırları
function convCen(rows) {
  return rows.filter(x => x.time && x.I_COMMODITY).map(x => [x.time, x.CTY_NAME || '', x.I_COMMODITY, x.DIST_NAME || '',
    num(x.GEN_VAL_MO) || 0, num(x.GEN_CIF_MO) || 0, num(x.GEN_QY1_MO) || 0, x.UNIT_QY1 || '',
    num(x.CNT_VAL_MO) || 0, num(x.CNT_WGT_MO) || 0, num(x.VES_VAL_MO) || 0, num(x.VES_WGT_MO) || 0]);
}

// Aynı rapor (slug) için, yeni gelen tarih aralığındaki eski kayıtları silip yenilerini koyar.
function mergeRows(old, neu, slugI, keyI) {
  const rng = {};
  neu.forEach(r => { const s = slugI == null ? '*' : r[slugI], k = r[keyI]; const g = rng[s] || (rng[s] = [k, k]); if (k < g[0]) g[0] = k; if (k > g[1]) g[1] = k; });
  const kept = old.filter(r => { const g = rng[slugI == null ? '*' : r[slugI]]; return !(g && r[keyI] >= g[0] && r[keyI] <= g[1]); });
  return kept.concat(neu).sort((a, b) => a[keyI] < b[keyI] ? -1 : a[keyI] > b[keyI] ? 1 : 0);
}

function decode(E) {
  const d = E.dict || []; const o = { meta: E.meta || {}, markets: E.markets || {} };
  for (const t in SPEC) { const sp = SPEC[t]; o[t] = (E[t] || []).map(r => r.map((c, i) => sp[i] ? d[c] : c)); }
  return o;
}
function encode(D) {
  const dic = [], idx = new Map();
  const s = v => { v = v || ''; if (!idx.has(v)) { idx.set(v, dic.length); dic.push(v); } return idx.get(v); };
  const o = { v: 2, meta: D.meta || {}, markets: D.markets || {}, dict: dic };
  for (const t in SPEC) { const sp = SPEC[t]; o[t] = (D[t] || []).map(r => r.map((c, i) => sp[i] ? s(c) : c)); }
  return o;
}

module.exports = { KEEP, SPEC, isoUS, num, na, convVol, convPrice, splitMixed, convHal, convCen, mergeRows, decode, encode };
