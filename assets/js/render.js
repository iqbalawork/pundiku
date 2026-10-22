const TRX_STYLE = {
  Pemasukan: { ic: 'arrow-down-left', tone: 'bg-income-soft text-income', amt: 'text-income', sign: '+' },
  Pengeluaran: { ic: 'arrow-up-right', tone: 'bg-expense-soft text-expense', amt: 'text-expense', sign: '-' },
  Transfer: { ic: 'arrows-left-right', tone: 'bg-info-soft text-info', amt: 'text-ink', sign: '' }
};

const ACC_STYLE = {
  'Bank': { ic: 'bank', tone: 'bg-info-soft text-info' },
  'E-wallet': { ic: 'device-mobile', tone: 'bg-lime/40 text-ink' },
  'Tunai': { ic: 'money', tone: 'bg-income-soft text-income' },
  'Tunai / Cash': { ic: 'money', tone: 'bg-income-soft text-income' },
  'Investasi': { ic: 'trend-up', tone: 'bg-warn-soft text-warn' },
  'Kartu Kredit': { ic: 'credit-card', tone: 'bg-expense-soft text-expense' },
  default: { ic: 'wallet', tone: 'bg-surface-2 text-ink' }
};

const EMPTY_STATES = {
  home: { ic: 'coffee', title: 'Belum ada transaksi hari ini', sub: 'Dompet aman, santai dulu. Tap tombol + kalau ada yang mau dicatat.' },
  history: { ic: 'magnifying-glass', title: 'Nggak ada transaksi di sini', sub: 'Coba ubah rentang tanggal atau filternya.' },
  list: { ic: 'tray', title: 'Belum ada transaksi', sub: '' },
  walletActive: { ic: 'wallet', title: 'Belum ada rekening aktif', sub: 'Tambah rekening pertamamu dulu, yuk.' },
  walletInactive: { ic: 'archive', title: 'Nggak ada rekening nonaktif', sub: 'Semua rekeningmu lagi dipakai.' },
  auto: { ic: 'repeat', title: 'Belum ada rencana otomatis', sub: 'Gaji, langganan, atau tagihan rutin bisa tercatat sendiri sesuai jadwal.' },
  piutang: { ic: 'tray', title: 'Belum ada data', sub: 'Catat transaksi dengan kategori terkait buat lihat analisisnya.' },
  expense: { ic: 'leaf', title: 'Belum ada pengeluaran', sub: 'Periode ini masih bersih. Mantap!' }
};

function emptyState(key, extraCls) {
  const s = EMPTY_STATES[key] || EMPTY_STATES.list;
  return `
    <div class="flex flex-col items-center px-6 py-8 text-center ${extraCls || ''}">
      <span class="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-surface-2 text-2xl text-muted">${ic(s.ic)}</span>
      <p class="text-[15px] font-bold">${escapeHtml(s.title)}</p>
      ${s.sub ? `<p class="sub mt-1 max-w-[18rem]">${escapeHtml(s.sub)}</p>` : ''}
    </div>`;
}

function renderSkeletons() {
  const row = '<div class="card flex items-center gap-3 p-3.5"><div class="skeleton h-11 w-11 rounded-2xl"></div><div class="flex-1 space-y-2"><div class="skeleton h-3.5 w-2/3"></div><div class="skeleton h-3 w-1/3"></div></div><div class="skeleton h-4 w-16"></div></div>';
  const card = '<div class="card h-[148px] p-4"><div class="skeleton h-10 w-10 rounded-2xl"></div><div class="mt-6 space-y-2"><div class="skeleton h-3 w-1/2"></div><div class="skeleton h-4 w-3/4"></div></div></div>';
  byId('homeTodayTrxList').innerHTML = row.repeat(3);
  byId('historyTrxList').innerHTML = row.repeat(5);
  byId('walletAccountList').innerHTML = card.repeat(4);
}

function renderLoadError(message) {
  byId('homeTodayTrxList').innerHTML = `
    <div class="card flex flex-col items-center p-6 text-center">
      <span class="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-expense-soft text-2xl text-expense">${ic('wifi-slash')}</span>
      <p class="text-[15px] font-bold">Data belum bisa dimuat</p>
      <p class="sub mt-1">${escapeHtml(message)}</p>
      <button class="btn btn-primary btn-sm mt-4" onclick="loadData(true)">${ic('arrow-clockwise')}Coba lagi</button>
    </div>`;
}

function trxDetail(trx) {
  if (trx.type === 'Pemasukan') return `Masuk ke ${trx.toName}`;
  if (trx.type === 'Transfer') return `${trx.fromName} ke ${trx.toName}`;
  return `Dari ${trx.fromName}`;
}

