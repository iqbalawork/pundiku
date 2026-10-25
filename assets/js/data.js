let loadingData = false;
let inFlightWrites = 0;
let writeOverlap = false;
let lastSyncAt = 0;

const PICKERS = {
  inType: {
    title: 'Tipe rekening', label: 'inTypeLabel', def: 'Semua tipe', suffix: 'tipe',
    arr: () => selectedInTypes,
    options: () => [...new Set(rawAccounts.map((a) => a.type).filter(Boolean))].map((t) => ({ value: t, label: t }))
  },
  inAcc: {
    title: 'Rekening', label: 'inAccLabel', def: 'Semua', suffix: 'rekening',
    arr: () => selectedInAccs,
    options: () => rawAccounts.map((a) => ({ value: a.id, label: a.subAccount, meta: a.platform, off: a.status !== 'Aktif' }))
  },
  inCat: {
    title: 'Kategori', label: 'inCatLabel', def: 'Semua', suffix: 'kategori',
    arr: () => selectedInCats,
    options: () => rawCategories.map((c) => ({ value: c.id, label: c.name, group: c.type }))
  },
  hiCat: {
    title: 'Kategori', label: 'hiCatLabel', def: 'Semua kategori', suffix: 'kategori',
    arr: () => selectedHiCats,
    options: () => rawCategories.map((c) => ({ value: c.id, label: c.name, group: c.type }))
  },
  hiAcc: {
    title: 'Rekening', label: 'hiAccLabel', def: 'Semua rekening', suffix: 'rekening',
    arr: () => selectedHiAccs,
    options: () => rawAccounts.map((a) => ({ value: a.id, label: a.subAccount, meta: a.platform, off: a.status !== 'Aktif' }))
  }
};

let activePicker = null;

function pickerOptionLabel(kind, value) {
  const opt = PICKERS[kind].options().find((o) => o.value === value);
  return opt ? opt.label : value;
}

function updatePickerLabel(kind) {
  const cfg = PICKERS[kind];
  const arr = cfg.arr();
  const el = byId(cfg.label);
  if (!el) return;
  if (arr.length === 0) el.textContent = cfg.def;
  else if (arr.length === 1) el.textContent = pickerOptionLabel(kind, arr[0]);
  else el.textContent = `${arr.length} ${cfg.suffix}`;
}

function updateAllPickerLabels() {
  Object.keys(PICKERS).forEach(updatePickerLabel);
}

function openMultiPicker(kind) {
  if (!PICKERS[kind]) return;
  activePicker = kind;
  renderPicker();
  openSheet('pickerSheet');
}

function closePicker() {
  closeSheet('pickerSheet');
}

function renderPicker() {
  if (!activePicker) return;
  const cfg = PICKERS[activePicker];
  const arr = cfg.arr();
  setText('pickerTitle', cfg.title);
  setText('pickerCount', arr.length ? `${arr.length} dipilih` : 'Belum ada yang dipilih, semua ikut dihitung');
  const options = cfg.options();
  const box = byId('pickerList');
  if (!options.length) {
    box.innerHTML = `<p class="sub py-6 text-center">Belum ada pilihan.</p>`;
    return;
  }
  let html = '';
  let lastGroup = null;
  options.forEach((o) => {
    if (o.group !== undefined && o.group !== lastGroup) {
      lastGroup = o.group;
      html += `<p class="eyebrow px-1 pb-1 pt-3">${escapeHtml(o.group || 'Lainnya')}</p>`;
    }
    const checked = arr.includes(o.value) ? 'checked' : '';
    html += `
      <label class="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-surface-2">
        <input type="checkbox" value="${escapeHtml(o.value)}" onchange="togglePickerValue(this)" ${checked}>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] font-semibold ${o.off ? 'text-muted' : ''}">${escapeHtml(o.label)}</span>
          ${o.meta ? `<span class="block truncate text-[12px] font-medium text-muted">${escapeHtml(o.meta)}</span>` : ''}
        </span>
        ${o.off ? '<span class="pill pill-none">Nonaktif</span>' : ''}
      </label>`;
  });
  box.innerHTML = html;
}

function togglePickerValue(cb) {
  if (!activePicker) return;
  const arr = PICKERS[activePicker].arr();
  const idx = arr.indexOf(cb.value);
  if (cb.checked && idx === -1) arr.push(cb.value);
  if (!cb.checked && idx > -1) arr.splice(idx, 1);
  updatePickerLabel(activePicker);
  setText('pickerCount', arr.length ? `${arr.length} dipilih` : 'Belum ada yang dipilih, semua ikut dihitung');
  scheduleFilters();
}

function clearPicker() {
  if (!activePicker) return;
  PICKERS[activePicker].arr().length = 0;
  renderPicker();
  updatePickerLabel(activePicker);
  scheduleFilters();
}

function removeInsightFilter(btn) {
  const kind = btn.dataset.kind;
  const value = btn.dataset.value;
  if (!PICKERS[kind]) return;
  const arr = PICKERS[kind].arr();
  const idx = arr.indexOf(value);
  if (idx > -1) arr.splice(idx, 1);
  updatePickerLabel(kind);
  applyFilters();
}

function resetInsightFilters() {
  selectedInTypes.length = 0;
  selectedInAccs.length = 0;
  selectedInCats.length = 0;
  updateAllPickerLabels();
  setPeriodMode('month', true);
  const now = new Date();
  byId('filterMonthSel').value = String(now.getMonth());
  const yearSel = byId('filterYearSel');
  if (!Array.from(yearSel.options).some((o) => o.value === String(now.getFullYear()))) {
    yearSel.add(new Option(String(now.getFullYear()), String(now.getFullYear())));
  }
  yearSel.value = String(now.getFullYear());
  onMonthPickerChange();
}

