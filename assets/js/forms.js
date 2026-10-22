let noteSubmitted = false;
let noteContext = null;
let repaymentContext = null;
let profileTouched = false;

async function handleLogin(e) {
  e.preventDefault();
  const form = byId('loginForm');
  const username = form.username.value.trim();
  const password = form.password.value;
  if (!username || !password) {
    toast('Isi username dan password dulu, ya.', 'error');
    return;
  }
  const btn = byId('btnLogin');
  setButtonBusy(btn, true, 'Lagi masuk...');
  try {
    const res = await api('login', { username: username, password: password });
    saveSession(res.token, res.profile);
    form.reset();
    byId('loginPassword').type = 'password';
    enterApp({ fresh: true });
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setButtonBusy(btn, false);
  }
}

async function confirmLogout() {
  const ok = await uiConfirm({
    title: 'Mau keluar dulu?',
    message: 'Kamu perlu masuk lagi buat lihat datamu di perangkat ini.',
    tone: 'warn',
    icon: 'sign-out',
    confirmText: 'Ya, keluar',
    cancelText: 'Nggak jadi'
  });
  if (ok) handleLogout();
}

function handleLogout(message) {
  clearSession();
  try {
    sessionStorage.setItem('pk_flash', message || 'Kamu sudah keluar. Sampai ketemu lagi!');
  } catch (e) {}
  location.replace(location.pathname + location.search);
}

function openProfileModal() {
  const form = byId('profileForm');
  const p = session.profile || {};
  form.nama_lengkap.value = p.nama_lengkap || '';
  form.username.value = p.username || '';
  form.email.value = p.email || '';
  byId('passwordForm').reset();
  profileTouched = false;
  openSheet('profileSheet');
  api('getProfile').then((fresh) => {
    saveSession(null, fresh);
    updateHeaderIdentity();
    if (isSheetOpen('profileSheet') && !profileTouched) {
      form.nama_lengkap.value = fresh.nama_lengkap || '';
      form.username.value = fresh.username || '';
      form.email.value = fresh.email || '';
    }
  }).catch(() => {});
}