function trxRow(trx, opts) {
  const o = opts || {};
  const st = TRX_STYLE[trx.type] || TRX_STYLE.Pengeluaran;
  const meta = (o.showDate ? formatDateShort(trx.date) + ' · ' : '') + trxDetail(trx);
  const pending = !!trx._pending;
  const action = o.onTap || `openModal(${jsArg(trx.id)})`;
  return `
    <div class="card row-tap flex cursor-pointer items-center gap-3 p-3.5 ${pending ? 'opacity-70' : ''}" role="button" tabindex="0" onclick="${action}" onkeydown="if(event.key==='Enter'){${action}}">
      <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-lg ${st.tone}">${ic(st.ic)}</span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-[15px] font-bold">${escapeHtml(trx.catName || trx.type)}</p>
        <p class="truncate text-[12px] font-medium text-muted">${escapeHtml(meta)}</p>
        ${trx.note ? `<p class="truncate text-[12px] font-medium text-subtle">${escapeHtml(trx.note)}</p>` : ''}
      </div>
      <div class="flex flex-shrink-0 flex-col items-end gap-0.5">
        <p class="num text-[15px] font-extrabold ${st.amt}">${st.sign}${formatRupiah(trx.amount)}</p>
        ${pending ? `<span class="flex items-center gap-1 text-[11px] font-semibold text-muted">${ic('circle-notch', 'spin')}menyimpan</span>` : ''}
      </div>
    </div>`;
}

function renderTrxList(trxData, elementId, opts) {
  const container = byId(elementId);
  if (!container) return;
  const o = opts || {};
  if (!trxData.length) {
    container.innerHTML = o.empty ? `<div class="card">${emptyState(o.empty)}</div>` : `<div class="card">${emptyState('list')}</div>`;
    return;
  }
  if (!o.group) {
    container.innerHTML = trxData.map((t) => trxRow(t, o)).join('');
    return;
  }
  let html = '';
  let i = 0;
  while (i < trxData.length) {
    const date = trxData[i].date;
    const items = [];
    while (i < trxData.length && trxData[i].date === date) items.push(trxData[i++]);
    let net = 0;
    items.forEach((t) => {
      if (t.type === 'Pemasukan') net += t.amount;
      else if (t.type === 'Pengeluaran') net -= t.amount;
    });
    const d = parseDate(date);
    const label = d ? d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : date;
    html += `
      <div class="flex items-center justify-between px-1 pb-1 pt-3 first:pt-0">
        <p class="text-[13px] font-bold text-muted">${escapeHtml(label)}</p>
        <p class="num text-[12px] font-bold ${net > 0 ? 'text-income' : net < 0 ? 'text-expense' : 'text-muted'}">${net > 0 ? '+' : net < 0 ? '-' : ''}${formatRupiah(Math.abs(net))}</p>
      </div>
      ${items.map((t) => trxRow(t, o)).join('')}`;
  }
  container.innerHTML = html;
}

function calCellHtml(day, total, opts) {
  const o = opts || {};
  let cls = 'bg-surface-2/70 text-ink';
  let display = '';
  if (o.out) {
    cls = 'bg-surface-2/40 text-subtle opacity-50';
  } else if (total > 0) {
    cls = 'bg-income-soft text-income';
    display = (isObscured ? '' : '+') + formatShortAmount(total);
  } else if (total < 0) {
    cls = 'bg-expense-soft text-expense';
    display = (isObscured ? '' : '-') + formatShortAmount(total);
  } else if (o.hasTrx) {
    cls = 'bg-info-soft text-info';
    display = '0';
  }
  const ring = o.today ? ' ring-2 ring-ink' : '';
  const inner = `<span class="text-left text-[11px] font-bold leading-none">${day}</span><span class="num self-end text-[9px] font-extrabold leading-none tracking-tight">${display}</span>`;
  if (o.onTap) return `<button type="button" class="cal-cell ${cls}${ring} active:scale-95" onclick="${o.onTap}" aria-label="Lihat transaksi tanggal ${day}">${inner}</button>`;
  return `<div class="cal-cell ${cls}${ring}">${inner}</div>`;
}

function renderCalendarActivity() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dailyTotals = {};
  rawTransactions.forEach((trx) => {
    const d = parseDate(trx.date);
    if (d && d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!dailyTotals[day]) dailyTotals[day] = 0;
      if (trx.type === 'Pemasukan') dailyTotals[day] += trx.amount;
      if (trx.type === 'Pengeluaran') dailyTotals[day] -= trx.amount;
    }
  });
  setText('calendarMonthLabel', `${MONTH_NAMES[month]} ${year}`);
  const firstDay = new Date(year, month, 1).getDay();
  const startPad = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let html = '<div></div>'.repeat(startPad);
  for (let day = 1; day <= daysInMonth; day++) {
    html += calCellHtml(day, dailyTotals[day] || 0, { today: day === today.getDate() });
  }
  byId('activityCalendarGrid').innerHTML = html;
}

