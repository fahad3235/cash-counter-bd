# Cash Counter BD — verified test results
Date: 2026-10-25 (Asia/Dhaka), run #130 (09:00 slot)

## Unit tests — 9/9 passed
`node tests/test_logic.js` — pure functions in app.js:
- empty totals zero; hand case 2x1000+3x500+1x200+4x50 = 3900, 10 pcs
- all 10 denoms x1 = 1888; coins only 7x2+3x1 = 17
- sanitize: negative -> 0, decimals floored, junk -> 0, cap 999999
- target: exact / short (-1100) / over (+900) / none / invalid (negative, fractional)
- import validation: valid accepted; unknown denom, negative qty, fractional qty, bad version, null all rejected
- formatTaka(3900) = ৳3,900; Bengali digits 3900 -> ৩৯০০

## Headless-Chrome smoke — 12/12 passed
`node tests/smoke.js` (raw CDP, /opt/meta-chromium/chrome, file://):
title, 10 denomination rows, initial total ৳0, 2x1000+3x500 = ৳3,500, pieces 5,
target exact status, target short by ৳500, session saved + listed, counts persisted
in localStorage, BN title after language toggle, 390px no horizontal overflow,
zero page/console errors.

## Repairs
0 app bugs. No repair cycles needed.
