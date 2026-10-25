'use strict';
// Raw-CDP smoke test (no puppeteer dependency). Usage: node tests/smoke.js <file-url>
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const url = process.argv[2];
const PORT = 9333;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cash-smoke-'));
const chrome = spawn('/opt/meta-chromium/chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, 'about:blank',
], { stdio: 'ignore' });

let ws, nextId = 1;
const pending = new Map();
const errors = [];
function send(method, params = {}) {
  const id = nextId++;
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error('CDP timeout ' + method)); } }, 15000);
  });
}
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval failed: ' + expr + ' :: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
}
let passed = 0;
function check(name, cond, extra = '') {
  if (!cond) throw new Error('FAIL: ' + name + ' ' + extra);
  passed++; console.log('ok -', name);
}
async function waitFor(cond, label) {
  for (let i = 0; i < 50; i++) {
    try { if (await cond()) return; } catch (e) { /* retry */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('timeout waiting: ' + label);
}
(async () => {
  // wait for DevTools endpoint
  let targets;
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.length) break; } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }
  const wsUrl = targets[0].webSocketDebuggerUrl;
  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); p.res(d.result); }
    if (d.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(d.params.exceptionDetails).slice(0, 200));
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console.error: ' + JSON.stringify(d.params.args).slice(0, 200));
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url });
  await waitFor(async () => (await ev('document.readyState')) === 'complete', 'page load');
  await waitFor(async () => (await ev('document.querySelectorAll("#grid .row").length')) === 10, 'grid rows');
  check('title', (await ev('document.title')).includes('Cash Counter BD'));
  check('10 denomination rows', (await ev('document.querySelectorAll("#grid .row").length')) === 10);
  check('initial total 0', (await ev('document.getElementById("totalAmount").textContent')) === '৳0');

  // set 2x1000 + 3x500 via inputs + change events
  await ev(`(()=>{const set=(d,v)=>{const i=document.querySelector('#grid input[data-d="'+d+'"]');i.value=v;i.dispatchEvent(new Event('change',{bubbles:true}));};set(1000,2);set(500,3);return true;})()`);
  check('2x1000+3x500 = ৳3,500', (await ev('document.getElementById("totalAmount").textContent')) === '৳3,500');
  check('pieces = 5', (await ev('document.getElementById("totalPieces").textContent')).includes('5'));

  // target exact then short
  await ev(`(()=>{const t=document.getElementById('targetInput');t.value=3500;t.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  check('target exact status', (await ev('document.getElementById("targetStatus").textContent')).includes('Exact'));
  await ev(`(()=>{const t=document.getElementById('targetInput');t.value=4000;t.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  check('target short by ৳500', (await ev('document.getElementById("targetStatus").textContent')).includes('500'));

  // save session + persistence across reload of grid state via localStorage
  await ev(`(()=>{document.querySelector('[data-tab="sessions"]').click();document.getElementById('sessionName').value='Smoke drawer';document.getElementById('saveBtn').click();return true;})()`);
  await waitFor(async () => (await ev('document.getElementById("sessionList").textContent')).includes('Smoke drawer'), 'session saved');
  check('session saved and listed', true);
  check('counts persisted in localStorage', (await ev('localStorage.getItem("cash-counter-bd:counts")')).includes('"1000":2'));

  // language toggle
  await ev(`(()=>{document.getElementById('langBtn').click();return true;})()`);
  check('BN title after toggle', (await ev('document.querySelector("header h1").textContent')) === 'ক্যাশ কাউন্টার বিডি');

  // 390px mobile: no horizontal overflow
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise(r => setTimeout(r, 500));
  const sw = await ev('document.documentElement.scrollWidth');
  check('390px no horizontal overflow', sw <= 390, 'scrollWidth=' + sw);

  check('zero page/console errors', errors.length === 0, errors.join(' | '));
  console.log(passed + ' smoke checks passed');
  process.exitCode = 0;
})().catch(e => { console.error('SMOKE FAILED:', e.message); process.exitCode = 1; })
  .finally(() => { try { ws && ws.close(); } catch (e) {} chrome.kill(); });
