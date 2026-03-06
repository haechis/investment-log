/**
 * app.js
 * 앱 진입점 · 컨트롤러
 */

const App = (() => {

  let _priceMap = {};
  let _fx       = null;

  /* ── 전체 렌더 ───────────────────────────────── */
  function render() {
    const records = Store.getAll();
    UI.renderSummary(records, _priceMap, _fx);
    UI.renderMonthly(records);
    UI.renderAll(records);
    UI.renderAssets(records, _priceMap);
    UI.renderHoldings(records, _priceMap);
  }

  /* ── 폼 공통 파싱 ────────────────────────────── */
  function _parseForm() {
    return {
      date:     document.getElementById('f-date').value,
      broker:   document.getElementById('f-broker').value.trim(),
      name:     document.getElementById('f-name').value.trim(),
      ticker:   document.getElementById('f-ticker').value.trim().toUpperCase(),
      currency: document.getElementById('f-currency').value,
      price:    parseFloat(document.getElementById('f-price').value),
      qty:      parseFloat(document.getElementById('f-qty').value),
      fee:      parseFloat(document.getElementById('f-fee').value) || 0,
      memo:     document.getElementById('f-memo').value.trim(),
    };
  }

  function _validateForm(f) {
    if (!f.date || !f.broker || !f.name || !f.ticker || !f.price || !f.qty) {
      UI.toast('❗ 필수 항목을 모두 입력해주세요.', 'error'); return false;
    }
    if (f.price <= 0 || f.qty <= 0) {
      UI.toast('❗ 단가와 수량은 0보다 커야 합니다.', 'error'); return false;
    }
    return true;
  }

  /* ── 매수 저장 (추가 or 수정) ────────────────── */
  function saveRecord() {
    const f = _parseForm();
    if (!_validateForm(f)) return;

    const editingId = UI.getEditingId();
    if (editingId) {
      Store.update(editingId, { ...f, type: 'buy' });
      UI.toast(`✅ ${f.name} (${f.ticker}) 수정 완료!`);
    } else {
      Store.add({ id: Store.generateId(), ...f, type: 'buy', createdAt: new Date().toISOString() });
      UI.toast(`✅ ${f.name} (${f.ticker}) 매수 기록 저장!`);
    }
    render();
    UI.closeModal();
    UI.resetForm();
  }

  /* ── 매도 모달 열기 ──────────────────────────── */
  function openSellModal(prefillTicker = '') {
    const records = Store.getAll();
    const netQty  = Utils.netQtyByTicker(records);
    UI.openSellModal(prefillTicker, netQty);
  }

  /* ── 매도 저장 ───────────────────────────────── */
  function saveSell() {
    const date     = document.getElementById('s-date').value;
    const broker   = document.getElementById('s-broker').value.trim();
    const ticker   = document.getElementById('s-ticker').value.trim().toUpperCase();
    const currency = document.getElementById('s-currency').value;
    const price    = parseFloat(document.getElementById('s-price').value);
    const qty      = parseFloat(document.getElementById('s-qty').value);
    const fee      = parseFloat(document.getElementById('s-fee').value) || 0;
    const memo     = document.getElementById('s-memo').value.trim();

    if (!date || !broker || !ticker || !price || !qty) {
      UI.toast('❗ 필수 항목을 모두 입력해주세요.', 'error'); return;
    }
    if (price <= 0 || qty <= 0) {
      UI.toast('❗ 단가와 수량은 0보다 커야 합니다.', 'error'); return;
    }

    // 수량 검증 — 현재 순 보유 수량과 비교
    const records = Store.getAll();
    const netQty  = Utils.netQtyByTicker(records);
    const holding = netQty[ticker] || 0;

    if (qty > holding + 1e-9) {  // 부동소수점 오차 허용
      UI.toast(
        `❌ 매도 불가: ${ticker} 보유수량 ${Utils.fmtQty(holding)}주 < 매도수량 ${Utils.fmtQty(qty)}주`,
        'error'
      );
      return;
    }

    // 종목명은 기존 buy 레코드에서 찾아서 채움
    const buyRecord = records.find(r => r.ticker.toUpperCase() === ticker && (r.type||'buy') === 'buy');
    const name      = buyRecord?.name || ticker;

    Store.add({
      id: Store.generateId(),
      type: 'sell',
      date, broker, name, ticker, currency,
      price, qty, fee, memo,
      createdAt: new Date().toISOString(),
    });

    render();
    UI.closeSellModal();
    UI.toast(`📤 ${name} (${ticker}) ${Utils.fmtQty(qty)}주 매도 기록 저장!`);
  }

  /* ── 수정 모달 열기 ──────────────────────────── */
  function editRecord(id) { UI.openModal(id); }

  /* ── 삭제 ────────────────────────────────────── */
  function deleteRecord(id) {
    if (!confirm('이 기록을 삭제할까요?')) return;
    Store.remove(id);
    render();
    UI.toast('🗑 삭제되었습니다.');
  }

  /* ── 현재가 + 환율 일괄 조회 ─────────────────── */
  async function fetchPrices() {
    const records = Store.getAll();
    if (!records.length) { UI.toast('❗ 기록이 없습니다.'); return; }

    const tickers = [...new Set(records.map(r => r.ticker.toUpperCase()))];
    UI.setPriceLoading(true);

    try {
      const [priceResult, fxResult] = await Promise.all([
        Price.fetchPrices(tickers),
        Price.fetchFxRates(),
      ]);

      _priceMap = priceResult;
      _fx       = fxResult;
      render();

      const found   = Object.keys(_priceMap).length;
      const missing = tickers.filter(t => !_priceMap[t]);
      const fxNote  = _fx?.isFallback ? ' (환율 추정값)' : ` · 1USD=₩${_fx?.usdKrw?.toLocaleString()}`;

      if (missing.length) {
        UI.toast(`🔄 ${found}/${tickers.length}개 조회 완료${fxNote}. 미조회: ${missing.join(', ')}`, 'error');
      } else {
        UI.toast(`🔄 ${found}개 종목 조회 완료${fxNote}`);
      }
    } catch (e) {
      UI.toast('❌ 조회 실패: ' + e.message, 'error');
    } finally {
      UI.setPriceLoading(false);
    }
  }

  /* ── 수동 가격 저장 ──────────────────────────── */
  function saveManualPrice() {
    const ticker   = document.getElementById('mp-ticker').value.trim().toUpperCase();
    const currency = document.getElementById('mp-currency').value;
    const price    = parseFloat(document.getElementById('mp-price').value);
    if (!ticker || !price || price <= 0) {
      UI.toast('❗ 티커와 가격을 올바르게 입력해주세요.', 'error'); return;
    }
    Price.setManualPrice(ticker, price, currency);
    _priceMap[ticker] = { price, currency, source: 'manual', fetchedAt: Date.now() };
    render();
    UI.closeManualPriceModal();
    UI.toast(`✅ ${ticker} 가격 저장: ${Utils.fmtMoney(price, currency)}`);
  }

  /* ── 환율 수동 저장 ──────────────────────────── */
  function saveManualFx() {
    const usdKrw = parseFloat(document.getElementById('fx-usd').value);
    const jpyKrw = parseFloat(document.getElementById('fx-jpy').value) || 0;
    const eurKrw = parseFloat(document.getElementById('fx-eur').value) || 0;
    const cnyKrw = parseFloat(document.getElementById('fx-cny').value) || 0;

    if (!usdKrw || usdKrw <= 0) {
      UI.toast('❗ USD/KRW 환율을 입력해주세요.', 'error'); return;
    }

    const now = new Date();
    const label = `${now.getFullYear()}년 ${String(now.getMonth()+1).padStart(2,'0')}월 ${String(now.getDate()).padStart(2,'0')}일 ${String(now.getHours()).padStart(2,'0')}시 ${String(now.getMinutes()).padStart(2,'0')}분 기준 (수동입력)`;

    _fx = {
      rates:     { KRW: 1, USD: usdKrw, JPY: jpyKrw || usdKrw/150, EUR: eurKrw || usdKrw*1.08, CNY: cnyKrw || usdKrw/7.2 },
      fetchedAt: Date.now(),
      label,
      usdKrw:    Math.round(usdKrw),
      isManual:  true,
    };

    render();
    UI.closeManualFxModal();
    UI.toast(`✅ 환율 수동 저장: 1USD = ₩${Math.round(usdKrw).toLocaleString()}`);
  }

  /* ── 초기화 ──────────────────────────────────── */
  function init() {
    Store.load();
    UI.buildCurrencyOptions();
    render();
  }

  return {
    init, render,
    saveRecord, editRecord, deleteRecord,
    openSellModal, saveSell,
    fetchPrices,
    saveManualPrice, saveManualFx,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