function renderInsightCalendar(dailyNet, startDate, endDate) {
  const grid = byId('insightCalendarGrid');
  if (!grid) return;
  const startIdx = startDate.getFullYear() * 12 + startDate.getMonth();
  const endIdx = endDate.getFullYear() * 12 + endDate.getMonth();
  let currentIdx = insCalYear * 12 + insCalMonth;
  if (currentIdx < startIdx) currentIdx = startIdx;
  if (currentIdx > endIdx) currentIdx = endIdx;
  insCalYear = Math.floor(currentIdx / 12);
  insCalMonth = currentIdx % 12;

  setText('insCalLabel', `${MONTH_NAMES[insCalMonth]} ${insCalYear}`);
  setHidden('insCalNav', insightPeriodMode === 'range' && endIdx <= startIdx);
  const atStart = insightPeriodMode === 'range' && currentIdx <= startIdx;
  const atEnd = insightPeriodMode === 'range' && currentIdx >= endIdx;
  byId('insCalPrev').disabled = atStart;
  byId('insCalNext').disabled = atEnd;
  byId('insCalPrev').classList.toggle('opacity-40', atStart);
  byId('insCalNext').classList.toggle('opacity-40', atEnd);

  const firstDay = new Date(insCalYear, insCalMonth, 1).getDay();
  const startPad = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(insCalYear, insCalMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '<div></div>'.repeat(startPad);
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(insCalYear, insCalMonth, day);
    const key = dateKey(cellDate);
    const inRange = cellDate >= startDate && cellDate <= endDate;
    const hasTrx = inRange && insightDayMap[key] && insightDayMap[key].length > 0;
    html += calCellHtml(day, inRange ? (dailyNet[key] || 0) : 0, {
      out: !inRange,
      hasTrx: hasTrx,
      today: cellDate.getTime() === today.getTime(),
      onTap: hasTrx ? `showInsightDay('${key}')` : ''
    });
  }
  grid.innerHTML = html;
}

function showInsightDay(key) {
  const list = insightDayMap[key] || [];
  if (!list.length) return;
  const d = parseDate(key);
  setText('daySheetTitle', d ? d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : key);
  let inc = 0, exp = 0;
  list.forEach((t) => {
    if (t.type === 'Pemasukan') inc += t.amount;
    else if (t.type === 'Pengeluaran') exp += t.amount;
  });
  byId('daySheetBody').innerHTML = `
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl bg-income-soft p-4"><p class="eyebrow text-income">Masuk</p><p class="num mt-1 text-base font-extrabold text-income">${formatRupiah(inc)}</p></div>
      <div class="rounded-2xl bg-expense-soft p-4"><p class="eyebrow text-expense">Keluar</p><p class="num mt-1 text-base font-extrabold text-expense">${formatRupiah(exp)}</p></div>
    </div>
    <div class="mt-4 space-y-2.5">${list.map((t) => trxRow(t, { onTap: `closeSheet('daySheet');openModal(${jsArg(t.id)})` })).join('')}</div>`;
  openSheet('daySheet');
}

const PIUTANG_ACCENT = {
  violet: { text: 'text-violet', soft: 'bg-violet/10', bar: 'bg-violet' },
  orange: { text: 'text-orange-600 dark:text-orange-300', soft: 'bg-orange-500/10', bar: 'bg-orange-500' },
  teal: { text: 'text-teal-700 dark:text-teal-300', soft: 'bg-teal-500/10', bar: 'bg-teal-500' }
};

const piutangAnalysisCache = {};

function piutangAgeBadge(age) {
  if (age <= 30) return 'bg-income-soft text-income';
  if (age <= 60) return 'bg-warn-soft text-warn';
  if (age <= 90) return 'bg-orange-500/10 text-orange-600 dark:text-orange-300';
  return 'bg-expense-soft text-expense';
}

function piutangDateText(d) {
  return d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
}

function piutangAgoText(d, today) {
  if (!d) return 'belum ada';
  const n = Math.round((today - d) / 86400000);
  if (n <= 0) return 'hari ini';
  if (n === 1) return 'kemarin';
  return n + ' hari lalu';
}

function sectionTitle(icon, title, accentCls, right) {
  return `<div class="flex items-center gap-2">${ic(icon, 'text-lg ' + accentCls)}<h3 class="h-sec">${title}</h3>${right ? `<span class="ml-auto">${right}</span>` : ''}</div>`;
}