function renderInsightFilterChips() {
  const box = byId('insightFilterChips');
  if (!box) return;
  const chip = (text, kind, value) => `
    <button data-kind="${kind}" data-value="${escapeHtml(value)}" onclick="removeInsightFilter(this)" class="chip py-1 pr-2 text-[12px]">
      <span class="max-w-[140px] truncate">${escapeHtml(text)}</span>${ic('x', 'text-muted')}
    </button>`;
  let html = '';
  selectedInTypes.forEach((t) => { html += chip(t, 'inType', t); });
  selectedInAccs.forEach((id) => { html += chip(pickerOptionLabel('inAcc', id), 'inAcc', id); });
  selectedInCats.forEach((id) => { html += chip(pickerOptionLabel('inCat', id), 'inCat', id); });
  box.innerHTML = html || `<p class="text-[12px] font-medium text-muted">Tanpa filter tambahan. Semua rekening dan kategori ikut dihitung.</p>`;
}

function buildMonthPicker() {
  const mSel = byId('filterMonthSel');
  const ySel = byId('filterYearSel');
  if (!mSel || !ySel) return;
  if (mSel.options.length === 0) MONTH_NAMES.forEach((name, i) => mSel.add(new Option(name, String(i))));
  const now = new Date();
  const years = new Set([now.getFullYear()]);
  rawTransactions.forEach((t) => {
    const d = parseDate(t.date);
    if (d) years.add(d.getFullYear());
  });
  const sorted = [...years].sort((a, b) => b - a);
  const prev = ySel.value;
  ySel.innerHTML = '';
  sorted.forEach((y) => ySel.add(new Option(String(y), String(y))));
  ySel.value = prev && sorted.some((y) => String(y) === prev) ? prev : String(now.getFullYear());
  if (!mSel.value) mSel.value = String(now.getMonth());
}

function setPeriodMode(mode, silent) {
  insightPeriodMode = mode;
  byId('pmode-month').classList.toggle('is-active', mode === 'month');
  byId('pmode-range').classList.toggle('is-active', mode !== 'month');
  setHidden('periodMonthRow', mode !== 'month');
  setHidden('periodRangeRow', mode === 'month');
  if (!silent) {
    if (mode === 'month') onMonthPickerChange();
    else onRangeChange();
  }
}

function onMonthPickerChange() {
  const m = parseInt(byId('filterMonthSel').value, 10);
  const y = parseInt(byId('filterYearSel').value, 10);
  if (isNaN(m) || isNaN(y)) return;
  byId('filterStartDate').value = dateKey(new Date(y, m, 1));
  byId('filterEndDate').value = dateKey(new Date(y, m + 1, 0));
  insCalYear = y;
  insCalMonth = m;
  applyFilters();
}

function ensureYearOption(y) {
  const ySel = byId('filterYearSel');
  if (Array.from(ySel.options).some((o) => o.value === String(y))) return;
  const sorted = Array.from(ySel.options).map((o) => parseInt(o.value, 10)).concat([y]).sort((a, b) => b - a);
  ySel.innerHTML = '';
  sorted.forEach((v) => ySel.add(new Option(String(v), String(v))));
}

function shiftInsightMonth(delta) {
  const mSel = byId('filterMonthSel');
  const ySel = byId('filterYearSel');
  let m = parseInt(mSel.value, 10) + delta;
  let y = parseInt(ySel.value, 10);
  if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
  ensureYearOption(y);
  mSel.value = String(m);
  ySel.value = String(y);
  onMonthPickerChange();
}

function onRangeChange() {
  const s = parseDate(byId('filterStartDate').value);
  const e = parseDate(byId('filterEndDate').value);
  const anchor = e || s;
  if (anchor) {
    insCalYear = anchor.getFullYear();
    insCalMonth = anchor.getMonth();
  }
  applyFilters();
}

function shiftInsightCalendar(delta) {
  let m = insCalMonth + delta;
  let y = insCalYear;
  if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }

  if (insightPeriodMode === 'month') {
    ensureYearOption(y);
    byId('filterMonthSel').value = String(m);
    byId('filterYearSel').value = String(y);
    onMonthPickerChange();
    return;
  }

  const s = parseDate(byId('filterStartDate').value);
  const e = parseDate(byId('filterEndDate').value);
  const target = y * 12 + m;
  if (s && target < s.getFullYear() * 12 + s.getMonth()) return;
  if (e && target > e.getFullYear() * 12 + e.getMonth()) return;
  insCalYear = y;
  insCalMonth = m;
  applyFilters();
}

function setDefaultDates() {
  const today = new Date();
  const first = dateKey(new Date(today.getFullYear(), today.getMonth(), 1));
  const last = dateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  byId('filterStartDate').value = first;
  byId('filterEndDate').value = last;
  byId('hiStartDate').value = first;
  byId('hiEndDate').value = last;
  insCalYear = today.getFullYear();
  insCalMonth = today.getMonth();
  byId('filterMonthSel').value = String(today.getMonth());
  const ySel = byId('filterYearSel');
  if (Array.from(ySel.options).some((o) => o.value === String(today.getFullYear()))) ySel.value = String(today.getFullYear());
  setPeriodMode('month', true);
}

