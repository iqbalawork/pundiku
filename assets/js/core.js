const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  },
  getJson(key) {
    try {
      return JSON.parse(store.get(key, 'null'));
    } catch (e) {
      return null;
    }
  }
};

const session = {
  token: store.get('pk_token', ''),
  profile: store.getJson('pk_profile')
};

let currentUser = null;
let rawAccounts = [];
let rawTransactions = [];
let rawCategories = [];
let rawAutoTrx = [];
let dataReady = false;
let lastServerData = null;
let currentHistFilter = 'Semua';
let currentInsightFilter = 'Semua';
let currentWalletFilter = 'Aktif';
let budgetLimit = parseInt(store.get('pk_budget', '5000000'), 10) || 5000000;
let isObscured = store.get('pk_obscured', 'false') === 'true';

let selectedHiCats = [];
let selectedHiAccs = [];
let selectedInTypes = [];
let selectedInAccs = [];
let selectedInCats = [];

let accIndex = {};
let insightPeriodMode = 'month';
let insCalYear = new Date().getFullYear();
let insCalMonth = new Date().getMonth();
let insightDayMap = {};

let accLock = {
  from: store.get('pk_lock_from', 'false') === 'true',
  to: store.get('pk_lock_to', 'false') === 'true'
};
let accPin = {
  from: store.get('pk_pin_from', ''),
  to: store.get('pk_pin_to', '')
};

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const TAB_META = {
  home: { title: '', sub: '' },
  wallet: { title: 'Dompet', sub: 'Semua rekening di satu tempat' },
  insight: { title: 'Insight', sub: 'Baca pola duitmu' },
  history: { title: 'Riwayat', sub: 'Jejak semua transaksi' }
};

let currentTab = 'home';
let tabDirty = { home: true, wallet: true, insight: true, history: true };
const tabScroll = { home: 0, wallet: 0, insight: 0, history: 0 };
let renderPayload = null;
let filterTimer = null;

const HISTORY_PAGE = 25;
let historyData = [];
let historyShown = HISTORY_PAGE;

function saveSession(token, profile) {
  if (token) {
    session.token = token;
    store.set('pk_token', token);
  }
  if (profile) {
    session.profile = profile;
    store.set('pk_profile', JSON.stringify(profile));
    currentUser = profile.nama_lengkap || profile.username;
  }
}

function clearSession() {
  session.token = '';
  session.profile = null;
  ['pk_token', 'pk_profile', 'pk_snapshot'].forEach(store.remove);
}

function getTheme() {
  const t = store.get('pk_theme', 'system');
  return t === 'light' || t === 'dark' ? t : 'system';
}

function setTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
  store.set('pk_theme', theme);
  setActive('themeSeg', (btn) => btn.dataset.themeOpt === theme);
  syncThemeColor();
}