function renderPiutangAnalysis(prefix, a, cfg) {
  piutangAnalysisCache[prefix] = a;
  const box = byId(`analysis-${prefix}`);
  if (!box) return;
  const ac = PIUTANG_ACCENT[cfg.accent] || PIUTANG_ACCENT.violet;

  setText(`pct${prefix}`, fmtPct(a.recovery));
  const barEl = byId(`bar${prefix}`);
  if (barEl) barEl.style.width = `${Math.max(0, Math.min(100, a.recovery))}%`;
  setText(`sub${prefix}`, `${formatRupiah(a.totalIn)} dari ${formatRupiah(a.totalOut)} sudah kembali`);

  if (a.outCount === 0 && a.inCount === 0) {
    box.innerHTML = `<div class="card">${emptyState('piutang')}</div>`;
    return;
  }

  let html = '';
  const segs = a.buckets.filter((b) => b.amount > 0)
    .map((b) => `<div class="${b.dot} h-full" style="width:${(b.amount / a.outstandingTotal * 100).toFixed(2)}%"></div>`).join('');
  const rows = a.buckets.map((b) => `
    <div class="flex items-center justify-between border-b border-line/70 py-2.5 last:border-0">
      <div class="flex min-w-0 items-center gap-2">
        <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full ${b.dot}"></span>
        <span class="text-[13px] font-semibold ${b.amount > 0 ? '' : 'text-subtle'}">${b.label}</span>
        ${b.count > 0 ? `<span class="text-[12px] font-medium text-muted">${b.count} trx</span>` : ''}
      </div>
      <span class="num flex-shrink-0 text-[13px] font-bold ${b.amount > 0 ? b.text : 'text-subtle'}">${b.amount > 0 ? formatRupiah(b.amount) : '-'}</span>
    </div>`).join('');

  html += `
    <section class="card p-5">
      ${sectionTitle('hourglass-medium', 'Umur piutang', ac.text)}
      <p class="sub mt-1">Seberapa lama dana yang belum kembali sudah mengendap</p>
      ${a.outstandingTotal > 0 ? `
        <div class="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-surface-2">${segs}</div>
        <div class="mt-2">${rows}</div>
        <div class="mt-2 flex items-center justify-between rounded-2xl bg-surface-2 p-3.5">
          <span class="text-[13px] font-semibold text-muted">Total berjalan</span>
          <span class="num text-[15px] font-extrabold">${formatRupiah(a.outstandingTotal)}</span>
        </div>` : `
        <div class="mt-3 flex items-center gap-3 rounded-2xl bg-income-soft p-4 text-income">
          ${ic('check-circle-fill', 'text-2xl')}
          <div><p class="text-[14px] font-bold">Nggak ada piutang berjalan</p><p class="text-[12px] font-medium opacity-80">Semua dana sudah kembali.</p></div>
        </div>`}
    </section>`;

  const shownParties = a.openParties.slice(0, 8);
  const partyCards = shownParties.map((pt) => {
    const pct = Math.max(0, Math.min(100, pt.recovery));
    const share = a.outstandingTotal > 0 ? (pt.outstanding / a.outstandingTotal) * 100 : 0;
    return `
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-[12px] font-extrabold ${ac.soft} ${ac.text}">${escapeHtml(piutangInitials(pt.name))}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[15px] font-bold">${escapeHtml(pt.name)}</p>
            <p class="truncate text-[12px] font-medium text-muted">${pt.outCount} keluar · ${pt.inCount} bayar · ${share.toFixed(0)}% dari total</p>
          </div>
          <span class="pill ${piutangAgeBadge(pt.oldestAge)}">${pt.oldestAge} hari</span>
        </div>
        <div class="mt-3 flex items-end justify-between">
          <span class="text-[12px] font-semibold text-muted">Belum kembali</span>
          <span class="num text-[15px] font-extrabold">${formatRupiah(pt.outstanding)}</span>
        </div>
        <div class="bar-track mt-1.5"><div class="h-full rounded-full ${ac.bar}" style="width:${pct}%"></div></div>
        <div class="mt-1.5 flex justify-between text-[12px] font-medium text-muted">
          <span>${pct.toFixed(0)}% kembali</span>
          <span class="num truncate">${formatRupiah(pt.in)} / ${formatRupiah(pt.out)}</span>
        </div>
      </div>`;
  }).join('');
  const settledChips = a.settledParties.slice(0, 12).map((pt) => `<span class="pill bg-income-soft text-income">${escapeHtml(pt.name)}</span>`).join('');

  html += `
    <section>
      ${sectionTitle('users', 'Rincian per orang', ac.text, `<span class="text-[12px] font-semibold text-muted">${a.openParties.length} belum lunas</span>`)}
      <p class="sub mb-3 mt-1">Dikelompokkan dari label catatan sebelum tanda titik dua</p>
      ${shownParties.length ? `<div class="space-y-3">${partyCards}</div>` : `<div class="card p-5 text-center text-[14px] font-bold text-income">Semua sudah lunas. Mantap!</div>`}
      ${a.openParties.length > shownParties.length ? `<p class="pt-3 text-center text-[12px] font-semibold text-muted">dan ${a.openParties.length - shownParties.length} orang lainnya</p>` : ''}
      ${settledChips ? `<div class="mt-4 border-t border-line pt-4"><p class="eyebrow mb-2">Sudah lunas (${a.settledParties.length})</p><div class="flex flex-wrap gap-1.5">${settledChips}</div></div>` : ''}
    </section>`;

  if (a.outstanding.length > 0) {
    const shown = a.outstanding.slice(0, 10);
    const items = shown.map((o, idx) => `
      <button type="button" onclick="openRepaymentModal('${prefix}', ${idx})" class="row-tap flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-surface-2">
        <span class="pill ${piutangAgeBadge(o.age)}">${o.age}h</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[14px] font-bold">${escapeHtml(o.party)}</span>
          <span class="block truncate text-[12px] font-medium text-muted">${piutangDateText(o.date)}${o.note ? ' · ' + escapeHtml(o.note) : ''}</span>
        </span>
        <span class="flex-shrink-0 text-right">
          <span class="num block text-[14px] font-extrabold">${formatRupiah(o.remaining)}</span>
          ${o.remaining < o.original ? `<span class="num block text-[11px] font-medium text-muted">sisa dari ${formatRupiah(o.original)}</span>` : ''}
        </span>
        ${ic('caret-right', 'text-subtle')}
      </button>`).join('');
    html += `
      <section class="card p-4">
        <div class="px-1">${sectionTitle('list-checks', 'Belum tertutup', ac.text)}
        <p class="sub mt-1">Tap baris buat catat pelunasan. Dicocokkan ke transaksi paling lama per orang.</p></div>
        <div class="mt-2">${items}</div>
        ${a.outstanding.length > shown.length ? `<p class="pt-2 text-center text-[12px] font-semibold text-muted">dan ${a.outstanding.length - shown.length} transaksi lainnya</p>` : ''}
      </section>`;
  }

  const metric = (icon, label, value, sub) => `
    <div class="card p-4">
      <p class="flex items-center gap-1.5 text-[12px] font-semibold text-muted">${ic(icon)}${label}</p>
      <p class="num mt-1 truncate text-[15px] font-extrabold">${value}</p>
      <p class="mt-0.5 truncate text-[12px] font-medium text-muted">${sub}</p>
    </div>`;

  html += `
    <section>
      <div class="mb-3">${sectionTitle('gauge', 'Metrik kunci', ac.text)}</div>
      <div class="grid grid-cols-2 gap-3">
        ${metric('timer', 'Rata-rata lunas', a.avgSettleDays !== null ? `${Math.round(a.avgSettleDays)} hari` : '-', a.avgSettleDays !== null ? 'dibobot nilai transaksi' : 'belum ada pelunasan')}
        ${metric('warning', 'Paling lama', a.outstanding.length ? `${a.oldestAge} hari` : '-', a.outstanding.length ? escapeHtml(a.outstanding[0].party) : 'nggak ada')}
        ${metric('users', 'Belum lunas', `${a.openParties.length} orang`, `dari ${a.parties.length} total`)}
        ${metric('chart-pie-slice', 'Konsentrasi', a.concentration > 0 ? `${a.concentration.toFixed(0)}%` : '-', a.openParties.length ? `oleh ${escapeHtml(a.openParties[0].name)}` : 'nggak ada')}
        ${metric('receipt', 'Rata-rata nilai', formatRupiah(a.avgTicket), `dari ${a.outCount} transaksi`)}
        ${metric('repeat', 'Frekuensi', `${a.outCount} keluar`, `${a.inCount} kali pembayaran`)}
      </div>
    </section>`;

  html += `
    <section class="card p-5">
      ${sectionTitle('clock', 'Aktivitas terakhir', ac.text)}
      <div class="mt-3 flex items-center justify-between border-b border-line/70 py-3">
        <div class="flex items-center gap-3">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-expense-soft text-expense">${ic('arrow-up-right')}</span>
          <div><p class="text-[14px] font-bold">${cfg.label} terakhir</p><p class="text-[12px] font-medium text-muted">${piutangDateText(a.lastOut)}</p></div>
        </div>
        <span class="text-[12px] font-semibold text-muted">${piutangAgoText(a.lastOut, a.today)}</span>
      </div>
      <div class="flex items-center justify-between pt-3">
        <div class="flex items-center gap-3">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-income-soft text-income">${ic('arrow-down-left')}</span>
          <div><p class="text-[14px] font-bold">Pembayaran terakhir</p><p class="text-[12px] font-medium text-muted">${piutangDateText(a.lastIn)}</p></div>
        </div>
        <span class="text-[12px] font-semibold text-muted">${piutangAgoText(a.lastIn, a.today)}</span>
      </div>
    </section>`;

  if (a.series.length > 0) {
    let maxVal = 0;
    a.series.forEach((s) => { maxVal = Math.max(maxVal, s.out, s.in); });
    const bars = a.series.map((s) => {
      const parts = s.key.split('-');
      const mi = parseInt(parts[1], 10) - 1;
      const hOut = maxVal > 0 ? Math.max(3, Math.round((s.out / maxVal) * 72)) : 3;
      const hIn = maxVal > 0 ? Math.max(3, Math.round((s.in / maxVal) * 72)) : 3;
      return `
        <div class="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <div class="flex w-full items-end justify-center gap-1" style="height:72px">
            <div class="w-2.5 rounded-t bg-expense" style="height:${hOut}px"></div>
            <div class="w-2.5 rounded-t bg-income" style="height:${hIn}px"></div>
          </div>
          <span class="text-[11px] font-bold leading-none text-muted">${MONTH_SHORT[mi]}</span>
          <span class="text-[10px] font-semibold leading-none text-subtle">${parts[0].slice(-2)}</span>
        </div>`;
    }).join('');
    html += `
      <section class="card p-5">
        ${sectionTitle('chart-bar', 'Tren bulanan', ac.text)}
        <p class="sub mt-1">Maksimal 6 bulan terakhir yang ada transaksinya</p>
        <div class="mt-4 flex h-28 items-end justify-between gap-1.5">${bars}</div>
        <div class="mt-4 flex items-center justify-center gap-4 border-t border-line pt-3 text-[12px] font-semibold text-muted">
          <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-expense"></span>Keluar</span>
          <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-income"></span>Dibayar</span>
        </div>
      </section>`;
  }

  let projValue, projHint;
  if (a.sisa <= 0) {
    projValue = 'Lunas';
    projHint = 'Nggak ada sisa yang perlu ditagih';
  } else if (a.monthsToClear !== null) {
    const months = Math.ceil(a.monthsToClear);
    const target = new Date(a.today.getFullYear(), a.today.getMonth() + months, 1);
    projValue = a.monthsToClear < 1 ? 'Kurang dari sebulan' : `Sekitar ${months} bulan`;
    projHint = `Kira-kira ${MONTH_SHORT[target.getMonth()]} ${target.getFullYear()}, rata-rata ${formatRupiah(a.avgMonthlyIn)} per bulan`;
  } else {
    projValue = 'Belum bisa ditebak';
    projHint = 'Belum ada pembayaran dalam 3 bulan terakhir';
  }
  html += `
    <section class="card flex items-center gap-4 p-4">
      <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xl ${ac.soft} ${ac.text}">${ic('flag-checkered')}</span>
      <div class="min-w-0 flex-1">
        <p class="text-[12px] font-semibold text-muted">Estimasi lunas</p>
        <p class="text-[12px] font-medium text-muted">${escapeHtml(projHint)}</p>
      </div>
      <p class="flex-shrink-0 text-right text-[14px] font-extrabold">${escapeHtml(projValue)}</p>
    </section>`;

  if (a.overpaid > 0) {
    html += `
      <section class="flex items-center gap-3 rounded-3xl bg-info-soft p-4 text-info">
        ${ic('info-fill', 'text-xl')}
        <div class="min-w-0 flex-1">
          <p class="text-[14px] font-bold">Kelebihan bayar ${formatRupiah(a.overpaid)}</p>
          <p class="text-[12px] font-medium opacity-80">Ada yang bayar melebihi nilai transaksinya.</p>
        </div>
      </section>`;
  }

  box.innerHTML = html;
}

