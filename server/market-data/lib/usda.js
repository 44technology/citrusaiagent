// USDA My Market News (MARS) API istemcisi. Node 18+ (yerleşik fetch). Ek paket gerekmez.
'use strict';

const BASE = 'https://marsapi.ams.usda.gov/services/v1.2';
const MAX_DAYS = 180; // API tek istekte en fazla ~180 günlük aralık kabul ediyor

const pad = n => String(n).padStart(2, '0');
const us = d => `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${d.getUTCFullYear()}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Yanıtın içindeki tüm "results" listelerini (bölümler dahil) düz listeye çevirir
function collect(obj) {
  const out = [];
  if (Array.isArray(obj)) {
    if (obj.length && obj.every(x => x && typeof x === 'object' && !Array.isArray(x)) && !obj.some(x => 'results' in x)) out.push(...obj);
    else obj.forEach(x => out.push(...collect(x)));
  } else if (obj && typeof obj === 'object') {
    if (Array.isArray(obj.results)) {
      const sec = obj.reportSection || obj.report_section || '';
      obj.results.forEach(r => { if (r && typeof r === 'object') out.push(sec && !('report_section' in r) ? { ...r, report_section: sec } : r); });
    } else Object.values(obj).forEach(v => { if (v && typeof v === 'object') out.push(...collect(v)); });
  }
  return out;
}

async function get(path, apiKey, params, tries = 3) {
  let url = BASE + '/' + path.replace(/^\//, '').split('/').map(encodeURIComponent).join('/');
  if (params) url += '?' + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%3B/g, ';').replace(/%3A/g, ':').replace(/%2C/g, ',').replace(/%3D/g, '=').replace(/%2F/g, '/')}`).join('&');
  const auth = 'Basic ' + Buffer.from(apiKey + ':').toString('base64');
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
      if (r.status === 401 || r.status === 403) throw Object.assign(new Error(`USDA yetki hatası (${r.status}) — MARS_API_KEY'i kontrol edin`), { fatal: true });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text(); return t ? JSON.parse(t) : null;
    } catch (e) { if (e.fatal) throw e; last = e; await sleep(2000 * (i + 1)); }
  }
  throw new Error(`USDA isteği başarısız: ${url} (${last && last.message})`);
}

// Bir rapor için [from, to] tarih aralığındaki tüm kayıtlar (180 günlük dilimlerle)
async function fetchReport(slug, apiKey, from, to, log = console.log) {
  const all = [];
  for (let d = new Date(from); d <= to;) {
    const end = new Date(Math.min(d.getTime() + (MAX_DAYS - 1) * 864e5, to.getTime()));
    let rows = [];
    for (const field of ['report_begin_date', 'report_date']) {
      const data = await get(`reports/${slug}`, apiKey, { q: `${field}=${us(d)}:${us(end)}`, allSections: 'true' });
      rows = data ? collect(data) : [];
      if (rows.length) break;
    }
    rows.forEach(r => { if (r.slug_id == null) r.slug_id = slug; });
    log(`  rapor ${slug}: ${us(d)} – ${us(end)} → ${rows.length} kayıt`);
    all.push(...rows);
    d = new Date(end.getTime() + 864e5);
  }
  return all;
}

module.exports = { fetchReport, collect };
