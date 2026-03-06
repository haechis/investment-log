/**
 * ui.js
 * 렌더링 · 모달 · 탭 · 토스트
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
     MODAL — 매수 추가/수정
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
     MODAL — 매도 기록
  ══════════════════════════════════════════════ */
  function openSellModal(prefillTicker = '', netQty = {}) {
    document.getElementById('s-date').value   = Utils.today();
    document.getElementById('s-ticker').value = prefillTicker;
    document.getElementById('s-broker').value = '';
    document.getElementById('s-price').value  = '';
    document.getElementById('s-qty').value    = '';
    document.getElementById('s-fee').value    = '';
    document.getElementById('s-memo').value   = '';
    document.getElementById('s-currency').value = 'USD';

    // 보유수량 힌트 업데이트
    _updateSellHint(prefillTicker, netQty);

    document.getElementById('sellOverlay').classList.add('open');
    setTimeout(() => document.getElementById(prefillTicker ? 's-price' : 's-ticker').focus(), 100);
  }

  function _updateSellHint(ticker, netQty) {
    const hint = document.getElementById('s-qty-hint');
    if (!hint) return;
    const t   = (ticker || '').toUpperCase();
    const qty = netQty[t];
    hint.textContent = qty > 0 ? `현재 보유: ${Utils.fmtQty(qty)}주` : ticker ? '보유 종목 없음' : '';
  }

  // 매도 모달 내 티커 입력 변경 시 힌트 갱신
  function onSellTickerChange() {
    const ticker  = document.getElementById('s-ticker').value.trim().toUpperCase();
    const records = Store.getAll();
    const netQty  = Utils.netQtyByTicker(records);
    _updateSellHint(ticker, netQty);
  }

  function closeSellModal() {
    document.getElementById('sellOverlay').classList.remove('open');
  }

  function closeSellOutside(e) {
    if (e.target.id === 'sellOverlay') closeSellModal();
  }

  /* ══════════════════════════════════════════════
     MODAL — 현재가 수동 입력
  ══════════════════════════════════════════════ */
  function openManualPriceModal(ticker, currency) {
    const existing = Price.getManualPrice(ticker);
    document.getElementById('mp-ticker').value   = ticker;
    document.getElementById('mp-currency').value = currency || 'USD';
    document.getElementById('mp-price').value    = existing?.price || '';
    document.getElementById('manualPriceOverlay').classList.add('open');
    setTimeout(() => document.getElementById('mp-price').focus(), 100);
  }

  function closeManualPriceModal() {
    document.getElementById('manualPriceOverlay').classList.remove('open');
  }

  function closeManualOutside(e) {
    if (e.target.id === 'manualPriceOverlay') closeManualPriceModal();
  }

  /* ══════════════════════════════════════════════
     MODAL — 환율 수동 입력
  ══════════════════════════════════════════════ */
  function openManualFxModal() {
    // 기존 캐시값 미리 채워두기
    const fx = Price.getFxCache();
    if (fx && !fx.isFallback) {
      document.getElementById('fx-usd').value = fx.rates.USD ? Math.round(fx.rates.USD) : '';
      document.getElementById('fx-jpy').value = fx.rates.JPY ? fx.rates.JPY.toFixed(2) : '';
      document.getElementById('fx-eur').value = fx.rates.EUR ? Math.round(fx.rates.EUR) : '';
      document.getElementById('fx-cny').value = fx.rates.CNY ? fx.rates.CNY.toFixed(2) : '';
    }
    document.getElementById('manualFxOverlay').classList.add('open');
    setTimeout(() => document.getElementById('fx-usd').focus(), 100);
  }

  function closeManualFxModal() {
    document.getElementById('manualFxOverlay').classList.remove('open');
  }

  function closeManualFxOutside(e) {
    if (e.target.id === 'manualFxOverlay') closeManualFxModal();
  }

  /* ══════════════════════════════════════════════
     TABS
  ══════════════════════════════════════════════ */
  function switchTab(name, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    ['monthly','holdings','all','assets'].forEach(t => {
      document.getElementById('tab-'+t).style.display = t===name ? 'block' : 'none';
    });
  }

  /* ══════════════════════════════════════════════
     SUMMARY CARDS
  ══════════════════════════════════════════════ */
  function renderSummary(records, priceMap = {}, fx = null) {
    const el = document.getElementById('summaryGrid');
    if (!records.length) { el.innerHTML = ''; return; }

    const tickers = new Set(records.map(r => r.ticker)).size;
    const months  = new Set(records.map(r => r.date.slice(0,7))).size;
    const toKrw   = (amount, currency) => {
      if (currency === 'KRW') return amount;
      if (!fx) return null;
      return amount * (fx.rates[currency] || 0);
    };

    const assets       = Utils.groupByAsset(records);
    let totalInvestedKrw = 0;
    let hasAllFx         = !!fx;

    assets.forEach(a => {
      if (a.qty <= 0) return;
      const krw = toKrw(a.totalAmt, a.currency);
      if (krw === null) { hasAllFx = false; return; }
      totalInvestedKrw += krw;
    });

    const fxLabel = fx
      ? `<div class="fx-label">${fx.label} &nbsp;|&nbsp; 1 USD = ₩${fx.usdKrw.toLocaleString('ko-KR')}${fx.isFallback ? ' ⚠️추정값' : fx.isManual ? ' ✏️수동' : ''}</div>`
      : `<div class="fx-label"><button class="btn-inline" onclick="UI.openManualFxModal()" style="font-size:10px">✏️ 환율 수동 입력</button></div>`;

    let html = `
      <div class="summary-card">
        <div class="label">총 매수 횟수</div>
        <div class="value neutral">${records.length.toLocaleString()}<span style="font-size:18px;color:var(--muted)"> 회</span></div>
        <div class="sub">${months}개월 · ${tickers}개 종목</div>
      </div>`;

    if (hasAllFx && fx) {
      html += `
        <div class="summary-card">
          <div class="label">누적 투자 원금</div>
          <div class="value neutral" style="font-size:clamp(16px,2vw,28px)">₩${Math.round(totalInvestedKrw).toLocaleString('ko-KR')}</div>
          <div class="sub">KRW 환산 합계${fxLabel}</div>
        </div>`;
    } else {
      const totals = Utils.totalByCurrency(records);
      Object.entries(totals).forEach(([cur, total]) => {
        html += `
          <div class="summary-card">
            <div class="label">누적 투자 원금 (${cur})</div>
            <div class="value neutral" style="font-size:clamp(16px,2vw,28px)">${Utils.fmtMoney(total, cur)}</div>
            <div class="sub">현재가 조회 후 KRW 통합 표시${fxLabel}</div>
          </div>`;
      });
    }

    if (Object.keys(priceMap).length > 0 && fx) {
      let totalCurrentKrw = 0;
      let coveredInvested = 0;
      let allCovered      = true;

      assets.forEach(a => {
        if (a.qty <= 0) return;
        const pInfo       = priceMap[a.ticker.toUpperCase()];
        const investedKrw = toKrw(a.totalAmt, a.currency);
        if (!pInfo || investedKrw === null) { allCovered = false; return; }
        const currentKrw = toKrw(a.qty * pInfo.price, pInfo.currency);
        if (currentKrw === null) { allCovered = false; return; }
        totalCurrentKrw += currentKrw;
        coveredInvested += investedKrw;
      });

      if (coveredInvested > 0) {
        const profit  = totalCurrentKrw - coveredInvested;
        const rate    = (profit / coveredInvested) * 100;
        const isPos   = profit >= 0;
        const sign    = isPos ? '+' : '';
        const partial = !allCovered ? ' <span style="font-size:11px;color:var(--muted)">(일부)</span>' : '';

        html += `
          <div class="summary-card">
            <div class="label">누적 평가금액${partial}</div>
            <div class="value neutral" style="font-size:clamp(16px,2vw,28px)">₩${Math.round(totalCurrentKrw).toLocaleString('ko-KR')}</div>
            <div class="sub">KRW 환산 합계${fxLabel}</div>
          </div>
          <div class="summary-card ${isPos?'card-positive':'card-negative'}">
            <div class="label">총 평가손익${partial}</div>
            <div class="value ${isPos?'positive':'negative'}" style="font-size:clamp(16px,2vw,28px)">
              ${sign}₩${Math.round(Math.abs(profit)).toLocaleString('ko-KR')}
            </div>
            <div class="sub">수익률 <strong class="${isPos?'positive':'negative'}">${sign}${rate.toFixed(2)}%</strong>${fxLabel}</div>
          </div>`;
      }
    }

    el.innerHTML = html;
  }

  /* ══════════════════════════════════════════════
     MONTHLY VIEW — 매수/매도 구분 + 매도 버튼
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
      const sorted  = rows.sort((a,b) => b.date.localeCompare(a.date));
      const isFirst = idx++ === 0;

      // 월별 매수/매도 합산
      const buyAmt  = {}; const sellAmt = {};
      sorted.forEach(r => {
        const cur = r.currency;
        const amt = r.price * r.qty;
        if ((r.type||'buy') === 'buy')  buyAmt[cur]  = (buyAmt[cur]  || 0) + amt;
        else                             sellAmt[cur] = (sellAmt[cur] || 0) + amt;
      });
      const buyStr  = Object.entries(buyAmt).map(([c,v])  => Utils.fmtMoney(v,c)).join(' + ') || '—';
      const sellStr = Object.entries(sellAmt).map(([c,v]) => Utils.fmtMoney(v,c)).join(' + ');

      const tableRows = sorted.map(r => {
        const isSell = r.type === 'sell';
        const rowCls = isSell ? 'sell-row' : '';
        const typeBadge = isSell
          ? `<span class="badge badge-sell">매도</span>`
          : `<span class="badge badge-buy">매수</span>`;
        return `
          <tr class="${rowCls}">
            <td class="mono">${r.date}</td>
            <td>${typeBadge}</td>
            <td><span class="badge badge-blue">${r.broker}</span></td>
            <td>${r.name}</td>
            <td class="ticker-accent mono">${r.ticker}</td>
            <td class="num">${Utils.fmtQty(r.qty)}</td>
            <td class="num">${Utils.fmtMoney(r.price, r.currency)}</td>
            <td class="num ${isSell?'sell-amt':''}"><strong>${Utils.fmtMoney(r.price*r.qty, r.currency)}</strong></td>
            <td class="muted small">${r.fee ? '수수료 '+Utils.fmtMoney(r.fee,r.currency) : ''} ${r.memo||''}</td>
            <td>
              <button class="icon-btn edit-btn"   onclick="App.editRecord('${r.id}')"   title="수정">✏️</button>
              <button class="icon-btn delete-btn" onclick="App.deleteRecord('${r.id}')" title="삭제">✕</button>
            </td>
          </tr>`;
      }).join('');

      return `
        <div class="month-block">
          <div class="month-header ${isFirst?'open':''}" onclick="UI.toggleMonth(this)">
            <div class="month-label">${Utils.toMonthLabel(ym)}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <div class="month-stats">
                <div class="month-stat">
                  <div class="ms-label">매수</div>
                  <div class="ms-value positive">${buyStr}</div>
                </div>
                ${sellStr ? `<div class="month-stat">
                  <div class="ms-label">매도</div>
                  <div class="ms-value sell-amt">${sellStr}</div>
                </div>` : ''}
              </div>
              <button class="btn btn-sell-sm" onclick="event.stopPropagation(); App.openSellModal('')" title="매도 기록 추가">📤 매도</button>
              <div class="chevron ${isFirst?'open':''}">▼</div>
            </div>
          </div>
          <div class="month-body ${isFirst?'open':''}">
            <div style="overflow-x:auto">
              <table>
                <thead><tr>
                  <th>날짜</th><th>구분</th><th>증권사</th><th>종목</th><th>티커</th>
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
      el.innerHTML = '<tr><td colspan="10" class="empty-cell">기록이 없습니다.</td></tr>';
      return;
    }
    const sorted = [...records].sort((a,b) => b.date.localeCompare(a.date));
    el.innerHTML = sorted.map(r => {
      const isSell = r.type === 'sell';
      return `
        <tr class="${isSell?'sell-row':''}">
          <td class="mono">${r.date}</td>
          <td>${isSell ? '<span class="badge badge-sell">매도</span>' : '<span class="badge badge-buy">매수</span>'}</td>
          <td><span class="badge badge-blue">${r.broker}</span></td>
          <td>${r.name}</td>
          <td class="ticker-accent mono">${r.ticker}</td>
          <td class="num">${Utils.fmtQty(r.qty)}</td>
          <td class="num">${Utils.fmtMoney(r.price, r.currency)}</td>
          <td class="num ${isSell?'sell-amt':''}"><strong>${Utils.fmtMoney(r.price*r.qty, r.currency)}</strong></td>
          <td class="muted small">${r.memo||''}</td>
          <td>
            <button class="icon-btn edit-btn"   onclick="App.editRecord('${r.id}')"   title="수정">✏️</button>
            <button class="icon-btn delete-btn" onclick="App.deleteRecord('${r.id}')" title="삭제">✕</button>
          </td>
        </tr>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════
     ASSETS TABLE
  ══════════════════════════════════════════════ */
  function renderAssets(records, priceMap = {}) {
    const el   = document.getElementById('assetTableBody');
    const rows = Utils.groupByAsset(records);

    if (!rows.length) {
      el.innerHTML = '<tr><td colspan="11" class="empty-cell">기록이 없습니다.</td></tr>';
      return;
    }

    el.innerHTML = rows.map(a => {
      const pInfo  = priceMap[a.ticker.toUpperCase()];
      const profit = Utils.calcProfit(a, pInfo);
      const fullyLiquidated = a.qty <= 0;

      const priceCell = fullyLiquidated
        ? `<td class="num muted small">청산완료</td>`
        : pInfo
          ? `<td class="num">
               <button class="price-edit-btn" onclick="UI.openManualPriceModal('${a.ticker}','${pInfo.currency}')" title="클릭하여 수정">
                 ${Utils.fmtMoney(pInfo.price, pInfo.currency)}
                 <span class="price-source">${pInfo.source==='manual'?'✏️':'🔄'}</span>
               </button>
             </td>`
          : `<td class="num"><button class="btn-inline" onclick="UI.openManualPriceModal('${a.ticker}','${a.currency}')">입력</button></td>`;

      const evalCell = profit
        ? `<td class="num">${Utils.fmtMoney(profit.currentVal, pInfo.currency)}</td>
           <td class="num ${profit.profit>=0?'positive':'negative'}">${profit.profit>=0?'+':''}${Utils.fmtMoney(profit.profit, pInfo.currency)}</td>
           <td class="num rate-cell ${profit.rate>=0?'positive':'negative'}">${Utils.fmtRate(profit.rate)}</td>`
        : `<td class="num muted">—</td><td class="num muted">—</td><td class="num muted">—</td>`;

      const realizedCell = a.realizedProfit !== 0
        ? `<td class="num small ${a.realizedProfit>=0?'positive':'negative'}">${a.realizedProfit>=0?'+':''}${Utils.fmtMoney(a.realizedProfit, a.currency)}</td>`
        : `<td class="num muted small">—</td>`;

      return `
        <tr ${fullyLiquidated ? 'style="opacity:.5"' : ''}>
          <td>${a.name} ${fullyLiquidated ? '<span class="badge" style="background:rgba(255,255,255,.08);color:var(--muted);font-size:10px">청산</span>' : ''}</td>
          <td class="ticker-accent mono">${a.ticker}</td>
          <td><span class="badge badge-blue">${a.broker}</span></td>
          <td class="num">${Utils.fmtQty(a.qty)}</td>
          <td class="num">${a.qty > 0 ? Utils.fmtMoney(a.totalAmt/a.qty, a.currency) : '—'}</td>
          <td class="num"><strong>${a.qty > 0 ? Utils.fmtMoney(a.totalAmt, a.currency) : '—'}</strong></td>
          ${priceCell}
          ${evalCell}
          ${realizedCell}
          <td class="num muted small">${a.buyCount}매 / ${a.sellCount}도</td>
        </tr>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════
     HOLDINGS TABLE — 보유현황 탭
  ══════════════════════════════════════════════ */
  function renderHoldings(records, priceMap = {}) {
    const el       = document.getElementById('holdingsTableBody');
    const holdings = Utils.groupHoldings(records);

    if (!holdings.length) {
      el.innerHTML = '<tr><td colspan="9" class="empty-cell">보유 중인 종목이 없습니다.</td></tr>';
      return;
    }

    el.innerHTML = holdings.map(h => {
      const pInfo  = priceMap[h.ticker];
      const profit = Utils.calcProfit({ qty: h.qty, totalAmt: h.totalCost }, pInfo);

      const currentCell = pInfo
        ? `<td class="num">
             <button class="price-edit-btn"
               onclick="UI.openManualPriceModal('${h.ticker}','${pInfo.currency}')"
               title="클릭하여 수정">
               ${Utils.fmtMoney(pInfo.price, pInfo.currency)}
               <span class="price-source">${pInfo.source==='manual'?'✏️':'🔄'}</span>
             </button>
           </td>`
        : `<td class="num"><button class="btn-inline" onclick="UI.openManualPriceModal('${h.ticker}','${h.currency}')">입력</button></td>`;

      const profitCell = profit
        ? `<td class="num">${Utils.fmtMoney(profit.currentVal, pInfo.currency)}</td>
           <td class="num ${profit.profit>=0?'positive':'negative'}">
             ${profit.profit>=0?'+':''}${Utils.fmtMoney(profit.profit, pInfo.currency)}
           </td>
           <td class="num rate-cell ${profit.rate>=0?'positive':'negative'}">
             ${Utils.fmtRate(profit.rate)}
           </td>`
        : `<td class="num muted">—</td><td class="num muted">—</td><td class="num muted">—</td>`;

      return `
        <tr>
          <td>
            <div class="holding-name">${h.name}</div>
            <div class="holding-broker">${h.brokers}</div>
          </td>
          <td class="ticker-accent mono">${h.ticker}</td>
          <td class="num">${Utils.fmtQty(h.qty)}</td>
          <td class="num mono">${Utils.fmtMoney(h.avgPrice, h.currency)}</td>
          <td class="num"><strong>${Utils.fmtMoney(h.totalCost, h.currency)}</strong></td>
          ${currentCell}
          ${profitCell}
          <td class="num">
            <button class="btn-chart"
              onclick="ChartModule.openChart('${h.ticker}', Store.getAll())"
              title="${h.ticker} 차트 보기">
              📈
            </button>
          </td>
        </tr>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════
     버튼 로딩 상태
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
    ['f-currency','mp-currency','s-currency'].forEach(id => {
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
    openSellModal, closeSellModal, closeSellOutside, onSellTickerChange,
    openManualPriceModal, closeManualPriceModal, closeManualOutside,
    openManualFxModal, closeManualFxModal, closeManualFxOutside,
    switchTab, toggleMonth,
    renderSummary, renderMonthly, renderAll, renderAssets, renderHoldings,
    setPriceLoading, buildCurrencyOptions,
  };
})();