async function updateBudget() {
  const value = await uiPrompt({
    title: 'Target anggaran bulanan',
    message: 'Berapa batas aman pengeluaranmu sebulan? Nanti kami kasih tahu kalau sudah mepet.',
    icon: 'target',
    input: { label: 'Nominal', money: true, inputmode: 'numeric', value: budgetLimit.toLocaleString('id-ID'), placeholder: '0' },
    confirmText: 'Simpan',
    validate: (v) => (parseRupiah(v) > 0 ? '' : 'Nominal harus lebih dari 0.')
  });
  if (value === null) return;
  budgetLimit = parseRupiah(value);
  store.set('pk_budget', String(budgetLimit));
  applyFilters();
  toast('Target anggaran tersimpan.', 'ok');
}

function updateAutoBadge() {
  const badge = byId('autoBadge');
  if (!badge) return;
  const active = rawAutoTrx.filter((a) => a.status === 'Aktif').length;
  badge.textContent = active > 9 ? '9+' : String(active);
  badge.hidden = active === 0;
}

function saveSnapshot(data) {
  const ok = store.set('pk_snapshot', JSON.stringify({ savedAt: Date.now(), data: data }));
  if (!ok) store.remove('pk_snapshot');
}

function loadSnapshot() {
  const snap = store.getJson('pk_snapshot');
  return snap && snap.data ? snap : null;
}

function applyData(data, opts) {
  if (!data) return;
  lastServerData = data;
  rawAccounts = (data.accounts || []).map((a) => Object.assign({}, a));
  rawTransactions = (data.transactions || []).slice();
  rawCategories = data.categories || [];
  rawAutoTrx = (data.autoTransactions || []).map((a) => Object.assign({}, a));
  dataReady = true;
  refreshViews();
  if (!opts || opts.save !== false) saveSnapshot(data);
}

function refreshViews() {
  populateFormSelects();
  buildMonthPicker();
  updateAutoBadge();
  if (!byId('filterStartDate').value) setDefaultDates();
  updateAllPickerLabels();
  applyFilters();
  if (isSheetOpen('autoListSheet')) renderAutoTrxList();
  if (isSheetOpen('pickerSheet')) renderPicker();
}

async function loadData(manual) {
  if (loadingData || !session.token) return;
  loadingData = true;
  setSyncing(true);
  try {
    const data = await api('getData');
    lastSyncAt = Date.now();
    if (inFlightWrites === 0) applyData(data);
    if (manual) toast('Data sudah paling baru.', 'ok');
  } catch (err) {
    if (err.code !== 'UNAUTHORIZED') {
      if (!dataReady) renderLoadError(err.message);
      toast(err.message, { tone: 'error', action: { label: 'Coba lagi', fn: () => loadData(true) } });
    }
  } finally {
    loadingData = false;
    if (inFlightWrites === 0) setSyncing(false);
  }
}

async function runWrite(action, payload, pick) {
  inFlightWrites++;
  if (inFlightWrites > 1) writeOverlap = true;
  setSyncing(true);
  try {
    const res = await api(action, payload);
    inFlightWrites--;
    lastSyncAt = Date.now();
    if (inFlightWrites === 0) {
      applyData(pick ? pick(res) : res);
      if (writeOverlap) {
        writeOverlap = false;
        loadData();
      }
    }
    return res;
  } catch (err) {
    inFlightWrites--;
    if (inFlightWrites === 0) {
      writeOverlap = false;
      if (lastServerData && err.code !== 'UNAUTHORIZED') applyData(lastServerData, { save: false });
    }
    throw err;
  } finally {
    if (inFlightWrites === 0 && !loadingData) setSyncing(false);
  }
}

function fillSelect(sel, items, keepValue) {
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  items.forEach((it) => sel.add(new Option(it.label, it.value)));
  if (keepValue && prev && items.some((it) => it.value === prev)) sel.value = prev;
}

function populateFormSelects() {
  const active = rawAccounts.filter((a) => a.status === 'Aktif').map((a) => ({ value: a.id, label: a.subAccount }));
  const trxOpen = isSheetOpen('trxSheet');
  const autoOpen = isSheetOpen('autoFormSheet');
  fillSelect(byId('accountFrom'), active, trxOpen);
  fillSelect(byId('accountTo'), active, trxOpen);
  fillSelect(byId('autoAccountFrom'), active, autoOpen);
  fillSelect(byId('autoAccountTo'), active, autoOpen);
  if (!trxOpen) toggleFields();
  if (!autoOpen) toggleAutoFields();
}

function matchesInsightFilters(trx) {
  if (selectedInCats.length > 0 && !selectedInCats.includes(trx.catId)) return false;
  if (selectedInTypes.length === 0 && selectedInAccs.length === 0) return true;

  const fromAcc = accIndex[trx.fromId];
  const toAcc = accIndex[trx.toId];

  if (trx.type === 'Pemasukan') {
    if (selectedInTypes.length > 0 && (!toAcc || !selectedInTypes.includes(toAcc.type))) return false;
    if (selectedInAccs.length > 0 && !selectedInAccs.includes(trx.toId)) return false;
    return true;
  }
  if (trx.type === 'Pengeluaran') {
    if (selectedInTypes.length > 0 && (!fromAcc || !selectedInTypes.includes(fromAcc.type))) return false;
    if (selectedInAccs.length > 0 && !selectedInAccs.includes(trx.fromId)) return false;
    return true;
  }

  let typeMatch = selectedInTypes.length === 0;
  if (!typeMatch && ((fromAcc && selectedInTypes.includes(fromAcc.type)) || (toAcc && selectedInTypes.includes(toAcc.type)))) typeMatch = true;
  let subMatch = selectedInAccs.length === 0;
  if (!subMatch && (selectedInAccs.includes(trx.fromId) || selectedInAccs.includes(trx.toId))) subMatch = true;
  return typeMatch && subMatch;
}

