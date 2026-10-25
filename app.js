/* Cash Counter BD — pure logic (Node-testable) + browser UI.
   Money is integer taka; counts are non-negative integers. No floats. */
'use strict';

const DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

function emptyCounts() {
  const c = {};
  DENOMS.forEach(d => { c[d] = 0; });
  return c;
}

function sanitizeCount(v) {
  // Accepts numbers/strings; anything invalid -> 0. Caps at 999999 per denom.
  if (typeof v === 'string') v = v.trim();
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const f = Math.floor(n);
  if (f < 0) return 0;
  return Math.min(f, 999999);
}

function sanitizeCounts(input) {
  const out = emptyCounts();
  if (!input || typeof input !== 'object') return out;
  DENOMS.forEach(d => { out[d] = sanitizeCount(input[d] !== undefined ? input[d] : input[String(d)]); });
  return out;
}

function calcTotals(counts) {
  const clean = sanitizeCounts(counts);
  let total = 0, pieces = 0;
  const rows = DENOMS.map(d => {
    const subtotal = d * clean[d];
    total += subtotal;
    pieces += clean[d];
    return { denom: d, qty: clean[d], subtotal };
  });
  return { counts: clean, rows, total, pieces };
}

function diffToTarget(total, targetRaw) {
  // targetRaw: '' / null -> no target. Returns {hasTarget, target, diff, status}
  if (targetRaw === '' || targetRaw === null || targetRaw === undefined) {
    return { hasTarget: false, target: 0, diff: 0, status: 'none' };
  }
  const t = Number(String(targetRaw).trim());
  if (!Number.isFinite(t) || t < 0 || Math.floor(t) !== t) {
    return { hasTarget: false, target: 0, diff: 0, status: 'invalid' };
  }
  const diff = total - t;
  return { hasTarget: true, target: t, diff, status: diff === 0 ? 'exact' : (diff < 0 ? 'short' : 'over') };
}

function validateImport(data) {
  // Strict: must be {version:1, counts:{...}, savedAt?} or a session list export.
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'not-object' };
  if (data.version !== 1) return { ok: false, error: 'bad-version' };
  if (!data.counts || typeof data.counts !== 'object') return { ok: false, error: 'bad-counts' };
  // Reject any denom key outside the known set or non-integer qty.
  for (const k of Object.keys(data.counts)) {
    if (!DENOMS.includes(Number(k))) return { ok: false, error: 'unknown-denom' };
    const v = data.counts[k];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 999999) return { ok: false, error: 'bad-qty' };
  }
  return { ok: true, counts: sanitizeCounts(data.counts) };
}

function formatTaka(n) {
  return '৳' + Number(n).toLocaleString('en-US');
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBnDigits(str) {
  return String(str).replace(/[0-9]/g, ch => BN_DIGITS[Number(ch)]);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DENOMS, emptyCounts, sanitizeCount, sanitizeCounts, calcTotals, diffToTarget, validateImport, formatTaka, toBnDigits };
}