function renderPiutangSummary(data) {
  const box = byId('piutangContainer');
  if (!box) return;
  box.innerHTML = Object.keys(PIUTANG_GROUPS).map((prefix) => {
    const cfg = PIUTANG_GROUPS[prefix];
    const d = data[cfg.key];
    const ac = PIUTANG_ACCENT[cfg.accent];
    const sisa = d.out - d.in;
    const status = sisa > 0 ? 'Belum kembali' : (sisa < 0 ? 'Kelebihan bayar' : 'Lunas');
    const statusCls = sisa > 0 ? 'text-expense' : (sisa < 0 ? 'text-info' : 'text-income');
    return `
      <button type="button" onclick="setInsightFilter('${prefix}')" class="card row-tap block w-full p-4 text-left">
        <div class="flex items-center gap-3">
          <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xl ${ac.soft} ${ac.text}">${ic(cfg.ic)}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[15px] font-bold">${escapeHtml(d.name)}</p>
            <p class="num text-[13px] font-semibold ${statusCls}">${status}: ${formatRupiah(Math.abs(sisa))}</p>
          </div>
          ${ic('caret-right', 'text-subtle')}
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2 border-t border-line/70 pt-3">
          <div><p class="text-[11px] font-semibold text-muted">Total keluar</p><p class="num text-[13px] font-bold">${formatRupiah(d.out)}</p></div>
          <div class="text-right"><p class="text-[11px] font-semibold text-muted">Total kembali</p><p class="num text-[13px] font-bold">${formatRupiah(d.in)}</p></div>
        </div>
      </button>`;
  }).join('');
}