function toneText(el, good, base) {
  if (!el) return;
  el.className = `${base} ${good ? 'text-income' : 'text-expense'}`;
}

function applyFilters() {
  if (!byId('filterStartDate')) return;

  const start = byId('filterStartDate').value;
  const end = byId('filterEndDate').value;
  const hStart = byId('hiStartDate').value;
  const hEnd = byId('hiEndDate').value;

  accIndex = {};
  rawAccounts.forEach((a) => {
    accIndex[a.id] = { id: a.id, name: a.subAccount, platform: a.platform, type: a.type, status: a.status, balance: a.initialBalance, initialBalance: a.initialBalance };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let tInc = 0;
  let tExp = 0;

  const curMonth = today.getMonth();
  const curYear = today.getFullYear();
  const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
  const prevYear = curMonth === 0 ? curYear - 1 : curYear;

  let incThisMonth = 0, expThisMonth = 0, incLastMonth = 0, expLastMonth = 0;
  const todayTrx = [];

  const piutangData = {
    talangan: { out: 0, in: 0, name: 'Talangan Kantor' },
    teman: { out: 0, in: 0, name: 'Pinjaman ke Teman' },
    keluarga: { out: 0, in: 0, name: 'Pinjaman ke Keluarga' }
  };
  const trxTalangan = [];
  const trxTeman = [];
  const trxKeluarga = [];

  rawTransactions.forEach((trx) => {
    const trxDate = parseDate(trx.date);
    if (trxDate) {
      const m = trxDate.getMonth();
      const y = trxDate.getFullYear();
      if (y === curYear && m === curMonth) {
        if (trx.type === 'Pemasukan') incThisMonth += trx.amount;
        if (trx.type === 'Pengeluaran') expThisMonth += trx.amount;
      } else if (y === prevYear && m === prevMonth) {
        if (trx.type === 'Pemasukan') incLastMonth += trx.amount;
        if (trx.type === 'Pengeluaran') expLastMonth += trx.amount;
      }
      if (trxDate.getTime() === today.getTime()) {
        if (trx.type === 'Pemasukan') tInc += trx.amount;
        if (trx.type === 'Pengeluaran') tExp += trx.amount;
        todayTrx.push(trx);
      }
    }

    if (trx.type === 'Pemasukan' && accIndex[trx.toId]) {
      accIndex[trx.toId].balance += trx.amount;
    } else if (trx.type === 'Pengeluaran' && accIndex[trx.fromId]) {
      accIndex[trx.fromId].balance -= trx.amount;
    } else if (trx.type === 'Transfer') {
      if (accIndex[trx.fromId]) accIndex[trx.fromId].balance -= trx.amount;
      if (accIndex[trx.toId]) accIndex[trx.toId].balance += trx.amount;
    }

    if (trx.catId === 'KAT33') { piutangData.talangan.out += trx.amount; trxTalangan.push(trx); }
    if (trx.catId === 'KAT34') { piutangData.talangan.in += trx.amount; trxTalangan.push(trx); }
    if (trx.catId === 'KAT35') { piutangData.teman.out += trx.amount; trxTeman.push(trx); }
    if (trx.catId === 'KAT36') { piutangData.teman.in += trx.amount; trxTeman.push(trx); }
    if (trx.catId === 'KAT37') { piutangData.keluarga.out += trx.amount; trxKeluarga.push(trx); }
    if (trx.catId === 'KAT38') { piutangData.keluarga.in += trx.amount; trxKeluarga.push(trx); }
  });

  let totalBal = 0, totalBank = 0, totalEwallet = 0, totalTunai = 0, countActive = 0, countInactive = 0;
  Object.keys(accIndex).forEach((id) => {
    const acc = accIndex[id];
    if (acc.status !== 'Aktif') { countInactive++; return; }
    countActive++;
    totalBal += acc.balance;
    if (acc.type === 'Bank') totalBank += acc.balance;
    else if (acc.type === 'E-wallet') totalEwallet += acc.balance;
    else if (acc.type === 'Tunai' || acc.type === 'Tunai / Cash') totalTunai += acc.balance;
  });

  const pctDiff = (cur, prev) => (prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100);
  const incDiff = pctDiff(incThisMonth, incLastMonth);
  const expDiff = pctDiff(expThisMonth, expLastMonth);
  const formatDiff = (diff) => (diff === 0 ? 'Sama kayak bulan lalu' : `${fmtPct(diff, true)} vs bulan lalu`);

  setText('homeIncMonth', formatRupiah(incThisMonth));
  setText('homeExpMonth', formatRupiah(expThisMonth));
  const incDiffEl = byId('homeIncDiff');
  incDiffEl.textContent = formatDiff(incDiff);
  toneText(incDiffEl, incDiff >= 0, 'mt-1 text-[11px] font-semibold');
  const expDiffEl = byId('homeExpDiff');
  expDiffEl.textContent = formatDiff(expDiff);
  toneText(expDiffEl, expDiff <= 0, 'mt-1 text-[11px] font-semibold');

  setText('valTodayDate', today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  setText('valTodayInc', formatRupiah(tInc));
  setText('valTodayExp', formatRupiah(tExp));

  const sDate = parseDate(start) || new Date(curYear, curMonth, 1);
  const eDate = parseDate(end) || new Date(curYear, curMonth + 1, 0);
  let daysDiff = Math.round((eDate.getTime() - sDate.getTime()) / 86400000) + 1;
  if (daysDiff <= 0) daysDiff = 1;

  let prevStart, prevEnd;
  if (isFullMonthPeriod(sDate, eDate)) {
    prevStart = new Date(sDate.getFullYear(), sDate.getMonth() - 1, 1);
    prevEnd = new Date(sDate.getFullYear(), sDate.getMonth(), 0);
  } else {
    prevEnd = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate() - 1);
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - (daysDiff - 1));
  }

  const filteredTrx = [];
  let prevInc = 0, prevExp = 0;
  rawTransactions.forEach((trx) => {
    if (!matchesInsightFilters(trx)) return;
    const trxDate = parseDate(trx.date);
    if (!trxDate) return;
    if (trxDate >= sDate && trxDate <= eDate) {
      filteredTrx.push(trx);
    } else if (trxDate >= prevStart && trxDate <= prevEnd) {
      if (trx.type === 'Pemasukan') prevInc += trx.amount;
      if (trx.type === 'Pengeluaran') prevExp += trx.amount;
    }
  });

  const hsDate = parseDate(hStart);
  const heDate = parseDate(hEnd);
  const historyFilteredTrx = rawTransactions.filter((trx) => {
    const trxDate = parseDate(trx.date);
    if (trxDate && hsDate && trxDate < hsDate) return false;
    if (trxDate && heDate && trxDate > heDate) return false;
    if (selectedHiCats.length > 0 && !selectedHiCats.includes(trx.catId)) return false;
    if (selectedHiAccs.length > 0) {
      if (trx.type === 'Pemasukan' && !selectedHiAccs.includes(trx.toId)) return false;
      if (trx.type === 'Pengeluaran' && !selectedHiAccs.includes(trx.fromId)) return false;
      if (trx.type === 'Transfer' && !selectedHiAccs.includes(trx.fromId) && !selectedHiAccs.includes(trx.toId)) return false;
    }
    return true;
  });

  let inc = 0, exp = 0;
  const expChart = {};
  const expByAccount = {};
  const dailyExpInsight = {};
  const dailyNet = {};
  const weekdayTotal = [0, 0, 0, 0, 0, 0, 0];
  const weekdayDays = [{}, {}, {}, {}, {}, {}, {}];
  let expTrxCount = 0, incTrxCount = 0, trfTrxCount = 0;
  insightDayMap = {};

  filteredTrx.forEach((trx) => {
    const d = parseDate(trx.date);
    const key = trx.date;
    if (!insightDayMap[key]) insightDayMap[key] = [];
    insightDayMap[key].push(trx);

    if (trx.type === 'Pemasukan') {
      inc += trx.amount;
      incTrxCount++;
      dailyNet[key] = (dailyNet[key] || 0) + trx.amount;
    } else if (trx.type === 'Pengeluaran') {
      exp += trx.amount;
      expTrxCount++;
      dailyNet[key] = (dailyNet[key] || 0) - trx.amount;
      expChart[trx.catName] = (expChart[trx.catName] || 0) + trx.amount;
      const accName = accIndex[trx.fromId] ? accIndex[trx.fromId].name : (trx.fromName || 'Tidak diketahui');
      expByAccount[accName] = (expByAccount[accName] || 0) + trx.amount;
      dailyExpInsight[key] = (dailyExpInsight[key] || 0) + trx.amount;
      if (d) {
        const wd = (d.getDay() + 6) % 7;
        weekdayTotal[wd] += trx.amount;
        weekdayDays[wd][key] = true;
      }
    } else {
      trfTrxCount++;
    }
  });

  let highestCategory = '-', highestAmount = 0;
  Object.keys(expChart).forEach((cat) => {
    if (expChart[cat] > highestAmount) { highestAmount = expChart[cat]; highestCategory = cat; }
  });

  let maxExpDayStr = '-', maxExpDayAmt = 0;
  Object.keys(dailyExpInsight).forEach((dStr) => {
    if (dailyExpInsight[dStr] > maxExpDayAmt) { maxExpDayAmt = dailyExpInsight[dStr]; maxExpDayStr = dStr; }
  });
  const formattedMaxDay = maxExpDayStr === '-' ? '-' : formatDateShort(maxExpDayStr);

  const avgDaily = exp / daysDiff;
  const avgPerTrx = expTrxCount > 0 ? exp / expTrxCount : 0;
  const netCashFlow = inc - exp;
  const savingRate = inc > 0 ? (netCashFlow / inc) * 100 : 0;

  const elapsedEnd = eDate < today ? eDate : today;
  let elapsedDays = Math.round((elapsedEnd.getTime() - sDate.getTime()) / 86400000) + 1;
  if (elapsedDays < 0) elapsedDays = 0;
  if (elapsedDays > daysDiff) elapsedDays = daysDiff;

  let noSpendDays = 0;
  const weekdayOccur = [0, 0, 0, 0, 0, 0, 0];
  if (elapsedDays > 0 && daysDiff <= 400) {
    for (let i = 0; i < elapsedDays; i++) {
      const cur = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate() + i);
      weekdayOccur[(cur.getDay() + 6) % 7]++;
      if (!dailyExpInsight[dateKey(cur)]) noSpendDays++;
    }
  }

  const projection = elapsedDays > 0 ? (exp / elapsedDays) * daysDiff : exp;
  const isProjectionRelevant = elapsedDays > 0 && elapsedDays < daysDiff;
  const weekdayAvg = weekdayTotal.map((total, i) => {
    const n = weekdayOccur[i] || Object.keys(weekdayDays[i]).length;
    return n > 0 ? total / n : 0;
  });

  setText('valHighestCat', highestCategory);
  setText('valHighestAmount', formatRupiah(highestAmount));
  setText('valAvgDaily', formatRupiah(avgDaily));
  setText('valAvgPerTrx', formatRupiah(avgPerTrx));
  setText('valMostExpDay', formattedMaxDay);
  setText('valMostExpDayAmt', formatRupiah(maxExpDayAmt));
  setText('valNoSpendDays', String(noSpendDays));
  setText('valNoSpendHint', `dari ${elapsedDays} hari berjalan`);

  const rateEl = byId('valSavingRate');
  rateEl.textContent = inc > 0 ? fmtPct(savingRate) : '-';
  toneText(rateEl, savingRate >= 0, 'num mt-1 text-[15px] font-extrabold');
  setText('valSavingHint', inc > 0 ? 'dari total pemasukan' : 'belum ada pemasukan');
  setText('valTotalTrxCount', String(filteredTrx.length));
  setText('valTrxBreakdown', `${incTrxCount} masuk · ${expTrxCount} keluar · ${trfTrxCount} transfer`);
  setText('valProjection', formatRupiah(isProjectionRelevant ? projection : exp));
  setText('valProjectionHint', isProjectionRelevant ? `Estimasi dari laju ${elapsedDays} hari pertama` : 'Periode sudah lewat, ini angka final');

  const netEl = byId('valNetCashFlow');
  netEl.textContent = formatRupiah(netCashFlow);
  toneText(netEl, netCashFlow >= 0, 'num flex-shrink-0 text-base font-extrabold');

  const formatDelta = (current, previous, lowerIsBetter) => {
    if (previous === 0) return current === 0 ? { text: 'Sama kayak periode lalu', good: true } : { text: 'Baru ada di periode ini', good: !lowerIsBetter };
    const diff = ((current - previous) / previous) * 100;
    return { text: `${fmtPct(diff, true)} vs periode lalu`, good: lowerIsBetter ? diff <= 0 : diff >= 0 };
  };
  const incDelta = formatDelta(inc, prevInc, false);
  const expDelta = formatDelta(exp, prevExp, true);
  const incDeltaEl = byId('valIncomeDelta');
  incDeltaEl.textContent = incDelta.text;
  toneText(incDeltaEl, incDelta.good, 'mt-1 text-[11px] font-semibold leading-snug');
  const expDeltaEl = byId('valExpenseDelta');
  expDeltaEl.textContent = expDelta.text;
  toneText(expDeltaEl, expDelta.good, 'mt-1 text-[11px] font-semibold leading-snug');
  setText('prevPeriodLabel', `Dibandingkan dengan ${formatPeriodText(prevStart, prevEnd)}`);
  setText('periodSummaryLabel', `${formatPeriodText(sDate, eDate)} · ${daysDiff} hari`);

  setText('valTotalBalance', formatRupiah(totalBal));
  [['valTotalBank', totalBank], ['valTotalEwallet', totalEwallet], ['valTotalTunai', totalTunai]].forEach((pair) => {
    const el = byId(pair[0]);
    el.textContent = formatCompact(pair[1]);
    el.title = formatRupiah(pair[1]);
  });
  setText('walletTotalActive', formatRupiah(totalBal));
  setText('walletCountActive', String(countActive));
  setText('walletCountInactive', String(countInactive));
  setText('valIncomeInsight', formatRupiah(inc));
  setText('valExpenseInsight', formatRupiah(exp));
  setText('valExpenseBoxInsight', formatRupiah(exp));
  setText('budgetLimitDisplay', formatRupiah(budgetLimit));

  const pct = budgetLimit > 0 ? (exp / budgetLimit) * 100 : 0;
  const bar = byId('budgetProgress');
  const stEl = byId('budgetStatus');
  bar.style.width = `${Math.min(pct, 100)}%`;
  setText('budgetPercentage', `${Math.round(pct)}%`);
  if (pct <= 80) {
    stEl.textContent = 'Masih aman, lanjutkan!';
    stEl.className = 'text-income';
    bar.className = 'h-full rounded-full bg-income transition-all duration-500';
  } else if (pct <= 100) {
    stEl.textContent = 'Udah mepet batas aman';
    stEl.className = 'text-warn';
    bar.className = 'h-full rounded-full bg-warn transition-all duration-500';
  } else {
    stEl.textContent = 'Lewat anggaran. Rem dulu, ya!';
    stEl.className = 'text-expense';
    bar.className = 'h-full rounded-full bg-expense transition-all duration-500';
  }
  setText('budgetHint', isFullMonthPeriod(sDate, eDate)
    ? 'Target bulanan dibandingkan dengan pengeluaran satu bulan penuh.'
    : `Periode yang dipilih ${daysDiff} hari, bukan sebulan penuh, jadi perbandingannya cuma gambaran.`);

  historyData = sortByDateDesc(historyFilteredTrx);

  renderPayload = {
    dailyNet: dailyNet,
    sDate: sDate,
    eDate: eDate,
    expChart: expChart,
    expByAccount: expByAccount,
    exp: exp,
    weekdayAvg: weekdayAvg,
    todayTrx: sortByDateDesc(todayTrx),
    piutangData: piutangData,
    trxTalangan: trxTalangan,
    trxTeman: trxTeman,
    trxKeluarga: trxKeluarga
  };

  markAllTabsDirty();
  renderActiveTab();
}