/* ---------------- Browser UI ---------------- */
if (typeof document !== 'undefined') {
  const I18N = {
    en: {
      title: 'Cash Counter BD', tagline: 'Count Bangladeshi taka notes & coins — fast, exact, offline.',
      countTab: 'Count', sessionsTab: 'Sessions', dataTab: 'Data',
      denomHead: 'Denomination', qtyHead: 'Quantity', subHead: 'Subtotal',
      totalAmount: 'Total amount', totalPieces: 'Total pieces',
      targetLabel: 'Expected / target amount (৳)', targetHint: 'Leave empty if you have no target.',
      targetInvalid: 'Enter a whole taka amount (0 or more).',
      statusNone: 'Enter a target to compare.', statusExact: 'Exact match — counted amount equals the target.',
      statusShort: 'SHORT by', statusOver: 'OVER by',
      clearBtn: 'Clear count', saveBtn: 'Save session', sessionName: 'Session name',
      sessionNameHint: 'e.g. Morning shift drawer', savedEmpty: 'No saved sessions yet.',
      loadBtn: 'Load', delBtn: 'Delete', savedAt: 'Saved',
      exportBtn: 'Export count (JSON)', importBtn: 'Import count (JSON)', eraseBtn: 'Erase all data',
      eraseConfirm: 'Type DELETE to erase all counts, sessions and settings.',
      importOk: 'Import successful.', importBad: 'Import rejected: file is not a valid Cash Counter BD export. Your data is unchanged.',
      langBtn: 'বাংলা', digitsLabel: 'Bengali digits', footer: 'Offline personal tool. Counts are stored only in this browser. Not a bank or accounting app.',
      noteLabel: 'Notes & coins in circulation', noteText: '1000, 500, 200, 100, 50, 20, 10, 5 taka notes and 2, 1 taka coins.'
    },
    bn: {
      title: 'ক্যাশ কাউন্টার বিডি', tagline: 'বাংলাদেশি টাকার নোট ও কয়েন গুনুন — দ্রুত, নির্ভুল, অফলাইনে।',
      countTab: 'গণনা', sessionsTab: 'সেশন', dataTab: 'ডেটা',
      denomHead: 'মূল্যমান', qtyHead: 'পরিমাণ', subHead: 'উপমোট',
      totalAmount: 'মোট টাকা', totalPieces: 'মোট সংখ্যা',
      targetLabel: 'প্রত্যাশিত / লক্ষ্য পরিমাণ (৳)', targetHint: 'লক্ষ্য না থাকলে খালি রাখুন।',
      targetInvalid: 'পূর্ণ টাকার পরিমাণ দিন (০ বা বেশি)।',
      statusNone: 'তুলনা করতে লক্ষ্য লিখুন।', statusExact: 'হুবহু মিলেছে — গোনা টাকা লক্ষ্যের সমান।',
      statusShort: 'কম আছে', statusOver: 'বেশি আছে',
      clearBtn: 'গণনা মুছুন', saveBtn: 'সেশন সংরক্ষণ', sessionName: 'সেশনের নাম',
      sessionNameHint: 'যেমন: সকালের শিফটের ড্রয়ার', savedEmpty: 'এখনো কোনো সেশন সংরক্ষিত হয়নি।',
      loadBtn: 'লোড', delBtn: 'মুছুন', savedAt: 'সংরক্ষিত',
      exportBtn: 'গণনা এক্সপোর্ট (JSON)', importBtn: 'গণনা ইমপোর্ট (JSON)', eraseBtn: 'সব ডেটা মুছুন',
      eraseConfirm: 'সব গণনা, সেশন ও সেটিং মুছতে DELETE লিখুন।',
      importOk: 'ইমপোর্ট সফল হয়েছে।', importBad: 'ইমপোর্ট বাতিল: ফাইলটি বৈধ ক্যাশ কাউন্টার বিডি এক্সপোর্ট নয়। আপনার ডেটা অপরিবর্তিত আছে।',
      langBtn: 'English', digitsLabel: 'বাংলা সংখ্যা', footer: 'অফলাইন ব্যক্তিগত টুল। গণনা শুধু এই ব্রাউজারে সংরক্ষিত হয়। এটি ব্যাংক বা হিসাবরক্ষণ অ্যাপ নয়।',
      noteLabel: 'প্রচলিত নোট ও কয়েন', noteText: '১০০০, ৫০০, ২০০, ১০০, ৫০, ২০, ১০, ৫ টাকার নোট এবং ২, ১ টাকার কয়েন।'
    }
  };

  const LS_COUNTS = 'cash-counter-bd:counts';
  const LS_SESSIONS = 'cash-counter-bd:sessions';
  const LS_LANG = 'cash-counter-bd:lang';
  const LS_DIGITS = 'cash-counter-bd:digits';

  let lang = localStorage.getItem(LS_LANG) || 'en';
  let useBnDigits = localStorage.getItem(LS_DIGITS) === '1';
  let counts = (() => { try { return sanitizeCounts(JSON.parse(localStorage.getItem(LS_COUNTS) || '{}')); } catch (e) { return emptyCounts(); } })();
  let sessions = (() => { try { const s = JSON.parse(localStorage.getItem(LS_SESSIONS) || '[]'); return Array.isArray(s) ? s : []; } catch (e) { return []; } })();
  let targetRaw = '';

  const $ = id => document.getElementById(id);
  const fmt = n => {
    const s = Number(n).toLocaleString('en-US');
    return useBnDigits ? toBnDigits(s) : s;
  };
  const money = n => '৳' + fmt(n);

  function render() {
    const t = I18N[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t[el.dataset.i18n] || el.textContent; });
    $('langBtn').textContent = t.langBtn;
    $('digitsLabel').textContent = t.digitsLabel;
    $('digitsCheck').checked = useBnDigits;
    $('targetLabel').textContent = t.targetLabel;
    $('targetHint').textContent = t.targetHint;
    $('sessionName').placeholder = t.sessionNameHint;
    $('eraseHint').textContent = t.eraseConfirm;

    const totals = calcTotals(counts);
    const grid = $('grid'); grid.innerHTML = '';
    totals.rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<span class="denom">' + money(r.denom) + '</span>' +
        '<span class="step"><button type="button" data-act="dec" data-d="' + r.denom + '" aria-label="decrease">−</button>' +
        '<input type="number" min="0" max="999999" step="1" inputmode="numeric" data-d="' + r.denom + '" value="' + r.qty + '" aria-label="count">' +
        '<button type="button" data-act="inc" data-d="' + r.denom + '" aria-label="increase">+</button></span>' +
        '<span class="sub">' + money(r.subtotal) + '</span>';
      grid.appendChild(row);
    });
    grid.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const d = Number(b.dataset.d);
      counts[d] = Math.max(0, Math.min(999999, (counts[d] || 0) + (b.dataset.act === 'inc' ? 1 : -1)));
      persistCounts(); render();
    }));
    grid.querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => {
      counts[Number(inp.dataset.d)] = sanitizeCount(inp.value);
      persistCounts(); render();
    }));

    $('totalAmount').textContent = money(totals.total);
    $('totalPieces').textContent = fmt(totals.pieces) + (lang === 'bn' ? 'টি' : ' pcs');
    const d = diffToTarget(totals.total, targetRaw);
    const st = $('targetStatus');
    if (d.status === 'invalid') { st.textContent = t.targetInvalid; st.className = 'status bad'; }
    else if (!d.hasTarget) { st.textContent = t.statusNone; st.className = 'status'; }
    else if (d.status === 'exact') { st.textContent = '✓ ' + t.statusExact; st.className = 'status good'; }
    else if (d.status === 'short') { st.textContent = '⚠ ' + t.statusShort + ' ' + money(-d.diff); st.className = 'status bad'; }
    else { st.textContent = '⚠ ' + t.statusOver + ' ' + money(d.diff); st.className = 'status warn'; }

    const list = $('sessionList'); list.innerHTML = '';
    if (!sessions.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = t.savedEmpty; list.appendChild(p); }
    sessions.slice().reverse().forEach((s, idx) => {
      const realIdx = sessions.length - 1 - idx;
      const div = document.createElement('div'); div.className = 'session';
      const st2 = calcTotals(s.counts);
      div.innerHTML = '<div><strong>' + escapeHtml(s.name) + '</strong><br><small>' + t.savedAt + ' ' + escapeHtml(s.savedAt) + ' — ' + money(st2.total) + ' · ' + fmt(st2.pieces) + '</small></div>' +
        '<span><button type="button" data-load="' + realIdx + '">' + t.loadBtn + '</button> ' +
        '<button type="button" data-del="' + realIdx + '">' + t.delBtn + '</button></span>';
      list.appendChild(div);
    });
    list.querySelectorAll('[data-load]').forEach(b => b.addEventListener('click', () => { counts = sanitizeCounts(sessions[Number(b.dataset.load)].counts); persistCounts(); render(); showTab('count'); }));
    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { sessions.splice(Number(b.dataset.del), 1); persistSessions(); render(); }));
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function persistCounts() { localStorage.setItem(LS_COUNTS, JSON.stringify(counts)); }
  function persistSessions() { localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions)); }
  function showTab(name) {
    document.querySelectorAll('.tabbtn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + name));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tabbtn').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $('langBtn').addEventListener('click', () => { lang = lang === 'en' ? 'bn' : 'en'; localStorage.setItem(LS_LANG, lang); render(); });
    $('digitsCheck').addEventListener('change', e => { useBnDigits = e.target.checked; localStorage.setItem(LS_DIGITS, useBnDigits ? '1' : '0'); render(); });
    $('targetInput').addEventListener('input', e => { targetRaw = e.target.value; render(); });
    $('clearBtn').addEventListener('click', () => { counts = emptyCounts(); targetRaw = ''; $('targetInput').value = ''; persistCounts(); render(); });
    $('saveBtn').addEventListener('click', () => {
      const name = $('sessionName').value.trim();
      if (!name) { $('sessionMsg').textContent = lang === 'bn' ? 'সেশনের নাম দিন।' : 'Please enter a session name.'; return; }
      sessions.push({ name, counts: Object.assign({}, counts), savedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') });
      persistSessions(); $('sessionName').value = ''; $('sessionMsg').textContent = lang === 'bn' ? 'সংরক্ষিত হয়েছে।' : 'Session saved.'; render();
    });
    $('exportBtn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({ version: 1, counts: sanitizeCounts(counts), exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cash-counter-bd.json'; a.click(); URL.revokeObjectURL(a.href);
    });
    $('importFile').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { const v = validateImport(JSON.parse(reader.result)); if (!v.ok) throw new Error(v.error); counts = v.counts; persistCounts(); $('dataMsg').textContent = I18N[lang].importOk; render(); }
        catch (err) { $('dataMsg').textContent = I18N[lang].importBad; }
      };
      reader.readAsText(f); e.target.value = '';
    });
    $('eraseBtn').addEventListener('click', () => {
      if ($('eraseInput').value.trim() !== 'DELETE') { $('dataMsg').textContent = lang === 'bn' ? 'মুছতে DELETE লিখুন।' : 'Type DELETE to confirm erase.'; return; }
      localStorage.removeItem(LS_COUNTS); localStorage.removeItem(LS_SESSIONS);
      counts = emptyCounts(); sessions = []; targetRaw = ''; $('targetInput').value = ''; $('eraseInput').value = ''; render();
    });
    render();
  });
}
