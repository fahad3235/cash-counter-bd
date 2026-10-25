# Cash Counter BD

Count Bangladeshi taka notes and coins — fast, exact, and fully offline. Built for
shopkeepers, cashiers, and anyone closing a cash drawer: tap in how many of each
denomination you have, see the total instantly, and compare it against an expected
amount to spot a shortage or surplus before you close up.

## Features

- **All 10 circulating denominations** — 1000, 500, 200, 100, 50, 20, 10, 5 taka
  notes and 2, 1 taka coins, with +/- steppers and direct quantity entry.
- **Live totals** — total amount and total piece count update on every change;
  money is integer taka, so there are no floating-point rounding errors.
- **Target comparison** — enter an expected amount and get an instant
  Exact / SHORT by / OVER by verdict.
- **Saved sessions** — name and save a count (e.g. "Morning shift drawer"),
  reload it later, or delete it. Counts and sessions persist in localStorage.
- **Export / import** — download the current count as JSON; import it back with
  strict validation (unknown denominations, negative or fractional quantities,
  and wrong-format files are rejected with your data untouched).
- **Erase with confirmation** — clear-all requires typing `DELETE`.
- **Bilingual EN/বাংলা** — full interface toggle, persisted, plus an optional
  Bengali-digit display.
- **Mobile-first** — verified at 390px width with no horizontal overflow.
- **Zero network requests** — a single static page; nothing leaves the browser.

## Stack

Vanilla HTML, CSS, and JavaScript. No frameworks, no build step, no dependencies.

## Run locally

```sh
# any static server, or just open the file:
open index.html
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Testing

```sh
node tests/test_logic.js   # pure-logic unit checks (totals, target diff, import validation)
node tests/smoke.js "file://$(pwd)/index.html"   # headless-Chromium CDP smoke test
```

See [TEST_RESULTS.md](TEST_RESULTS.md) for the verified results.

## Limitations

- This is a personal counting aid, not a bank, POS, or accounting system. It does
  not detect counterfeit notes and does not connect to any cash drawer hardware.
- Denominations are the notes/coins in general circulation in Bangladesh at the
  time of writing; if Bangladesh Bank issues or withdraws a denomination, the
  `DENOMS` list in `app.js` is the single place to update.
- Data lives in the browser's localStorage — clearing site data erases counts
  and sessions. Use Export for a backup.

## Status

MVP complete and verified: unit + headless-Chrome smoke tests green, zero
console/page errors. Published as a public GitHub repo with GitHub Pages.
