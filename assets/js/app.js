function showScreen(name) {
  setHidden('screenBoot', name !== 'boot');
  setHidden('screenLogin', name !== 'login');
  setHidden('screenMain', name !== 'main');
  if (name === 'main') requestAnimationFrame(measureHeader);
  window.scrollTo(0, 0);
}

function measureHeader() {
  const header = byId('appHeader');
  if (header && header.offsetHeight) document.documentElement.style.setProperty('--hdr', header.offsetHeight + 'px');
}

function enterApp(opts) {
  const o = opts || {};
  currentUser = session.profile ? (session.profile.nama_lengkap || session.profile.username) : null;
  showScreen('main');
  updateHeaderIdentity();
  switchTab('home');
  const snap = o.fresh ? null : loadSnapshot();
  if (snap) applyData(snap.data, { save: false });
  else renderSkeletons();
  loadData();
  if (o.fresh) toast(`Hai ${firstName()}, selamat datang lagi!`, 'ok');
}

function onSessionExpired(message) {
  if (!session.token) return;
  handleLogout(message || 'Sesi kamu sudah habis. Masuk lagi, yuk.');
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

function bindEvents() {
  ['trxAmount', 'trxAdminFee', 'accInitialBalance', 'autoTrxAmount'].forEach((id) => {
    byId(id).addEventListener('input', formatRupiahInput);
  });
  byId('resetCode').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
  });
  byId('profileForm').addEventListener('input', () => { profileTouched = true; });

  document.addEventListener('click', (e) => {
    const menu = byId('headerMenu');
    const avatar = byId('avatarBtn');
    if (menu && !menu.hidden && !menu.contains(e.target) && !avatar.contains(e.target)) closeHeaderMenu();
  });

  window.addEventListener('resize', measureHeader);

  window.addEventListener('online', () => {
    toast('Kamu online lagi.', 'ok');
    if (session.token) loadData();
  });
  window.addEventListener('offline', () => {
    toast('Lagi offline. Data yang tampil dari simpanan terakhir.', 'info');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !session.token || !dataReady) return;
    setHeaderTitle(currentTab);
    if (Date.now() - lastSyncAt > 120000) loadData();
  });

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      syncThemeColor();
      if (currentTab === 'insight' && overviewChartInstance) {
        try { renderOverviewChart(); } catch (e) {}
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  setActive('themeSeg', (btn) => btn.dataset.themeOpt === getTheme());
  syncThemeColor();
  syncObscureIcons();
  renderLockButtons();
  buildMonthPicker();
  updateAllPickerLabels();
  if (session.token) enterApp();
  else showScreen('login');
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureHeader);
  let flash = null;
  try {
    flash = sessionStorage.getItem('pk_flash');
    sessionStorage.removeItem('pk_flash');
  } catch (e) {}
  if (flash) toast(flash, 'info');
  registerServiceWorker();
});