function closeProfileModal() {
  closeSheet('profileSheet');
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  const form = byId('profileForm');
  const data = {
    nama_lengkap: form.nama_lengkap.value.trim(),
    username: form.username.value.trim(),
    email: form.email.value.trim()
  };
  if (!data.nama_lengkap || !data.username) {
    toast('Nama dan username wajib diisi.', 'error');
    return;
  }
  const btn = byId('btnProfileSubmit');
  setButtonBusy(btn, true, 'Menyimpan...');
  try {
    const res = await api('updateProfile', data);
    saveSession(res.token, res.profile);
    updateHeaderIdentity();
    closeProfileModal();
    toast('Profil tersimpan.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setButtonBusy(btn, false);
  }
}

async function handlePasswordSubmit(e) {
  e.preventDefault();
  const form = byId('passwordForm');
  const current = form.currentPassword.value;
  const next = form.newPassword.value;
  if (!current || !next) {
    toast('Isi password sekarang dan password baru dulu.', 'error');
    return;
  }
  if (next.length < 6) {
    toast('Password baru minimal 6 karakter.', 'error');
    return;
  }
  if (next === current) {
    toast('Password baru harus beda dari yang sekarang.', 'error');
    return;
  }
  const btn = byId('btnPasswordSubmit');
  setButtonBusy(btn, true, 'Mengganti...');
  try {
    const res = await api('changePassword', { currentPassword: current, newPassword: next });
    saveSession(res.token);
    form.reset();
    toast('Password diganti. Perangkat lain otomatis keluar.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setButtonBusy(btn, false);
  }
}

function setResetStep(step) {
  setHidden('resetStep1', step !== 1);
  setHidden('resetStep2', step !== 2);
  byId('resetDot1').className = `flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-extrabold ${step === 1 ? 'bg-ink text-bg' : 'bg-income-soft text-income'}`;
  byId('resetDot2').className = `flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-extrabold ${step === 2 ? 'bg-ink text-bg' : 'bg-surface-2 text-muted'}`;
}

function openResetModal() {
  backToResetStep1();
  byId('resetUsername').value = byId('loginUsername').value.trim();
  openSheet('resetSheet');
}

function closeResetModal() {
  closeSheet('resetSheet');
}

function backToResetStep1() {
  setResetStep(1);
  byId('resetCode').value = '';
  byId('resetNewPassword').value = '';
  byId('resetNewPassword').type = 'password';
}

async function submitResetRequest() {
  const username = byId('resetUsername').value.trim();
  if (!username) {
    toast('Username wajib diisi.', 'error');
    return;
  }
  const btn = byId('btnResetRequest');
  setButtonBusy(btn, true, 'Mengirim...');
  try {
    const res = await api('requestPasswordReset', { username: username });
    setText('resetMaskedEmail', res.email);
    setResetStep(2);
    toast('Kode sudah dikirim. Cek inbox atau folder spam.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setButtonBusy(btn, false);
  }
}

async function submitResetConfirm() {
  const username = byId('resetUsername').value.trim();
  const code = byId('resetCode').value.trim();
  const pass = byId('resetNewPassword').value;
  if (!/^\d{6}$/.test(code)) {
    toast('Kode verifikasi harus 6 digit angka.', 'error');
    return;
  }
  if (pass.length < 6) {
    toast('Password baru minimal 6 karakter.', 'error');
    return;
  }
  const btn = byId('btnResetConfirm');
  setButtonBusy(btn, true, 'Menyimpan...');
  try {
    await api('resetPassword', { username: username, code: code, newPassword: pass });
    closeResetModal();
    byId('loginUsername').value = username;
    byId('loginPassword').value = '';
    toast('Password baru tersimpan. Silakan masuk.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setButtonBusy(btn, false);
  }
}

function openAutoListModal() {
  closeHeaderMenu();
  renderAutoTrxList();
  openSheet('autoListSheet');
}

function closeAutoListModal() {
  closeSheet('autoListSheet');
}

function openAutoFormModal() {
  byId('autoTrxForm').reset();
  setAutoType('Pengeluaran');
  toggleAutoFreq();
  toggleAutoEnd();
  openSheet('autoFormSheet');
}

function closeAutoFormModal() {
  closeSheet('autoFormSheet');
}

function toggleAutoFreq() {
  const val = byId('autoFreq').value;
  setHidden('fieldAutoFreqVal', val === 'Harian');
  setHidden('autoFreqValWeekly', val !== 'Mingguan');
  setHidden('autoFreqValMonthly', val !== 'Bulanan');
  setText('labelAutoFreqVal', val === 'Bulanan' ? 'Tanggal' : 'Hari');
  byId('labelAutoFreqVal').setAttribute('for', val === 'Bulanan' ? 'autoFreqValMonthly' : 'autoFreqValWeekly');
}

function toggleAutoEnd() {
  setHidden('fieldAutoEnd', byId('autoEndType').value !== 'Tanggal');
}

function setAutoType(type) {
  byId('autoTrxType').value = type;
  setActive('autoTypeSeg', (btn) => btn.dataset.type === type);
  toggleAutoFields();
}

function categoriesFor(type) {
  return rawCategories.filter((c) => c.type && c.type.trim().toLowerCase() === type.toLowerCase());
}

function fillCategorySelect(sel, type) {
  if (!sel) return;
  sel.innerHTML = '';
  categoriesFor(type).forEach((cat) => sel.add(new Option(cat.name, cat.id)));
}

function toggleAutoFields() {
  const type = byId('autoTrxType').value;
  setHidden('autoFieldFrom', type === 'Pemasukan');
  setHidden('autoFieldTo', type === 'Pengeluaran');
  setHidden('autoFieldCategory', type === 'Transfer');
  if (type !== 'Transfer') fillCategorySelect(byId('autoTrxCategory'), type);
  updateAutoNoteHint();
}

async function handleAutoFormSubmit(e) {
  e.preventDefault();
  const form = byId('autoTrxForm');
  const type = byId('autoTrxType').value;
  const amount = parseRupiah(form.amount.value);
  const from = form.accountFrom.value;
  const to = form.accountTo.value;
  const cat = form.category.value;
  const note = form.note.value.trim();
  const freq = form.freq.value;
  const endType = form.endType.value;
  let freqVal = '';
  if (freq === 'Mingguan') freqVal = form.freqValWeekly.value;
  if (freq === 'Bulanan') freqVal = form.freqValMonthly.value;
  const tenggat = endType === 'Tanggal' ? form.endDate.value : 'Selamanya';

  let problem = '';
  if (!amount) problem = 'Nominal wajib diisi.';
  else if (type === 'Pengeluaran' && (!from || !cat)) problem = 'Pilih rekening asal dan kategorinya dulu.';
  else if (type === 'Pemasukan' && (!to || !cat)) problem = 'Pilih rekening tujuan dan kategorinya dulu.';
  else if (type === 'Transfer' && (!from || !to)) problem = 'Pilih rekening asal dan tujuan dulu.';
  else if (type === 'Transfer' && from === to) problem = 'Rekening asal dan tujuan nggak boleh sama.';
  else if (freq === 'Bulanan' && (!(parseInt(freqVal, 10) >= 1) || parseInt(freqVal, 10) > 31)) problem = 'Tanggal bulanan harus 1 sampai 31.';
  else if (endType === 'Tanggal' && !tenggat) problem = 'Isi tanggal berakhirnya dulu.';
  else if (!note) problem = 'Catatan wajib diisi.';
  if (problem) {
    toast(problem, 'error');
    return;
  }
  if (type !== 'Transfer' && piutangGroupForCat(cat) && !isValidPiutangNote(note)) {
    piutangNoteFormatAlert(piutangGroupForCat(cat));
    return;
  }

  const btn = byId('btnAutoSubmit');
  setButtonBusy(btn, true, 'Menyimpan...');
  try {
    await runWrite('saveAutoTransaction', { type: type, amount: String(amount), accountFrom: from, accountTo: to, category: cat, note: note, freq: freq, freqVal: freqVal, tenggat: tenggat });
    closeAutoFormModal();
    toast('Rencana otomatis aktif. Biar sistem yang ingat.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setButtonBusy(btn, false);
  }
}

async function toggleAutoTrxStatus(id) {
  const item = rawAutoTrx.find((a) => a.id === id);
  if (!item) return;
  const next = item.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
  item.status = next;
  renderAutoTrxList();
  updateAutoBadge();
  try {
    await runWrite('toggleAutoTransaction', { id: id });
    toast(next === 'Aktif' ? 'Rencana aktif lagi.' : 'Rencana dijeda.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function confirmDeleteAuto(id) {
  const ok = await uiConfirm({
    title: 'Hapus rencana ini?',
    message: 'Transaksi yang sudah tercatat tetap aman, cuma jadwalnya yang dihapus.',
    tone: 'danger',
    confirmText: 'Hapus'
  });
  if (!ok) return;
  rawAutoTrx = rawAutoTrx.filter((a) => a.id !== id);
  renderAutoTrxList();
  updateAutoBadge();
  try {
    await runWrite('deleteAutoTransaction', { id: id });
    toast('Rencana dihapus.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function ensureOption(sel, value, label) {
  if (!sel || !value || value === '-' || hasOption(sel, value)) return;
  sel.add(new Option(`${label || value} (nonaktif)`, value));
}

function setTrxTypeValue(type) {
  byId('trxType').value = type;
  setActive('trxTypeSeg', (btn) => btn.dataset.type === type);
}

function setTrxType(type) {
  setTrxTypeValue(type);
  toggleFields();
}

function openModal(id, presetType) {
  closeHeaderMenu();
  const form = byId('trxForm');
  let trx = null;
  if (id) {
    trx = rawTransactions.find((t) => t.id === id);
    if (!trx) return;
    if (trx._pending) {
      toast('Transaksi ini masih disimpan. Tunggu sebentar, ya.', 'info');
      return;
    }
  }
  form.reset();
  byId('trxId').value = id || '';
  noteSubmitted = false;
  hideRepaymentBanner();
  setHidden('btnTrxDelete', !id);

  if (trx) {
    setText('trxModalTitle', 'Edit transaksi');
    setText('btnSubmit', 'Simpan perubahan');
    setTrxTypeValue(trx.type);
    toggleFields();
    form.date.value = trx.date;
    form.amount.value = Number(trx.amount).toLocaleString('id-ID');
    form.note.value = trx.note || '';
    if (trx.type !== 'Pemasukan') {
      ensureOption(form.accountFrom, trx.fromId, trx.fromName);
      form.accountFrom.value = trx.fromId;
    }
    if (trx.type !== 'Pengeluaran') {
      ensureOption(form.accountTo, trx.toId, trx.toName);
      form.accountTo.value = trx.toId;
    }
    if (trx.type !== 'Transfer') form.category.value = trx.catId;
    updateTrxBalances();
    updateNoteContext();
  } else {
    setText('trxModalTitle', 'Catat transaksi');
    setText('btnSubmit', 'Simpan transaksi');
    setTrxTypeValue(presetType || 'Pengeluaran');
    byId('trxDate').value = dateKey(new Date());
    toggleFields();
  }
  openSheet('trxSheet');
}

function closeModal() {
  closeSheet('trxSheet');
}

sheetCloseHooks.trxSheet = () => hideRepaymentBanner();

function openAccModal(id) {
  const form = byId('accForm');
  form.reset();
  const acc = id ? rawAccounts.find((a) => a.id === id) : null;
  if (acc) {
    byId('accId').value = acc.id;
    setText('accModalTitle', 'Edit rekening');
    if (!hasOption(form.type, acc.type)) form.type.add(new Option(acc.type, acc.type));
    form.type.value = acc.type;
    form.platform.value = acc.platform;
    form.subAccount.value = acc.subAccount;
    form.initialBalance.value = Number(acc.initialBalance).toLocaleString('id-ID');
    setHidden('fieldAccStatus', false);
    setAccStatus(acc.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif');
    setHidden('btnAccDelete', accountUsed(acc.id));
  } else {
    byId('accId').value = '';
    setText('accModalTitle', 'Tambah rekening');
    setHidden('fieldAccStatus', true);
    setHidden('btnAccDelete', true);
    setAccStatus('Aktif');
  }
  openSheet('accSheet');
}

function accountUsed(id) {
  return rawTransactions.some((t) => t.fromId === id || t.toId === id) || rawAutoTrx.some((a) => a.fromId === id || a.toId === id);
}

function setAccStatus(status) {
  byId('accStatus').value = status;
  byId('accStatusBtnAktif').classList.toggle('is-active', status === 'Aktif');
  byId('accStatusBtnNonaktif').classList.toggle('is-active', status === 'Nonaktif');
  setText('accStatusHint', status === 'Aktif'
    ? 'Rekening aktif ikut dihitung di total saldo dan muncul saat mencatat transaksi.'
    : 'Rekening nonaktif disembunyikan dari pencatatan dan nggak dihitung di total saldo.');
}

function closeAccModal() {
  closeSheet('accSheet');
}

async function handleAccSubmit(e) {
  e.preventDefault();
  const form = byId('accForm');
  const data = {
    id: byId('accId').value,
    type: form.type.value,
    platform: form.platform.value.trim(),
    subAccount: form.subAccount.value.trim(),
    initialBalance: String(parseRupiah(form.initialBalance.value)),
    status: form.status.value
  };
  if (!data.type || !data.platform || !data.subAccount || form.initialBalance.value.trim() === '') {
    toast('Lengkapi semua data rekening dulu, ya.', 'error');
    return;
  }
  const btn = byId('btnAccSubmit');
  setButtonBusy(btn, true, 'Menyimpan...');
  try {
    await runWrite('saveAccount', data);
    closeAccModal();
    toast(data.id ? 'Rekening diperbarui.' : 'Rekening baru siap dipakai.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setButtonBusy(btn, false);
  }
}

async function confirmDeleteAccount() {
  const id = byId('accId').value;
  const acc = rawAccounts.find((a) => a.id === id);
  if (!acc) return;
  if (accountUsed(id)) {
    uiAlert({ title: 'Belum bisa dihapus', message: 'Rekening ini masih punya riwayat transaksi. Nonaktifkan saja supaya riwayatnya tetap aman.', tone: 'warn' });
    return;
  }
  const ok = await uiConfirm({ title: `Hapus ${acc.subAccount}?`, message: 'Rekening ini belum pernah dipakai, jadi aman untuk dihapus.', tone: 'danger', confirmText: 'Hapus' });
  if (!ok) return;
  try {
    await runWrite('deleteAccount', { id: id });
    closeAccModal();
    toast('Rekening dihapus.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function toggleFields() {
  const type = byId('trxType').value;
  const isNew = !byId('trxId').value;
  setHidden('fieldFrom', type === 'Pemasukan');
  setHidden('fieldTo', type === 'Pengeluaran');
  setHidden('fieldCategory', type === 'Transfer');
  setHidden('fieldAdminFee', !(type === 'Transfer' && isNew));
  const elCat = byId('trxCategory');
  if (type === 'Transfer') elCat.innerHTML = '';
  else fillCategorySelect(elCat, type);
  applyAccountMemory();
  updateNoteContext();
}

function hasOption(selectEl, value) {
  if (!selectEl || !value) return false;
  return Array.from(selectEl.options).some((o) => o.value === value);
}

function getRecentAccounts(type, catId, dir, limit) {
  const found = [];
  const scan = (useCat) => {
    for (let i = rawTransactions.length - 1; i >= 0; i--) {
      if (found.length >= limit) return;
      const t = rawTransactions[i];
      if (t.type !== type) continue;
      if (useCat && catId && type !== 'Transfer' && t.catId !== catId) continue;
      const id = dir === 'from' ? t.fromId : t.toId;
      if (!id || id === '-') continue;
      const acc = accIndex[id];
      if (!acc || acc.status !== 'Aktif') continue;
      if (found.indexOf(id) === -1) found.push(id);
    }
  };
  scan(true);
  if (found.length < limit) scan(false);
  return found;
}

function renderRecentChips(dir, ids) {
  const box = byId(dir === 'from' ? 'recentFrom' : 'recentTo');
  const sel = byId(dir === 'from' ? 'accountFrom' : 'accountTo');
  if (!box || !sel) return;
  if (!ids || !ids.length) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `<span class="self-center pr-0.5 text-[12px] font-semibold text-muted">Terakhir:</span>` + ids.map((id) => {
    const acc = accIndex[id];
    if (!acc) return '';
    return `<button type="button" onclick="pickAccount('${dir}', ${jsArg(id)})" class="chip py-1 text-[12px] ${sel.value === id ? 'is-active' : ''}">${escapeHtml(acc.name)}</button>`;
  }).join('');
}

function pickAccount(dir, id) {
  const sel = byId(dir === 'from' ? 'accountFrom' : 'accountTo');
  if (!sel || !hasOption(sel, id)) return;
  sel.value = id;
  onAccountSelectChange(dir);
}

function onAccountSelectChange(dir) {
  const sel = byId(dir === 'from' ? 'accountFrom' : 'accountTo');
  if (!sel) return;
  if (accLock[dir]) {
    accPin[dir] = sel.value || '';
    store.set(`pk_pin_${dir}`, accPin[dir]);
  }
  if (!byId('trxId').value) {
    renderRecentChips(dir, getRecentAccounts(byId('trxType').value, byId('trxCategory').value, dir, 3));
  }
  updateTrxBalances();
}

function onCategoryChange() {
  if (!byId('trxId').value) applyAccountMemory();
  updateNoteContext();
}

function toggleAccLock(dir) {
  accLock[dir] = !accLock[dir];
  const sel = byId(dir === 'from' ? 'accountFrom' : 'accountTo');
  if (accLock[dir] && sel) accPin[dir] = sel.value || '';
  store.set(`pk_lock_${dir}`, String(accLock[dir]));
  store.set(`pk_pin_${dir}`, accPin[dir]);
  renderLockButtons();
  toast(accLock[dir] ? 'Rekening dikunci. Bakal jadi pilihan default.' : 'Kunci rekening dilepas.', 'info');
}

function renderLockButtons() {
  [['from', 'btnLockFrom'], ['to', 'btnLockTo']].forEach((pair) => {
    const btn = byId(pair[1]);
    if (!btn) return;
    const locked = accLock[pair[0]];
    btn.classList.toggle('is-active', locked);
    btn.innerHTML = `${locked ? ic('lock') : ic('lock-open')}<span>${locked ? 'Terkunci' : 'Kunci'}</span>`;
    btn.setAttribute('aria-pressed', String(locked));
  });
}

function applyAccountMemory() {
  const isNew = !byId('trxId').value;
  const type = byId('trxType').value;
  const catId = byId('trxCategory').value;
  renderLockButtons();
  ['from', 'to'].forEach((dir) => {
    const sel = byId(dir === 'from' ? 'accountFrom' : 'accountTo');
    const box = byId(dir === 'from' ? 'recentFrom' : 'recentTo');
    const lockBtn = byId(dir === 'from' ? 'btnLockFrom' : 'btnLockTo');
    if (!isNew) {
      if (box) box.innerHTML = '';
      setHidden(lockBtn, true);
      return;
    }
    setHidden(lockBtn, false);
    if (!sel) return;
    let recents = getRecentAccounts(type, catId, dir, 3);
    if (type === 'Transfer' && dir === 'to') {
      const fromVal = byId('accountFrom').value;
      recents = recents.filter((id) => id !== fromVal);
    }
    let target = '';
    if (accLock[dir] && hasOption(sel, accPin[dir])) target = accPin[dir];
    else if (recents.length) target = recents[0];
    if (target && hasOption(sel, target)) sel.value = target;
    renderRecentChips(dir, recents);
  });
  updateTrxBalances();
}

function buildLocalTrx(p, id) {
  const accName = (aid) => {
    const a = rawAccounts.find((x) => x.id === aid);
    return a ? a.subAccount : aid;
  };
  const catName = (cid) => {
    const c = rawCategories.find((x) => x.id === cid);
    return c ? c.name : cid;
  };
  let from = '-';
  let to = '-';
  let cat = p.category;
  if (p.type === 'Pemasukan') to = p.accountTo;
  else if (p.type === 'Pengeluaran') from = p.accountFrom;
  else {
    from = p.accountFrom;
    to = p.accountTo;
    cat = 'TRF01';
  }
  return {
    id: id, date: p.date, type: p.type, fromId: from, toId: to, catId: cat,
    fromName: accName(from), toName: accName(to), catName: catName(cat),
    amount: parseInt(p.amount, 10) || 0, note: p.note, _pending: true
  };
}

function applyOptimisticTrx(p) {
  if (p.id) {
    const idx = rawTransactions.findIndex((t) => t.id === p.id);
    if (idx > -1) rawTransactions[idx] = buildLocalTrx(p, p.id);
  } else {
    const stamp = Date.now();
    rawTransactions.push(buildLocalTrx(p, 'tmp_' + stamp));
    const fee = parseInt(p.adminFee, 10) || 0;
    if (p.type === 'Transfer' && fee > 0) {
      rawTransactions.push(buildLocalTrx({ type: 'Pengeluaran', date: p.date, accountFrom: p.accountFrom, category: 'KAT23', amount: String(fee), note: 'Biaya Admin Transfer: ' + p.note }, 'tmp_fee_' + stamp));
    }
  }
  buildMonthPicker();
  applyFilters();
}

function reopenTrxForm(p) {
  const editing = !!(p.id && rawTransactions.some((t) => t.id === p.id));
  openModal(editing ? p.id : '', p.type);
  const form = byId('trxForm');
  if (editing && byId('trxType').value !== p.type) setTrxType(p.type);
  form.date.value = p.date;
  form.amount.value = (parseInt(p.amount, 10) || 0).toLocaleString('id-ID');
  if (hasOption(form.accountFrom, p.accountFrom)) form.accountFrom.value = p.accountFrom;
  if (hasOption(form.accountTo, p.accountTo)) form.accountTo.value = p.accountTo;
  if (hasOption(form.category, p.category)) form.category.value = p.category;
  form.note.value = p.note || '';
  if (form.adminFee) form.adminFee.value = parseInt(p.adminFee, 10) > 0 ? parseInt(p.adminFee, 10).toLocaleString('id-ID') : '';
  updateTrxBalances();
  updateNoteContext();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const form = byId('trxForm');
  const type = byId('trxType').value;
  const id = byId('trxId').value;
  const date = form.date.value;
  const amount = parseRupiah(form.amount.value);
  const from = form.accountFrom.value;
  const to = form.accountTo.value;
  const cat = form.category.value;
  const note = form.note.value.trim();

  let problem = '';
  if (!date) problem = 'Tanggalnya diisi dulu, ya.';
  else if (!amount) problem = 'Nominalnya berapa? Isi dulu, ya.';
  else if (type === 'Pengeluaran' && (!from || !cat)) problem = 'Pilih rekening asal dan kategorinya dulu.';
  else if (type === 'Pemasukan' && (!to || !cat)) problem = 'Pilih rekening tujuan dan kategorinya dulu.';
  else if (type === 'Transfer' && (!from || !to)) problem = 'Pilih rekening asal dan tujuan dulu.';
  else if (type === 'Transfer' && from === to) problem = 'Rekening asal dan tujuan nggak boleh sama.';
  if (problem) {
    toast(problem, 'error');
    if (!amount) byId('trxAmount').focus();
    return;
  }

  if (type !== 'Transfer' && piutangGroupForCat(cat) && !isValidPiutangNote(note)) {
    noteSubmitted = true;
    validateTrxNote();
    await piutangNoteFormatAlert(piutangGroupForCat(cat));
    byId('trxNote').focus();
    return;
  }

  const payload = {
    id: id, type: type, date: date, amount: String(amount),
    accountFrom: from, accountTo: to, category: cat, note: note,
    adminFee: String(parseRupiah(form.adminFee.value))
  };
  applyOptimisticTrx(payload);
  closeModal();
  try {
    await runWrite('saveTransaction', payload);
    toast(id ? 'Perubahan tersimpan.' : 'Tercatat! Catatanmu makin rapi.', 'ok');
  } catch (err) {
    toast(err.message, { tone: 'error', action: { label: 'Buka lagi', fn: () => reopenTrxForm(payload) } });
  }
}

async function deleteTransactionById(id) {
  const ok = await uiConfirm({
    title: 'Hapus transaksi ini?',
    message: 'Setelah dihapus, datanya nggak bisa balik lagi.',
    tone: 'danger',
    confirmText: 'Hapus'
  });
  if (!ok) return false;
  rawTransactions = rawTransactions.filter((t) => t.id !== id);
  applyFilters();
  try {
    await runWrite('deleteTransaction', { id: id });
    toast('Transaksi dihapus.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
  return true;
}

async function deleteFromModal() {
  const id = byId('trxId').value;
  if (!id) return;
  closeModal();
  await deleteTransactionById(id);
}

function confirmDelete(id, event) {
  if (event) event.stopPropagation();
  deleteTransactionById(id);
}

function piutangNoteFormatAlert(grpInfo) {
  return uiAlert({
    title: 'Format catatannya belum pas',
    message: `Kategori ini pakai format "Label: keterangan" supaya pelunasan bisa dicocokkan otomatis. Contoh: ${piutangNoteExample(grpInfo.prefix, grpInfo.role)}`,
    tone: 'warn',
    icon: 'tag',
    confirmText: 'Oke, aku perbaiki'
  });
}

function piutangLastActivity(p) {
  const outTime = p.lastOut ? p.lastOut.getTime() : 0;
  const inTime = p.lastIn ? p.lastIn.getTime() : 0;
  return outTime > inTime ? outTime : inTime;
}

function setNoteInputState(state) {
  const input = byId('trxNote');
  if (input) input.classList.toggle('is-error', state === 'error');
}

function updateNoteContext() {
  const type = byId('trxType').value;
  const input = byId('trxNote');
  const grpInfo = type === 'Transfer' ? null : piutangGroupForCat(byId('trxCategory').value);
  if (!grpInfo) {
    noteContext = null;
    setHidden('noteRequiredBadge', true);
    setHidden('noteHelp', true);
    input.placeholder = 'Opsional, misal: kopi sama tim';
    setNoteInputState('neutral');
    return;
  }
  noteContext = { grp: grpInfo, analysis: piutangAnalysisFor(grpInfo.prefix), chips: [] };
  setHidden('noteRequiredBadge', false);
  setHidden('noteHelp', false);
  input.placeholder = 'Contoh: ' + piutangNoteExample(grpInfo.prefix, grpInfo.role);
  renderNoteLabelChips();
  validateTrxNote();
}

function renderNoteLabelChips() {
  const wrap = byId('noteLabelWrap');
  const box = byId('noteLabelChips');
  if (!wrap || !box || !noteContext) return;
  const grpInfo = noteContext.grp;
  const analysis = noteContext.analysis;
  const chips = [];
  const seen = {};
  const push = (label, meta) => {
    const key = String(label).toLowerCase();
    if (seen[key] || chips.length >= 8) return;
    seen[key] = true;
    chips.push({ label: label, meta: meta });
  };
  if (grpInfo.role === 'in') {
    analysis.openParties.filter((p) => p.labeled).forEach((p) => push(p.name, formatRupiah(p.outstanding)));
    setText('noteLabelTitle', 'Yang masih punya sisa');
  } else {
    if (grpInfo.prefix === 'Talangan') push(piutangTodayCode(), 'Hari ini');
    analysis.parties.filter((p) => p.labeled).slice()
      .sort((x, y) => piutangLastActivity(y) - piutangLastActivity(x))
      .forEach((p) => push(p.name, p.outstanding > 0 ? formatRupiah(p.outstanding) : ''));
    setText('noteLabelTitle', 'Label terakhir dipakai');
  }
  noteContext.chips = chips;
  wrap.hidden = chips.length === 0;
  box.innerHTML = chips.map((c, i) => `
    <button type="button" onclick="applyNoteLabelAt(${i})" class="chip py-1 text-[12px]">
      <span>${escapeHtml(c.label)}</span>${c.meta ? `<span class="num text-[11px] font-medium text-muted">${escapeHtml(c.meta)}</span>` : ''}
    </button>`).join('');
}

function applyNoteLabelAt(i) {
  if (!noteContext || !noteContext.chips[i]) return;
  const input = byId('trxNote');
  const current = input.value.replace(/^\s*\[AUTO\]\s*/i, '');
  const idx = current.indexOf(':');
  const desc = idx >= 0 ? current.slice(idx + 1).trim() : current.trim();
  input.value = noteContext.chips[i].label + ': ' + desc;
  input.focus();
  try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
  validateTrxNote();
}

const NOTE_TONES = {
  neutral: { text: 'text-muted', ic: 'info' },
  error: { text: 'text-expense', ic: 'warning' },
  warn: { text: 'text-warn', ic: 'warning-circle' },
  ok: { text: 'text-income', ic: 'check-circle' },
  info: { text: 'text-info', ic: 'plus-circle' }
};

function validateTrxNote() {
  const status = byId('noteStatus');
  const input = byId('trxNote');
  if (!status || !input || !noteContext) {
    setNoteInputState('neutral');
    return true;
  }
  const grpInfo = noteContext.grp;
  const analysis = noteContext.analysis;
  const valid = isValidPiutangNote(input.value);
  const editing = !!byId('trxId').value;
  const example = escapeHtml(piutangNoteExample(grpInfo.prefix, grpInfo.role));
  let tone = 'neutral';
  let msg = '';

  if (!valid) {
    if (noteSubmitted) {
      tone = 'error';
      msg = `Formatnya belum pas. Tulis label, titik dua, lalu keterangan. Contoh: <b>${example}</b>`;
    } else {
      msg = grpInfo.role === 'in'
        ? 'Pakai label yang sama dengan transaksi awalnya supaya pelunasan langsung cocok.'
        : 'Tulis label lalu titik dua. Label ini dipakai buat mencocokkan pelunasan nanti.';
    }
  } else {
    const label = piutangLabel(input.value);
    const party = analysis.parties.find((p) => p.labeled && p.name.toLowerCase() === label.toLowerCase());
    const name = escapeHtml(party ? party.name : label);
    if (grpInfo.role === 'in') {
      if (party && party.outstanding > 0) {
        tone = 'ok';
        msg = `<b>${name}</b> terdeteksi. Sisa yang belum kembali ${formatRupiah(party.outstanding)}.`;
      } else if (party && editing) {
        tone = 'ok';
        msg = `<b>${name}</b> terdeteksi.`;
      } else if (party) {
        tone = 'warn';
        msg = `<b>${name}</b> sudah lunas. Yakin pelunasan ini buat dia?`;
      } else {
        tone = 'warn';
        msg = `Label <b>${name}</b> belum pernah tercatat. Cek lagi penulisannya.`;
      }
    } else if (party) {
      tone = 'ok';
      msg = party.outstanding > 0
        ? `<b>${name}</b> terdeteksi. Sisa saat ini ${formatRupiah(party.outstanding)}.`
        : `<b>${name}</b> terdeteksi dan saat ini sudah lunas.`;
    } else {
      tone = 'info';
      msg = `Label <b>${name}</b> baru, bakal tercatat sebagai orang baru.`;
    }
  }

  const t = NOTE_TONES[tone];
  status.className = `mt-2 flex items-start gap-1.5 text-[12px] font-semibold leading-relaxed ${t.text}`;
  status.innerHTML = `${ic(t.ic, 'mt-0.5')}<span>${msg}</span>`;
  setNoteInputState(tone === 'error' ? 'error' : 'neutral');
  return valid;
}

function hideRepaymentBanner() {
  repaymentContext = null;
  setHidden('trxContextBanner', true);
}

function openRepaymentModal(prefix, idx) {
  const analysis = piutangAnalysisCache[prefix];
  const cfg = PIUTANG_GROUPS[prefix];
  if (!analysis || !cfg || !analysis.outstanding[idx]) return;
  const item = analysis.outstanding[idx];
  openModal('', 'Pemasukan');
  const form = byId('trxForm');
  const catEl = byId('trxCategory');
  if (hasOption(catEl, cfg.in)) catEl.value = cfg.in;
  form.note.value = item.note || '';
  applyAccountMemory();
  updateNoteContext();
  setText('trxModalTitle', 'Catat pelunasan');
  repaymentContext = { remaining: item.remaining };
  setText('ctxParty', item.party);
  setText('ctxDetail', `${piutangDateText(item.date)} · sisa ${formatRupiah(item.remaining)}`);
  setHidden('trxContextBanner', false);
}

function fillRepaymentAmount() {
  if (!repaymentContext) return;
  const amountEl = byId('trxAmount');
  amountEl.value = Math.round(repaymentContext.remaining).toLocaleString('id-ID');
  amountEl.focus();
}

function updateAutoNoteHint() {
  const hint = byId('autoNoteHint');
  const noteEl = byId('autoTrxNote');
  const type = byId('autoTrxType').value;
  const grpInfo = type === 'Transfer' ? null : piutangGroupForCat(byId('autoTrxCategory').value);
  if (!grpInfo) {
    hint.hidden = true;
    hint.innerHTML = '';
    noteEl.placeholder = 'Wajib diisi, misal: langganan internet';
    return;
  }
  const example = piutangNoteExample(grpInfo.prefix, grpInfo.role);
  hint.innerHTML = `${ic('tag')} Kategori ini pakai format <b>Label: keterangan</b>. Contoh: <b>${escapeHtml(example)}</b>`;
  hint.hidden = false;
  noteEl.placeholder = 'Contoh: ' + example;
}