const PIUTANG_GROUPS = {
  Talangan: { out: 'KAT33', in: 'KAT34', accent: 'violet', label: 'Talangan', key: 'talangan', ic: 'buildings' },
  Teman: { out: 'KAT35', in: 'KAT36', accent: 'orange', label: 'Pinjaman', key: 'teman', ic: 'users' },
  Keluarga: { out: 'KAT37', in: 'KAT38', accent: 'teal', label: 'Pinjaman', key: 'keluarga', ic: 'users-three' }
};

function piutangGroupForCat(catId) {
  if (!catId) return null;
  const keys = Object.keys(PIUTANG_GROUPS);
  for (let i = 0; i < keys.length; i++) {
    const cfg = PIUTANG_GROUPS[keys[i]];
    if (cfg.out === catId) return { prefix: keys[i], cfg: cfg, role: 'out' };
    if (cfg.in === catId) return { prefix: keys[i], cfg: cfg, role: 'in' };
  }
  return null;
}

function isValidPiutangNote(note) {
  const raw = String(note === null || note === undefined ? '' : note).replace(/^\s*\[AUTO\]\s*/i, '');
  const idx = raw.indexOf(':');
  if (idx <= 0) return false;
  return raw.slice(0, idx).trim().length > 0 && raw.slice(idx + 1).trim().length > 0;
}

