/**
 * ui.js
 * 렌더링 · 모달(추가/수정) · 탭 · 토스트 · 현재가 표시
 */

const UI = (() => {

  /* ══════════════════════════════════════════════
     TOAST
  ══════════════════════════════════════════════ */
  let _toastTimer = null;
  function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent      = msg;
    el.style.background = type === 'error' ? 'var(--red)' : 'var(--accent)';
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  /* ══════════════════════════════════════════════
     MODAL — 추가 / 수정 공용
  ══════════════════════════════════════════════ */
  let _editingId = null;

  function openModal(id = null) {
    _editingId = id;
    const title = document.getElementById('modalTitle');
    if (id) {
      const r = Store.getById(id);
      if (!r) return;
      title.innerHTML = '매수 기록 <span>수정</span>';
      document.getElementById('f-date').value     = r.date;
      document.getElementById('f-broker').value   = r.broker;
      document.getElementById('f-name').value     = r.name;
      document.getElementById('f-ticker').value   = r.ticker;
      document.getElementById('f-currency').value = r.currency;
      document.getElementById('f-price').value    = r.price;
      document.getElementById('f-qty').value      = r.qty;
      document.getElementById('f-fee').value      = r.fee || '';
      document.getElementById('f-memo').value     = r.memo || '';
    } else {
      title.innerHTML = '매수 기록 <span>추가</span>';
      resetForm();
      document.getElementById('f-date').value = Utils.today();
    }
    document.getElementById('modalOverlay').classList.add('open');
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    _editingId = null;
  }

  function closeModalOutside(e) {
    if (e.target.id === 'modalOverlay') closeModal();
  }

  function resetForm() {
    ['f-broker','f-name','f-ticker','f-price','f-qty','f-fee','f-memo']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('f-currency').value = 'USD';
  }

  function getEditingId() { return _editingId; }

  /* ══════════════════════════════════════════════
     수동 가격 입력 모달
  ══════════════════════════════════════════════ */
  function openManualPriceModal(ticker, currency) {
    const existing = Price.getManualPrice(ticker);
    document.getElementById('mp-ticker').value   = ticker;
    document.getElementById('mp-currency').value = currency || 'USD';
    document.getElementById('mp-price').value    = existing?.price || '';
    document.getElementById('manualPriceOverlay').classList.add('open');
  }

  function closeManualPriceModal() {
    document.getElementById('manualPriceOverlay').classList.remove('open');
  }

  function closeManualOutside(e) {
    if (e.target.id === 'manualPriceOverlay') closeManualPriceModal();
  }

  /* ══════════════════════════════════════════════
     TABS
  ══════════════════════════════════════════════ */
  function switchTab(name, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    ['monthly','all','assets'].forEach(t => {
      document.getElementById('tab-'+t).style.display = t===name ? 'block' : 'none';
    });
  }

  /* ══════════════════════════════════════════════
     SUMMARY CARDS
  ══════════════════════════════════════════════ */
  function renderSummary(records) {
    const el = document.getElementById('summaryGrid');
    if (!records.length) { el.innerHTML = ''; return; }

    const totals  = Utils.totalByCurrency(records);
    const tickers = new Set(records.map(r => r.ticker)).size;
    const months  = new Set(records.map(r => r.date.slice(0,7))).size;

    let html = `
      <div class="summary-card">
        <div class="label">총 매수 횟수</div>
        <div class="value neutral">${records.length.toLocaleString()}<span style="font-size:18px;color:var(--muted)"> 회</span></div>
        <div class="sub">${months}개월 · ${tickers}개 종목</div>
      </div>`;

    Object.entries(totals).forEach(([cur, total]) => {
      html += `
        <div class="summary-card">
          <div class="label">총 투자금 (${cur})</div>
          <div class="value neutral" style="font-size:clamp(18px,2.2vw,30px)">${Utils.fmtMoney(total, cur)}</div>
          <div class="sub">누적 투자 원금</div>
        </div>`;
    });

    el.innerHTML = html;
  }

  /* ══════════════════════════════════════════════
     MONTHLY VIEW
  ══════════════════════════════════════════════ */
  function renderMonthly(records) {
    const el = document.getElementById('monthlyView');
    if (!records.length) {
      el.innerHTML = `<div class="empty"><div class="big">NO DATA</div>아직 기록이 없습니다.<br>상단의 <b>＋ 매수 기록</b> 버튼으로 시작하세요!</div>`;
      return;
    }

    const grouped = Utils.groupByMonth(records);
    let idx = 0;

    el.innerHTML = [...grouped.entries()].map(([ym, rows]) => {
      const sorted   = rows.sort((a,b) => b.date.localeCompare(a.date));
      const totals   = Utils.totalByCurrency(sorted);
      const totalStr = Object.entries(totals).map(([c,v]) => Utils.fmtMoney(v,c)).join(' + ');
      const isFirst  = idx++ === 0;

      const tableRows = sorted.map(r => `
        <tr>
          <td class="mono">${r.date}</td>
          <td><span class="badge badge-blue">${r.broker}</span></td>
          <td>${r.name}</td>
          <td class="ticker-accent mono">${r.ticker}</td>
          <td class="num">${Utils.fmtQty(r.qty)}</td>
          <td class="num">${Utils.fmtMoney(r.price, r.currency)}</td>
          <td class="num"><strong>${Utils.fmtMoney(r.price*r.qty, r.currency)}</strong></td>
          <td class="muted small">${r.fee ? '수수료 '+Utils.fmtMoney(r.fee,r.currency) : ''} ${r.memo||''}</td>
          <td>
            <button class="icon-btn edit-btn"  onclick="App.editRecord('${r.id}')"  title="수정">✏️</button>
            <button class="icon-btn delete-btn" onclick="App.deleteRecord('${r.id}')" title="삭제">✕</button>
          </td>
        </tr>`).join('');

      return `
        <div class="month-block">
          <div class="month-header ${isFirst?'open':''}" onclick="UI.toggleMonth(this)">
            <div class="month-label">${Utils.toMonthLabel(ym)}</div>
            <div style="display:flex;align-items:center">
              <div class="month-stats">
                <div class="month-stat">
                  <div class="ms-label">매수 횟수</div>
                  <div class="ms-value">${sorted.length}회</div>
                </div>
                <div class="month-stat">
                  <div class="ms-label">투자 금액</div>
                  <div class="ms-value positive">${totalStr}</div>
                </div>
              </div>
              <div class="chevron ${isFirst?'open':''}">▼</div>
            </div>
          </div>
          <div class="month-body ${isFirst?'open':''}">
            <div style="overflow-x:auto">
              <table>
                <thead><tr>
                  <th>날짜</th><th>증권사</th><th>종목</th><th>티커</th>
                  <th class="num">수량</th><th class="num">단가</th>
                  <th class="num">금액</th><th>기타</th><th></th>
                </tr></thead>
                <tbody>${tableRows}</tbody>
              </table>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function toggleMonth(header) {
    const body    = header.nextElementSibling;
    const chevron = header.querySelector('.chevron');
    const isOpen  = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    header.classList.toggle('open', !isOpen);
    chevron.classList.toggle('open', !isOpen);
  }

  /* ══════════════════════════════════════════════
     ALL TABLE
  ══════════════════════════════════════════════ */
  function renderAll(records) {
    const el = document.getElementById('allTableBody');
    if (!records.length) {
      el.innerHTML = '<tr><td colspan="9" class="empty-cell">기록이 없습니다.</td></tr>';
      return;
    }
    const sorted = [...records].sort((a,b) => b.date.localeCompare(a.date));
    el.innerHTML = sorted.map(r => `
      <tr>
        <td class="mono">${r.date}</td>
        <td><span class="badge badge-blue">${r.broker}</span></td>
        <td>${r.name}</td>
        <td class="ticker-accent mono">${r.ticker}</td>
        <td class="num">${Utils.fmtQty(r.qty)}</td>
        <td class="num">${Utils.fmtMoney(r.price, r.currency)}</td>
        <td class="num"><strong>${Utils.fmtMoney(r.price*r.qty, r.currency)}</strong></td>
        <td class="muted small">${r.memo||''}</td>
        <td>
          <button class="icon-btn edit-btn"   onclick="App.editRecord('${r.id}')"   title="수정">✏️</button>
          <button class="icon-btn delete-btn" onclick="App.deleteRecord('${r.id}')" title="삭제">✕</button>
        </td>
      </tr>`).join('');
  }

  /* ══════════════════════════════════════════════
     ASSETS TABLE (현재가 · 수익 포함)
  ══════════════════════════════════════════════ */
  function renderAssets(records, priceMap = {}) {
    const el   = document.getElementById('assetTableBody');
    const rows = Utils.groupByAsset(records);

    if (!rows.length) {
      el.innerHTML = '<tr><td colspan="10" class="empty-cell">기록이 없습니다.</td></tr>';
      return;
    }

    el.innerHTML = rows.map(a => {
      const pInfo  = priceMap[a.ticker.toUpperCase()];
      const profit = Utils.calcProfit(a, pInfo);

      const priceCell = pInfo
        ? `<td class="num mono">${Utils.fmtMoney(pInfo.price, pInfo.currency)} <span class="price-source">${pInfo.source==='manual'?'✏️':'🔄'}</span></td>`
        : `<td class="num"><button class="btn-inline" onclick="UI.openManualPriceModal('${a.ticker}','${a.currency}')">입력</button></td>`;

      const evalCell = profit
        ? `<td class="num">${Utils.fmtMoney(profit.currentVal, pInfo.currency)}</td>
           <td class="num ${profit.profit>=0?'positive':'negative'}">${profit.profit>=0?'+':''}${Utils.fmtMoney(profit.profit, pInfo.currency)}</td>
           <td class="num rate-cell ${profit.rate>=0?'positive':'negative'}">${Utils.fmtRate(profit.rate)}</td>`
        : `<td class="num muted">—</td><td class="num muted">—</td><td class="num muted">—</td>`;

      return `
        <tr>
          <td>${a.name}</td>
          <td class="ticker-accent mono">${a.ticker}</td>
          <td><span class="badge badge-blue">${a.broker}</span></td>
          <td class="num">${Utils.fmtQty(a.qty)}</td>
          <td class="num">${Utils.fmtMoney(a.totalAmt/a.qty, a.currency)}</td>
          <td class="num"><strong>${Utils.fmtMoney(a.totalAmt, a.currency)}</strong></td>
          ${priceCell}
          ${evalCell}
          <td class="num muted small">${a.count}회</td>
        </tr>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════
     현재가 조회 버튼 상태
  ══════════════════════════════════════════════ */
  function setPriceLoading(loading) {
    const btn = document.getElementById('btnFetchPrices');
    if (!btn) return;
    btn.disabled    = loading;
    btn.textContent = loading ? '⏳ 조회 중...' : '🔄 현재가 조회';
  }

  /* ══════════════════════════════════════════════
     CURRENCY OPTIONS
  ══════════════════════════════════════════════ */
  function buildCurrencyOptions() {
    ['f-currency','mp-currency'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = CONFIG.CURRENCIES.map(c =>
        `<option value="${c}">${c}</option>`
      ).join('');
    });
  }

  return {
    toast,
    openModal, closeModal, closeModalOutside, resetForm, getEditingId,
    openManualPriceModal, closeManualPriceModal, closeManualOutside,
    switchTab, toggleMonth,
    renderSummary, renderMonthly, renderAll, renderAssets,
    setPriceLoading, buildCurrencyOptions,
  };
})();
