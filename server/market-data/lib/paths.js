// Where the live data file lives, and CLI env loading.
// The bundled data/market-data.json is only a SEED. The live file must sit
// outside the git checkout (UPLOADS_DIR, e.g. /var/uploads/citrus) — otherwise
// every `git pull` would overwrite the daily-updated data with the seed.
'use strict';
const fs = require('fs');
const path = require('path');

// CLI runs (node market-data/update.js) don't go through the server's dotenv:
// read server/.env here for any variable that isn't already set.
(function loadServerEnv() {
  const f = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
})();

const SEED = path.join(__dirname, '..', 'data', 'market-data.json');

function dataFile() {
  return process.env.MARKET_DATA_FILE
    || path.join(process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads'), 'market-data.json');
}

// Path of the live file, creating it from the seed on first use.
function ensureDataFile() {
  const f = dataFile();
  if (!fs.existsSync(f)) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.copyFileSync(SEED, f);
  }
  return f;
}

module.exports = { dataFile, ensureDataFile, SEED };