function piutangTodayCode() {
  const d = new Date();
  return String(d.getFullYear()).slice(-2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}

function piutangNoteExample(prefix, role) {
  if (prefix === 'Talangan') return role === 'in' ? piutangTodayCode() + ': Reimburse air galon' : piutangTodayCode() + ': Air galon kantor';
  return role === 'in' ? 'Budi: Cicilan pertama' : 'Budi: Pinjaman darurat';
}

function piutangAnalysisFor(prefix) {
  const cfg = PIUTANG_GROUPS[prefix];
  if (!cfg) return null;
  return analyzePiutang(rawTransactions.filter((t) => t.catId === cfg.out || t.catId === cfg.in), cfg.out, cfg.in);
}

function piutangLabel(note) {
  const raw = String(note === null || note === undefined ? '' : note).replace(/^\s*\[AUTO\]\s*/i, '').trim();
  if (!raw) return '';
  const idx = raw.indexOf(':');
  if (idx <= 0) return '';
  return raw.slice(0, idx).trim().replace(/\s+/g, ' ');
}

function piutangInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function analyzePiutang(trxList, outCat, inCat) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ordered = trxList
    .map((t, i) => ({ t: t, i: i, d: parseDate(t.date) }))
    .filter((x) => x.d)
    .sort((a, b) => (a.d - b.d) || (a.i - b.i));

  const groups = {};
  const groupOrder = [];
  const monthly = {};
  let totalOut = 0, totalIn = 0, settledAmount = 0, weightedDays = 0, outCount = 0, inCount = 0;
  let lastOut = null, lastIn = null;

  ordered.forEach((row) => {
    const t = row.t;
    const d = row.d;
    const label = piutangLabel(t.note);
    const key = label ? label.toLowerCase() : '__nolabel__';
    if (!groups[key]) {
      groups[key] = { name: label || 'Tanpa label', labeled: !!label, out: 0, in: 0, queue: [], settled: 0, weighted: 0, outCount: 0, inCount: 0, lastOut: null, lastIn: null, overpaid: 0 };
      groupOrder.push(key);
    }
    const g = groups[key];
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthly[mKey]) monthly[mKey] = { out: 0, in: 0 };

    if (t.catId === outCat) {
      totalOut += t.amount;
      outCount++;
      lastOut = d;
      monthly[mKey].out += t.amount;
      g.out += t.amount;
      g.outCount++;
      g.lastOut = d;
      g.queue.push({ date: d, original: t.amount, remaining: t.amount, note: t.note });
    } else if (t.catId === inCat) {
      totalIn += t.amount;
      inCount++;
      lastIn = d;
      monthly[mKey].in += t.amount;
      g.in += t.amount;
      g.inCount++;
      g.lastIn = d;
      let pay = t.amount;
      let guard = 0;
      while (pay > 0 && g.queue.length > 0 && guard++ < 10000) {
        const head = g.queue[0];
        const take = Math.min(pay, head.remaining);
        head.remaining -= take;
        pay -= take;
        const days = Math.max(0, Math.round((d - head.date) / 86400000));
        settledAmount += take;
        weightedDays += take * days;
        g.settled += take;
        g.weighted += take * days;
        if (head.remaining <= 0) g.queue.shift();
      }
      if (pay > 0) g.overpaid += pay;
    }
  });

  let overpaid = 0;
  const outstanding = [];
  const parties = groupOrder.map((k) => {
    const g = groups[k];
    overpaid += g.overpaid;
    const items = g.queue.filter((q) => q.remaining > 0).map((q) => ({
      date: q.date, note: q.note, original: q.original, remaining: q.remaining,
      party: g.name, labeled: g.labeled,
      age: Math.max(0, Math.round((today - q.date) / 86400000))
    }));
    items.forEach((it) => outstanding.push(it));
    return {
      name: g.name, labeled: g.labeled, out: g.out, in: g.in,
      outstanding: items.reduce((s, it) => s + it.remaining, 0),
      overpaid: g.overpaid,
      recovery: g.out > 0 ? Math.min(100, (g.in / g.out) * 100) : (g.in > 0 ? 100 : 0),
      oldestAge: items.reduce((m, it) => Math.max(m, it.age), 0),
      outCount: g.outCount, inCount: g.inCount,
      lastOut: g.lastOut, lastIn: g.lastIn,
      avgSettleDays: g.settled > 0 ? g.weighted / g.settled : null,
      items: items
    };
  });

  outstanding.sort((a, b) => (b.age - a.age) || (b.remaining - a.remaining));
  parties.sort((a, b) => (b.outstanding - a.outstanding) || (b.out - a.out));

  const buckets = [
    { label: '0 sampai 30 hari', min: 0, max: 30, amount: 0, count: 0, dot: 'bg-income', text: 'text-income' },
    { label: '31 sampai 60 hari', min: 31, max: 60, amount: 0, count: 0, dot: 'bg-warn', text: 'text-warn' },
    { label: '61 sampai 90 hari', min: 61, max: 90, amount: 0, count: 0, dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-300' },
    { label: 'Lebih dari 90 hari', min: 91, max: Infinity, amount: 0, count: 0, dot: 'bg-expense', text: 'text-expense' }
  ];
  outstanding.forEach((o) => {
    for (let i = 0; i < buckets.length; i++) {
      if (o.age >= buckets[i].min && o.age <= buckets[i].max) {
        buckets[i].amount += o.remaining;
        buckets[i].count++;
        break;
      }
    }
  });

  const keys = Object.keys(monthly).sort();
  const series = keys.slice(-6).map((k) => ({ key: k, out: monthly[k].out, in: monthly[k].in }));
  const recentKeys = keys.slice(-3);
  const avgMonthlyIn = recentKeys.length > 0 ? recentKeys.reduce((s, k) => s + monthly[k].in, 0) / recentKeys.length : 0;
  const sisa = totalOut - totalIn;
  const outstandingTotal = outstanding.reduce((s, o) => s + o.remaining, 0);
  const openParties = parties.filter((p) => p.outstanding > 0);
  const settledParties = parties.filter((p) => p.outstanding <= 0 && p.out > 0);

  return {
    totalOut: totalOut,
    totalIn: totalIn,
    sisa: sisa,
    overpaid: overpaid,
    recovery: totalOut > 0 ? Math.min(100, (totalIn / totalOut) * 100) : 0,
    outstanding: outstanding,
    outstandingTotal: outstandingTotal,
    buckets: buckets,
    avgSettleDays: settledAmount > 0 ? weightedDays / settledAmount : null,
    oldestAge: outstanding.length > 0 ? outstanding[0].age : 0,
    outCount: outCount,
    inCount: inCount,
    avgTicket: outCount > 0 ? totalOut / outCount : 0,
    lastOut: lastOut,
    lastIn: lastIn,
    series: series,
    avgMonthlyIn: avgMonthlyIn,
    monthsToClear: sisa > 0 && avgMonthlyIn > 0 ? sisa / avgMonthlyIn : null,
    parties: parties,
    openParties: openParties,
    settledParties: settledParties,
    concentration: outstandingTotal > 0 && openParties.length > 0 ? (openParties[0].outstanding / outstandingTotal) * 100 : 0,
    today: today
  };
}

