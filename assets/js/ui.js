const byId = (id) => document.getElementById(id);

function ic(name, cls) {
  return `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function setHidden(el, hidden) {
  const node = typeof el === 'string' ? byId(el) : el;
  if (node) node.hidden = !!hidden;
}

function setText(id, text) {
  const el = byId(id);
  if (el) el.textContent = text;
}

function setActive(container, matcher) {
  const root = typeof container === 'string' ? byId(container) : container;
  if (!root) return;
  root.querySelectorAll('.seg-btn').forEach((btn) => btn.classList.toggle('is-active', matcher(btn)));
}

function escapeHtml(str) {
  return String(str === null || str === undefined ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function jsArg(value) {
  return escapeHtml(JSON.stringify(String(value === null || value === undefined ? '' : value)));
}

function setButtonBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) {
    if (!btn.dataset.label) btn.dataset.label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = ic('circle-notch', 'spin') + (label ? `<span>${escapeHtml(label)}</span>` : '');
  } else {
    btn.disabled = false;
    if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    delete btn.dataset.label;
  }
}

const sheetStack = [];
const sheetCloseHooks = {};
let popToIgnore = 0;

function isSheetOpen(id) {
  const el = byId(id);
  return !!(el && el.classList.contains('is-open'));
}

function openSheet(id) {
  const el = byId(id);
  if (!el || el.classList.contains('is-open')) return;
  el.style.zIndex = String(60 + sheetStack.length * 2);
  el._returnFocus = document.activeElement;
  el.querySelectorAll('.sheet-body').forEach((b) => { b.scrollTop = 0; });
  el.classList.add('is-open');
  sheetStack.push(id);
  document.documentElement.classList.add('is-locked');
  try {
    history.pushState({ pkSheet: id }, '');
  } catch (e) {}
  const panel = el.querySelector('.sheet-panel');
  if (panel) {
    panel.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => {
      try { panel.focus({ preventScroll: true }); } catch (e) {}
    });
  }
}

function closeSheet(id, fromPop) {
  const el = byId(id);
  if (!el || !el.classList.contains('is-open')) return;
  el.classList.remove('is-open');
  const idx = sheetStack.lastIndexOf(id);
  if (idx > -1) sheetStack.splice(idx, 1);
  if (!sheetStack.length) document.documentElement.classList.remove('is-locked');
  if (!fromPop && history.state && history.state.pkSheet) {
    popToIgnore++;
    history.back();
  }
  if (sheetCloseHooks[id]) sheetCloseHooks[id]();
  if (el._returnFocus && typeof el._returnFocus.focus === 'function' && document.contains(el._returnFocus)) {
    try { el._returnFocus.focus({ preventScroll: true }); } catch (e) {}
  }
}

window.addEventListener('popstate', () => {
  if (popToIgnore > 0) {
    popToIgnore--;
    return;
  }
  const top = sheetStack[sheetStack.length - 1];
  if (top) closeSheet(top, true);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const top = sheetStack[sheetStack.length - 1];
  if (top) {
    e.preventDefault();
    closeSheet(top);
  } else if (typeof closeHeaderMenu === 'function') {
    closeHeaderMenu();
  }
});

const TOAST_TONES = {
  ok: { icon: 'check-circle-fill', cls: 'text-lime' },
  error: { icon: 'warning-circle-fill', cls: 'text-[#FF8A7A]' },
  info: { icon: 'info-fill', cls: 'text-white/70' }
};

function toast(message, opts) {
  const options = typeof opts === 'string' ? { tone: opts } : (opts || {});
  const tone = TOAST_TONES[options.tone] || TOAST_TONES.info;
  const root = byId('toastRoot');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', options.tone === 'error' ? 'alert' : 'status');
  el.innerHTML = `${ic(tone.icon, 'text-xl ' + tone.cls)}<span class="flex-1">${escapeHtml(message)}</span>`;
  if (options.action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-bold text-lime';
    btn.textContent = options.action.label;
    btn.onclick = () => {
      dismiss();
      options.action.fn();
    };
    el.appendChild(btn);
  }
  root.appendChild(el);
  while (root.children.length > 3) root.removeChild(root.firstChild);
  let gone = false;
  function dismiss() {
    if (gone) return;
    gone = true;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 220);
  }
  el.addEventListener('click', (e) => { if (e.target === el) dismiss(); });
  setTimeout(dismiss, options.duration || (options.action ? 6000 : 3200));
  return dismiss;
}

const DIALOG_TONES = {
  danger: { icon: 'trash', badge: 'bg-expense-soft text-expense', btn: 'btn-danger' },
  warn: { icon: 'warning', badge: 'bg-warn-soft text-warn', btn: 'btn-primary' },
  primary: { icon: 'info', badge: 'bg-lime/40 text-ink', btn: 'btn-primary' },
  ok: { icon: 'check-circle', badge: 'bg-income-soft text-income', btn: 'btn-primary' }
};

let dialogSeq = 0;

function uiDialog(opts) {
  return new Promise((resolve) => {
    const id = 'dlg' + (++dialogSeq);
    const tone = DIALOG_TONES[opts.tone] || DIALOG_TONES.primary;
    const icon = opts.icon || tone.icon;
    const hasInput = !!opts.input;
    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.className = 'sheet';
    wrap.setAttribute('role', 'alertdialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML = `
      <div class="sheet-backdrop" data-act="cancel"></div>
      <div class="sheet-panel">
        <div class="sheet-handle"></div>
        <form class="contents" novalidate>
          <div class="sheet-body pt-4">
            <span class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${tone.badge}">${ic(icon)}</span>
            <h2 class="text-xl font-extrabold tracking-tight">${escapeHtml(opts.title || '')}</h2>
            ${opts.message ? `<p class="sub mt-2 text-[14px]">${escapeHtml(opts.message)}</p>` : ''}
            ${opts.html ? `<div class="mt-3">${opts.html}</div>` : ''}
            ${hasInput ? `
              <div class="mt-4">
                ${opts.input.label ? `<label class="label" for="${id}-input">${escapeHtml(opts.input.label)}</label>` : ''}
                <div class="${opts.input.money ? 'field-money' : ''}">
                  ${opts.input.money ? '<span>Rp</span>' : ''}
                  <input id="${id}-input" class="field num" type="text" inputmode="${opts.input.inputmode || 'text'}" autocomplete="off" placeholder="${escapeHtml(opts.input.placeholder || '')}" value="${escapeHtml(opts.input.value || '')}">
                </div>
                <p class="mt-2 text-[12px] font-semibold text-expense" data-error hidden></p>
              </div>` : ''}
          </div>
          <div class="sheet-foot flex gap-2">
            ${opts.cancelText === false ? '' : `<button type="button" class="btn btn-soft flex-1" data-act="cancel">${escapeHtml(opts.cancelText || 'Batal')}</button>`}
            <button type="submit" class="btn ${opts.confirmClass || tone.btn} flex-1">${escapeHtml(opts.confirmText || 'Oke')}</button>
          </div>
        </form>
      </div>`;
    byId('dialogRoot').appendChild(wrap);
    const input = hasInput ? wrap.querySelector('input') : null;
    if (input && opts.input.money) input.addEventListener('input', formatRupiahInput);
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      delete sheetCloseHooks[id];
      closeSheet(id);
      setTimeout(() => wrap.remove(), 400);
      resolve(value);
    };
    sheetCloseHooks[id] = () => {
      if (!settled) {
        settled = true;
        delete sheetCloseHooks[id];
        setTimeout(() => wrap.remove(), 400);
        resolve(hasInput ? null : false);
      }
    };
    wrap.querySelectorAll('[data-act=cancel]').forEach((el) => el.addEventListener('click', () => finish(hasInput ? null : false)));
    wrap.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!hasInput) return finish(true);
      const err = opts.validate ? opts.validate(input.value) : '';
      const errEl = wrap.querySelector('[data-error]');
      if (err) {
        errEl.textContent = err;
        errEl.hidden = false;
        input.classList.add('is-error');
        return;
      }
      finish(input.value);
    });
    requestAnimationFrame(() => {
      openSheet(id);
      if (input) setTimeout(() => input.focus(), 120);
    });
  });
}

function uiConfirm(opts) {
  return uiDialog(opts);
}

function uiAlert(opts) {
  return uiDialog(Object.assign({ cancelText: false, confirmText: 'Oke, paham' }, opts));
}

function uiPrompt(opts) {
  return uiDialog(opts);
}