function barList(entries, total, colorFor, amountCls) {
  return entries.map((item, i) => {
    const pct = total > 0 ? (item[1] / total) * 100 : 0;
    return `
      <div class="mb-3.5 last:mb-0">
        <div class="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
          <span class="truncate font-semibold">${escapeHtml(item[0])}</span>
          <span class="num flex-shrink-0 font-bold ${amountCls || ''}">${formatRupiah(item[1])}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="bar-track flex-1"><div class="h-full rounded-full ${colorFor(i)}" style="width:${pct.toFixed(1)}%"></div></div>
          <span class="num w-12 flex-shrink-0 text-right text-[11px] font-bold text-muted">${fmtPct(pct)}</span>
        </div>
      </div>`;
  }).join('');
}

function renderCharts(expenseData, totalExp) {
  const box = byId('expenseList');
  if (!box) return;
  const sorted = Object.entries(expenseData).sort((a, b) => b[1] - a[1]);
  box.innerHTML = sorted.length ? barList(sorted, totalExp, (i) => (i === 0 ? 'bg-expense' : 'bg-ink/70')) : emptyState('expense', 'py-4');
}

function renderAccountExpense(dataMap, totalExp) {
  const box = byId('accountExpenseList');
  if (!box) return;
  const sorted = Object.entries(dataMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const palette = ['bg-violet', 'bg-lime', 'bg-info', 'bg-warn', 'bg-income', 'bg-expense'];
  box.innerHTML = sorted.length ? barList(sorted, totalExp, (i) => palette[i % palette.length]) : emptyState('expense', 'py-4');
}

function renderWeekdayPattern(weekdayAvg) {
  const box = byId('weekdayPattern');
  if (!box) return;
  const max = Math.max.apply(null, weekdayAvg);
  if (!max) {
    box.innerHTML = `<div class="w-full self-center">${emptyState('expense', 'py-2')}</div>`;
    return;
  }
  let peak = 0;
  weekdayAvg.forEach((v, i) => { if (v > weekdayAvg[peak]) peak = i; });
  box.innerHTML = weekdayAvg.map((val, i) => {
    const h = Math.max(6, Math.round((val / max) * 84));
    const isPeak = i === peak && val > 0;
    return `
      <div class="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
        <span class="num text-[10px] font-extrabold leading-none ${isPeak ? 'text-expense' : 'text-muted'}">${val > 0 ? formatShortAmount(val) : ''}</span>
        <div class="w-full rounded-lg ${isPeak ? 'bg-expense' : 'bg-violet/30'}" style="height:${h}px"></div>
        <span class="text-[11px] font-bold leading-none ${isPeak ? 'text-expense' : 'text-muted'}">${DAY_SHORT[i]}</span>
      </div>`;
  }).join('');
}

function autoFreqText(trx) {
  if (trx.freq === 'Mingguan') {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return `Tiap ${days[parseInt(trx.freqVal, 10)] || '-'}`;
  }
  if (trx.freq === 'Bulanan') return `Tiap tanggal ${trx.freqVal}`;
  return 'Tiap hari';
}

function renderAutoTrxList() {
  const box = byId('autoTrxListContainer');
  if (!box) return;
  if (!rawAutoTrx.length) {
    box.innerHTML = emptyState('auto', 'py-12');
    return;
  }
  box.innerHTML = rawAutoTrx.map((trx) => {
    const st = TRX_STYLE[trx.type] || TRX_STYLE.Pengeluaran;
    const active = trx.status === 'Aktif';
    const end = trx.tenggat && trx.tenggat !== 'Selamanya' ? `sampai ${formatDateShort(trx.tenggat)}` : 'tanpa batas';
    return `
      <div class="card p-4 ${active ? '' : 'opacity-70'}">
        <div class="flex items-start gap-3">
          <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-lg ${st.tone}">${ic(st.ic)}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[15px] font-bold">${escapeHtml(trx.catName)}</p>
            <p class="truncate text-[12px] font-medium text-muted">${escapeHtml(trxDetail(trx))}</p>
            <p class="mt-1 flex items-center gap-1 text-[12px] font-semibold">${ic('repeat', 'text-muted')}${escapeHtml(autoFreqText(trx))} · ${escapeHtml(end)}</p>
          </div>
          <div class="flex-shrink-0 text-right">
            <p class="num text-[15px] font-extrabold ${st.amt}">${st.sign}${formatRupiah(trx.amount)}</p>
            <span class="pill mt-1 ${active ? 'bg-lime/40 text-ink' : 'pill-none'}">${active ? 'Aktif' : 'Jeda'}</span>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between gap-3 border-t border-line/70 pt-3">
          <p class="min-w-0 truncate text-[12px] font-medium text-muted">${ic('note')} ${escapeHtml(trx.note)}${trx.lastExec ? ` · terakhir ${escapeHtml(formatDateShort(trx.lastExec))}` : ''}</p>
          <div class="flex flex-shrink-0 items-center gap-1.5">
            <button onclick="toggleAutoTrxStatus(${jsArg(trx.id)})" class="btn btn-soft btn-sm px-3">${active ? ic('pause') + 'Jeda' : ic('play') + 'Aktifkan'}</button>
            <button onclick="confirmDeleteAuto(${jsArg(trx.id)})" class="icon-btn icon-btn-sm border-0 bg-expense-soft text-expense" aria-label="Hapus rencana">${ic('trash')}</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function setWalletFilter(status) {
  currentWalletFilter = status;
  ['Aktif', 'Nonaktif'].forEach((s) => {
    const el = byId(`wal-tab-${s}`);
    if (el) el.classList.toggle('is-active', s === status);
  });
  renderAccountList();
}

function renderAccountList() {
  const box = byId('walletAccountList');
  if (!box) return;
  const list = Object.keys(accIndex).map((id) => accIndex[id])
    .filter((info) => (currentWalletFilter === 'Aktif' ? info.status === 'Aktif' : info.status !== 'Aktif'));
  if (!list.length) {
    box.innerHTML = `<div class="card col-span-2">${emptyState(currentWalletFilter === 'Aktif' ? 'walletActive' : 'walletInactive')}</div>`;
    return;
  }
  box.innerHTML = list.map((info) => {
    const active = info.status === 'Aktif';
    const st = ACC_STYLE[info.type] || ACC_STYLE.default;
    return `
      <div class="card row-tap relative flex h-[148px] cursor-pointer flex-col justify-between overflow-hidden p-4 ${active ? '' : 'border-dashed opacity-75'}" role="button" tabindex="0" onclick="openAccModal(${jsArg(info.id)})" onkeydown="if(event.key==='Enter'){openAccModal(${jsArg(info.id)})}">
        <div class="flex items-start justify-between">
          <span class="flex h-10 w-10 items-center justify-center rounded-2xl text-lg ${active ? st.tone : 'bg-surface-2 text-muted'}">${ic(st.ic)}</span>
          <button onclick="confirmToggleAccount(${jsArg(info.id)}, event)" class="icon-btn icon-btn-sm ${active ? '' : 'bg-surface-2'}" aria-label="${active ? 'Nonaktifkan' : 'Aktifkan'} rekening">${ic('power')}</button>
        </div>
        <div class="min-w-0">
          <p class="truncate text-[11px] font-bold uppercase tracking-wide text-muted">${escapeHtml(info.platform || info.type)}</p>
          <p class="truncate text-[14px] font-bold">${escapeHtml(info.name)}</p>
          <p class="num truncate text-[16px] font-extrabold ${info.balance < 0 ? 'text-expense' : ''}">${formatRupiah(info.balance)}</p>
        </div>
      </div>`;
  }).join('');
}

async function confirmToggleAccount(id, event) {
  if (event) event.stopPropagation();
  const acc = accIndex[id];
  if (!acc) return;
  const isActive = acc.status === 'Aktif';
  const linked = rawAutoTrx.filter((a) => a.status === 'Aktif' && (a.fromId === id || a.toId === id)).length;
  let message = isActive
    ? `${acc.name} nggak akan muncul saat mencatat transaksi dan saldonya keluar dari total. Riwayatnya tetap aman.`
    : `${acc.name} bakal muncul lagi saat mencatat transaksi dan saldonya ikut dihitung.`;
  if (isActive && linked > 0) message += ` Ada ${linked} rencana otomatis aktif yang pakai rekening ini dan tetap jalan.`;
  const ok = await uiConfirm({
    title: isActive ? 'Nonaktifkan rekening?' : 'Aktifkan lagi?',
    message: message,
    tone: isActive ? 'warn' : 'primary',
    icon: 'power',
    confirmText: isActive ? 'Ya, nonaktifkan' : 'Ya, aktifkan'
  });
  if (!ok) return;
  const raw = rawAccounts.find((a) => a.id === id);
  if (raw) raw.status = isActive ? 'Nonaktif' : 'Aktif';
  refreshViews();
  toast(isActive ? 'Rekening dinonaktifkan. Cek di tab Nonaktif.' : 'Rekening aktif lagi.', 'ok');
  try {
    await runWrite('toggleAccountStatus', { id: id }, (res) => res.data);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function setOverviewView(view) {
  byId('overviewViewType').value = view;
  setActive('overviewSeg', (btn) => btn.dataset.view === view);
  renderOverviewChart();
}

function renderOverviewChart() {
  const canvas = byId('overviewChart');
  if (!canvas) return;
  if (!window.Chart) {
    ensureChartLib().then((ok) => { if (ok) renderOverviewChart(); });
    return;
  }
  const viewType = byId('overviewViewType').value;
  if (overviewChartInstance) overviewChartInstance.destroy();

  const aggregated = {};
  rawTransactions.filter((trx) => matchesInsightFilters(trx)).forEach((trx) => {
    if (trx.type === 'Transfer') return;
    const d = parseDate(trx.date);
    if (!d) return;
    const key = viewType === 'month' ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : `${d.getFullYear()}`;
    if (!aggregated[key]) aggregated[key] = { inc: 0, exp: 0 };
    if (trx.type === 'Pemasukan') aggregated[key].inc += trx.amount;
    if (trx.type === 'Pengeluaran') aggregated[key].exp += trx.amount;
  });
  let keys = Object.keys(aggregated).sort();
  if (viewType === 'month' && keys.length > 6) keys = keys.slice(-6);
  const labels = keys.map((k) => {
    if (viewType !== 'month') return k;
    const parts = k.split('-');
    return `${MONTH_SHORT[parseInt(parts[1], 10) - 1]} ${parts[0].slice(-2)}`;
  });

  const font = { family: "'Plus Jakarta Sans', system-ui, sans-serif", size: 11, weight: '600' };
  const muted = cssColor('muted');
  overviewChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Pemasukan', data: keys.map((k) => aggregated[k].inc), backgroundColor: cssColor('income'), borderRadius: 8, borderSkipped: false, barPercentage: 0.7, categoryPercentage: 0.7 },
        { label: 'Pengeluaran', data: keys.map((k) => aggregated[k].exp), backgroundColor: cssColor('expense'), borderRadius: 8, borderSkipped: false, barPercentage: 0.7, categoryPercentage: 0.7 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, color: muted, font: font, padding: 16 } },
        tooltip: {
          backgroundColor: cssColor('hero'),
          titleFont: font,
          bodyFont: font,
          padding: 10,
          cornerRadius: 12,
          callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatRupiah(ctx.parsed.y)}` }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: cssColor('line') },
          border: { display: false },
          ticks: { color: muted, font: font, callback: (v) => (isObscured ? '' : formatShortAmount(v)) }
        },
        x: { grid: { display: false }, border: { display: false }, ticks: { color: muted, font: font } }
      }
    }
  });
}