function sortByDateDesc(list) {
  const key = (t) => (/^\d{4}-\d{2}-\d{2}$/.test(String(t.date || '')) ? t.date : '');
  return list
    .map((t, i) => ({ t: t, i: i, k: key(t) }))
    .sort((a, b) => {
      if (a.k !== b.k) return a.k < b.k ? 1 : -1;
      return b.i - a.i;
    })
    .map((x) => x.t);
}

function renderPiutangLists(p) {
  const update = (prefix, dataObj, trxList) => {
    const sisa = dataObj.out - dataObj.in;
    setText(`val${prefix}Sisa`, formatRupiah(Math.abs(sisa)));
    setText(`lbl${prefix}Sisa`, sisa > 0 ? 'Belum kembali' : (sisa < 0 ? 'Kelebihan bayar' : 'Lunas semua'));
    setText(`val${prefix}Out`, formatRupiah(dataObj.out));
    setText(`val${prefix}In`, formatRupiah(dataObj.in));
    const cfg = PIUTANG_GROUPS[prefix];
    renderPiutangAnalysis(prefix, analyzePiutang(trxList, cfg.out, cfg.in), cfg);
    renderTrxList(sortByDateDesc(trxList), `list-${prefix}`, { showDate: true });
  };
  update('Talangan', p.piutangData.talangan, p.trxTalangan);
  update('Teman', p.piutangData.teman, p.trxTeman);
  update('Keluarga', p.piutangData.keluarga, p.trxKeluarga);
}

