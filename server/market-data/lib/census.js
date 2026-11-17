// ABD Census Bureau ithalat değeri istemcisi (aylık, HS 0805 ve 0806.10). Node 18+.
'use strict';

const URL_ = 'https://api.census.gov/data/timeseries/intltrade/imports/hs';
const CODES = ['080510', '080521', '080522', '080529', '080540', '080550', '080610'];
const FIELDS = ['CTY_CODE', 'CTY_NAME', 'I_COMMODITY', 'I_COMMODITY_SDESC', 'GEN_VAL_MO', 'GEN_CIF_MO', 'GEN_QY1_MO', 'UNIT_QY1',
  'CNT_VAL_MO', 'CNT_WGT_MO', 'VES_VAL_MO', 'VES_WGT_MO'];

async function query(params) {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%2C/g, ',').replace(/%2A/g, '*')}`).join('&');
  try {
    const r = await fetch(`${URL_}?${qs}`, { headers: { Accept: 'application/json' } });
    if (r.status === 204) return { rows: [] };
    const t = (await r.text()).trim();
    if (!r.ok) return { err: `HTTP ${r.status}: ${t.slice(0, 200)}` };
    if (!t) return { rows: [] };
    if (t.startsWith('<')) return { err: 'Census HTML döndü (CENSUS_API_KEY geçersiz/eksik olabilir)' };
    return { rows: JSON.parse(t) };
  } catch (e) { return { err: e.message }; }
}

// from/to: 'YYYY-MM'
async function fetchCensus(apiKey, from, to, log = console.log) {
  const out = [];
  for (const code of CODES) {
    const tries = [
      [FIELDS.concat(['DISTRICT', 'DIST_NAME']), { COMM_LVL: 'HS10', I_COMMODITY: code + '*' }],
      [FIELDS, { COMM_LVL: 'HS10', I_COMMODITY: code + '*' }],
      [FIELDS.concat(['DISTRICT', 'DIST_NAME']), { COMM_LVL: 'HS6', I_COMMODITY: code }],
    ];
    let res = null;
    for (const [f, extra] of tries) {
      const r = await query({ get: f.join(','), time: `from ${from} to ${to}`, key: apiKey, ...extra });
      if (r.err) { log(`  census ${code}: ${r.err.slice(0, 120)}`); continue; }
      if (r.rows.length > 1) { res = r.rows; break; }
    }
    if (!res) { log(`  census ${code}: veri yok`); continue; }
    const h = res[0];
    for (const row of res.slice(1)) {
      const d = {}; h.forEach((k, i) => { if (!(k in d)) d[k] = row[i]; });
      const cc = d.CTY_CODE || '', nm = String(d.CTY_NAME || '').toUpperCase();
      if (!/^\d+$/.test(cc) || cc.startsWith('0') || nm.includes('TOTAL')) continue; // ülke grupları / toplamlar
      out.push(d);
    }
    log(`  census ${code}: ${res.length - 1} satır`);
  }
  return out;
}

module.exports = { fetchCensus };
