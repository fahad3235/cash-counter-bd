'use strict';
const assert = require('node:assert');
const { DENOMS, emptyCounts, sanitizeCount, sanitizeCounts, calcTotals, diffToTarget, validateImport, formatTaka, toBnDigits } = require('../app.js');

let n = 0;
function check(name, fn) { fn(); n++; console.log('ok -', name); }

// totals
check('empty totals are zero', () => { const t = calcTotals({}); assert.strictEqual(t.total, 0); assert.strictEqual(t.pieces, 0); });
check('hand case: 2x1000 + 3x500 + 1x200 + 4x50 = 3900, 10 pcs', () => {
  const t = calcTotals({ 1000: 2, 500: 3, 200: 1, 50: 4 });
  assert.strictEqual(t.total, 3900); assert.strictEqual(t.pieces, 10);
  assert.strictEqual(t.rows.find(r => r.denom === 500).subtotal, 1500);
});
check('all denoms x1 = 1888', () => { const c = {}; DENOMS.forEach(d => c[d] = 1); assert.strictEqual(calcTotals(c).total, 1888); });
check('coins only: 7x2 + 3x1 = 17', () => { assert.strictEqual(calcTotals({ 2: 7, 1: 3 }).total, 17); });
check('sanitize: negative -> 0, decimal floors, junk -> 0, cap 999999', () => {
  assert.strictEqual(sanitizeCount(-5), 0); assert.strictEqual(sanitizeCount('3.9'), 3);
  assert.strictEqual(sanitizeCount('abc'), 0); assert.strictEqual(sanitizeCount(''), 0);
  assert.strictEqual(sanitizeCount(2000000), 999999);
});
check('target: exact / short / over / none / invalid', () => {
  assert.strictEqual(diffToTarget(3900, 3900).status, 'exact');
  assert.deepStrictEqual([diffToTarget(3900, 5000).status, diffToTarget(3900, 5000).diff], ['short', -1100]);
  assert.deepStrictEqual([diffToTarget(3900, 3000).status, diffToTarget(3900, 3000).diff], ['over', 900]);
  assert.strictEqual(diffToTarget(3900, '').status, 'none');
  assert.strictEqual(diffToTarget(3900, '-5').status, 'invalid');
  assert.strictEqual(diffToTarget(3900, '10.5').status, 'invalid');
});
check('import: valid accepted, unknown denom / bad qty / bad version rejected', () => {
  assert.strictEqual(validateImport({ version: 1, counts: { 1000: 2, 50: 1 } }).ok, true);
  assert.strictEqual(validateImport({ version: 1, counts: { 300: 1 } }).ok, false);
  assert.strictEqual(validateImport({ version: 1, counts: { 1000: -1 } }).ok, false);
  assert.strictEqual(validateImport({ version: 2, counts: {} }).ok, false);
  assert.strictEqual(validateImport(null).ok, false);
  assert.strictEqual(validateImport({ version: 1, counts: { 1000: 1.5 } }).ok, false);
});
check('format + Bengali digits', () => {
  assert.strictEqual(formatTaka(3900), '৳3,900');
  assert.strictEqual(toBnDigits('3900'), '৩৯০০');
  assert.strictEqual(toBnDigits('1,234'), '১,২৩৪');
});
check('denom set is exactly the 10 circulating values', () => {
  assert.deepStrictEqual(DENOMS, [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]);
});
console.log(n + ' unit checks passed');