function renderHistoryList() {
  const list = currentHistFilter === 'Semua' ? historyData : historyData.filter((t) => t.type === currentHistFilter);
  const total = list.length;
  const shown = Math.min(historyShown, total);
  renderTrxList(list.slice(0, shown), 'historyTrxList', { group: true, empty: 'history' });
  const more = byId('historyMoreWrap');
  if (!more) return;
  more.hidden = shown >= total;
  if (shown < total) setText('historyMoreLabel', `Muat ${Math.min(HISTORY_PAGE, total - shown)} lagi (${shown} dari ${total})`);
}

function loadMoreHistory() {
  historyShown += HISTORY_PAGE;
  renderHistoryList();
}

function formatPeriodText(startDate, endDate) {
  if (!startDate || !endDate) return '-';
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
  const left = sameMonth
    ? `${startDate.getDate()}`
    : `${startDate.getDate()} ${MONTH_SHORT[startDate.getMonth()]}${sameYear ? '' : ' ' + startDate.getFullYear()}`;
  return `${left} sampai ${endDate.getDate()} ${MONTH_SHORT[endDate.getMonth()]} ${endDate.getFullYear()}`;
}

function isFullMonthPeriod(startDate, endDate) {
  if (!startDate || !endDate) return false;
  if (startDate.getDate() !== 1) return false;
  if (startDate.getFullYear() !== endDate.getFullYear() || startDate.getMonth() !== endDate.getMonth()) return false;
  return endDate.getDate() === new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
}
