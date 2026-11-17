// Restrict an encoded dataset to one product group, for accounts that may only see
// grapes or only citrus. Done on the server because the dashboard receives the
// whole dataset as JSON — hiding things in the page would not stop anyone reading it.
'use strict';
const C = require('./convert');

// Product column per table (see SPEC in convert.js); census rows carry an HS code instead.
// HS 0806.10 = fresh grapes; everything else we track (0805.*) is citrus.
function filterGroup(encoded, group) {
  const wantGrapes = group === 'grapes';
  const grape = c => c === 'Grapes';
  const D = C.decode(encoded);
  D.vol   = D.vol.filter(r => grape(r[3]) === wantGrapes);
  D.price = D.price.filter(r => grape(r[2]) === wantGrapes);
  D.hal   = D.hal.filter(r => grape(r[2]) === wantGrapes);
  D.halw  = D.halw.filter(r => grape(r[2]) === wantGrapes);
  D.cen   = D.cen.filter(r => String(r[2]).startsWith('080610') === wantGrapes);
  return C.encode(D); // dictionary is rebuilt from the kept rows, so no other-product strings leak
}

module.exports = { filterGroup };
