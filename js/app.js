/**
 * app.js
 * 앱 진입점 · 컨트롤러
 */

const App = (() => {

  let _priceMap = {};

  /* ── 전체 렌더 ───────────────────────────────── */
  function render() {
    const records = Store.getAll();
    UI.renderSummary(records);
    UI.renderMonthly(records);
    UI.renderAll(records);
    UI.renderAssets(records, _priceMap);
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

  /* ── 저장 (추가 or 수정) ─────────────────────── */
  function saveRecord() {
    const f  = _parseForm();
    if (!_validateForm(f)) return;

    const editingId = UI.getEditingId();

    if (editingId) {
      // 수정
      Store.update(editingId, f);
      UI.toast(`✅ ${f.name} (${f.ticker}) 수정 완료!`);
    } else {
      // 추가
      Store.add({ id: Store.generateId(), ...f, createdAt: new Date().toISOString() });
      UI.toast(`✅ ${f.name} (${f.ticker}) 매수 기록 저장!`);
    }

    render();
    UI.closeModal();
    UI.resetForm();
  }

  /* ── 수정 모달 열기 ──────────────────────────── */
  function editRecord(id) {
    UI.openModal(id);
  }

  /* ── 삭제 ────────────────────────────────────── */
  function deleteRecord(id) {
    if (!confirm('이 기록을 삭제할까요?')) return;
    Store.remove(id);
    render();
    UI.toast('🗑 삭제되었습니다.');
  }

  /* ── 현재가 일괄 조회 ────────────────────────── */
  async function fetchPrices() {
    const records = Store.getAll();
    if (!records.length) { UI.toast('❗ 기록이 없습니다.'); return; }

    const tickers = [...new Set(records.map(r => r.ticker.toUpperCase()))];
    UI.setPriceLoading(true);

    try {
      _priceMap = await Price.fetchPrices(tickers);
      const found   = Object.keys(_priceMap).length;
      const missing = tickers.filter(t => !_priceMap[t]);

      render();

      if (missing.length) {
        UI.toast(`🔄 ${found}/${tickers.length}개 조회 완료. 미조회: ${missing.join(', ')}`, 'error');
      } else {
        UI.toast(`🔄 ${found}개 종목 현재가 조회 완료!`);
      }
    } catch (e) {
      UI.toast('❌ 가격 조회 실패: ' + e.message, 'error');
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
    UI.toast(`✅ ${ticker} 수동 가격 저장: ${Utils.fmtMoney(price, currency)}`);
  }

  /* ── 초기화 ──────────────────────────────────── */
  function init() {
    Store.load();
    UI.buildCurrencyOptions();
    render();
  }

  return { init, render, saveRecord, editRecord, deleteRecord, fetchPrices, saveManualPrice };
})();

document.addEventListener('DOMContentLoaded', App.init);