function isDarkMode() {
  const t = getTheme();
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function syncThemeColor() {
  const color = isDarkMode() ? '#0B0D0A' : '#F6F7F2';
  document.querySelectorAll('meta[name=theme-color]').forEach((m) => {
    m.setAttribute('content', color);
    m.removeAttribute('media');
  });
}

function syncObscureIcons() {
  document.querySelectorAll('.obscure-icon use').forEach((u) => u.setAttribute('href', isObscured ? '#i-eye-slash' : '#i-eye'));
}

function greetingText() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function firstName() {
  const name = String(currentUser || '').trim();
  return name ? name.split(/\s+/)[0] : 'kamu';
}

function initials() {
  return String(currentUser || 'P').trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || 'P';
}

function updateHeaderIdentity() {
  const ini = initials();
  ['avatarInitials', 'menuAvatar', 'profileAvatar'].forEach((id) => setText(id, ini));
  document.querySelectorAll('.welcomeText').forEach((el) => { el.textContent = currentUser || 'PundiKu'; });
  setText('menuUsername', session.profile ? '@' + session.profile.username : '');
  setHeaderTitle(currentTab);
}

function setHeaderTitle(tabId) {
  const meta = TAB_META[tabId] || TAB_META.home;
  if (tabId === 'home') {
    setText('headerGreeting', greetingText());
    setText('headerTitle', `Halo, ${firstName()}`);
  } else {
    setText('headerGreeting', meta.sub);
    setText('headerTitle', meta.title);
  }
}

function toggleHeaderMenu(e) {
  if (e) e.stopPropagation();
  const menu = byId('headerMenu');
  if (!menu) return;
  menu.hidden = !menu.hidden;
  byId('avatarBtn').setAttribute('aria-expanded', String(!menu.hidden));
}

function closeHeaderMenu() {
  const menu = byId('headerMenu');
  if (menu && !menu.hidden) {
    menu.hidden = true;
    byId('avatarBtn').setAttribute('aria-expanded', 'false');
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = byId(inputId);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  const use = btn ? btn.querySelector('use') : null;
  if (use) use.setAttribute('href', show ? '#i-eye-slash' : '#i-eye');
  if (btn) btn.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
}

function scheduleFilters() {
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(() => {
    filterTimer = null;
    applyFilters();
  }, 120);
}

function markAllTabsDirty() {
  tabDirty = { home: true, wallet: true, insight: true, history: true };
}

function renderActiveTab() {
  if (!renderPayload) return;
  const p = renderPayload;

  if (currentTab === 'home' && tabDirty.home) {
    tabDirty.home = false;
    renderCalendarActivity();
    renderTrxList(p.todayTrx, 'homeTodayTrxList', { empty: 'home' });
  }
  if (currentTab === 'wallet' && tabDirty.wallet) {
    tabDirty.wallet = false;
    renderAccountList();
  }
  if (currentTab === 'insight' && tabDirty.insight) {
    tabDirty.insight = false;
    renderInsightFilterChips();
    renderInsightCalendar(p.dailyNet, p.sDate, p.eDate);
    renderAccountExpense(p.expByAccount, p.exp);
    renderWeekdayPattern(p.weekdayAvg);
    renderCharts(p.expChart, p.exp);
    renderPiutangSummary(p.piutangData);
    renderPiutangLists(p);
    renderOverviewChart();
  }
  if (currentTab === 'history' && tabDirty.history) {
    tabDirty.history = false;
    historyShown = HISTORY_PAGE;
    renderHistoryList();
  }
}

function parseDate(str) {
  if (!str) return null;
  const parts = String(str).split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m - 1, d);
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateShort(str) {
  const d = parseDate(str);
  return d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : String(str || '');
}

function formatShortAmount(num) {
  if (isObscured) return '•••';
  const absNum = Math.abs(num);
  if (absNum >= 1000000000) return (absNum / 1000000000).toFixed(1).replace('.0', '').replace('.', ',') + 'M';
  if (absNum >= 1000000) return (absNum / 1000000).toFixed(1).replace('.0', '').replace('.', ',') + 'jt';
  if (absNum >= 1000) return (absNum / 1000).toFixed(0) + 'rb';
  return String(Math.round(absNum));
}

function toggleObscure() {
  isObscured = !isObscured;
  store.set('pk_obscured', String(isObscured));
  syncObscureIcons();
  toast(isObscured ? 'Nominal disembunyikan. Aman dari intipan.' : 'Nominal ditampilkan lagi.', 'info');
  if (dataReady) applyFilters();
}

function calculateAccBalance(accId) {
  if (accIndex[accId]) return accIndex[accId].balance;
  const acc = rawAccounts.find((a) => a.id === accId);
  if (!acc) return 0;
  let bal = acc.initialBalance;
  rawTransactions.forEach((trx) => {
    if (trx.type === 'Pemasukan' && trx.toId === accId) bal += trx.amount;
    if (trx.type === 'Pengeluaran' && trx.fromId === accId) bal -= trx.amount;
    if (trx.type === 'Transfer') {
      if (trx.fromId === accId) bal -= trx.amount;
      if (trx.toId === accId) bal += trx.amount;
    }
  });
  return bal;
}

function updateTrxBalances() {
  const type = byId('trxType').value;
  const fromEl = byId('accountFrom');
  const toEl = byId('accountTo');
  const balFromEl = byId('balanceFrom');
  const balToEl = byId('balanceTo');
  const showFrom = type === 'Pengeluaran' || type === 'Transfer';
  const showTo = type === 'Pemasukan' || type === 'Transfer';
  setHidden(balFromEl, !showFrom);
  setHidden(balToEl, !showTo);
  if (showFrom) balFromEl.textContent = fromEl.value ? `Saldo sekarang: ${formatRupiah(calculateAccBalance(fromEl.value))}` : '';
  if (showTo) balToEl.textContent = toEl.value ? `Saldo sekarang: ${formatRupiah(calculateAccBalance(toEl.value))}` : '';
}

function parseRupiah(value) {
  const n = parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function formatRupiahInput() {
  const value = this.value.replace(/[^0-9]/g, '');
  if (value === '') {
    this.value = '';
    return;
  }
  this.value = parseInt(value, 10).toLocaleString('id-ID');
}

const rupiahFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

function formatRupiah(number) {
  if (isObscured) return 'Rp ••••••';
  return rupiahFormatter.format(Math.round(number || 0)).replace(/ /g, ' ');
}

function formatCompact(number) {
  if (isObscured) return '•••';
  const abs = Math.abs(number || 0);
  const sign = number < 0 ? '-' : '';
  const fmt = (v, unit) => `${sign}${v.toLocaleString('id-ID', { maximumFractionDigits: v < 100 ? 1 : 0 })} ${unit}`;
  if (abs >= 1e9) return fmt(abs / 1e9, 'M');
  if (abs >= 1e6) return fmt(abs / 1e6, 'jt');
  if (abs >= 1e4) return fmt(abs / 1e3, 'rb');
  return sign + Math.round(abs).toLocaleString('id-ID');
}

function fmtPct(value, signed) {
  const v = Number(value) || 0;
  return `${signed && v > 0 ? '+' : ''}${v.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function switchTab(tabId) {
  if (!TAB_META[tabId]) return;
  closeHeaderMenu();
  if (tabId !== currentTab) tabScroll[currentTab] = window.scrollY;
  const changed = tabId !== currentTab;
  currentTab = tabId;

  Object.keys(TAB_META).forEach((t) => setHidden('tab-' + t, t !== tabId));
  document.querySelectorAll('#bottomNav .nav-btn').forEach((btn) => {
    const active = btn.dataset.target === tabId;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
    const use = btn.querySelector('use');
    if (use) use.setAttribute('href', '#i-' + (active ? btn.dataset.icOn : btn.dataset.ic));
  });

  setHeaderTitle(tabId);
  renderActiveTab();
  if (changed) window.scrollTo(0, tabScroll[tabId] || 0);
}

function setInsightFilter(type) {
  currentInsightFilter = type;
  ['Semua', 'Talangan', 'Teman', 'Keluarga'].forEach((t) => {
    const btn = byId(`ins-tab-${t}`);
    if (btn) btn.classList.toggle('is-active', t === type);
    setHidden(`insight-${t}`, t !== type);
  });
  const tab = byId('tab-insight');
  if (tab && window.scrollY > tab.offsetTop) window.scrollTo(0, 0);
}

function setHistoryFilter(type) {
  currentHistFilter = type;
  ['Semua', 'Pemasukan', 'Pengeluaran', 'Transfer'].forEach((t) => {
    const el = byId(`hist-tab-${t}`);
    if (el) el.classList.toggle('is-active', t === type);
  });
  historyShown = HISTORY_PAGE;
  renderHistoryList();
}

function setSyncing(on) {
  setHidden('syncIndicator', !on);
}
