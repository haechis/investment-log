/**
 * app.js
 * 앱 진입점 · 컨트롤러
 * config.js → store.js → utils.js → ui.js → io.js 로드 후 실행
 */

const App = (() => {

  /* ── 전체 렌더 ───────────────────────────────── */
  function render() {
    const records = Store.getAll();
    UI.renderSummary(records);
    UI.renderMonthly(records);
    UI.renderAll(records);
    UI.renderAssets(records);
  }

  /* ── 매수 기록 저장 ──────────────────────────── */
  function saveRecord() {
    const date     = document.getElementById('f-date').value;
    const broker   = document.getElementById('f-broker').value.trim();
    const name     = document.getElementById('f-name').value.trim();
    const ticker   = document.getElementById('f-ticker').value.trim().toUpperCase();
    const currency = document.getElementById('f-currency').value;
    const price    = parseFloat(document.getElementById('f-price').value);
    const qty      = parseFloat(document.getElementById('f-qty').value);
    const fee      = parseFloat(document.getElementById('f-fee').value) || 0;
    const memo     = document.getElementById('f-memo').value.trim();

    if (!date || !broker || !name || !ticker || !price || !qty) {
      UI.toast('❗ 필수 항목을 모두 입력해주세요.', 'error');
      return;
    }
    if (price <= 0 || qty <= 0) {
      UI.toast('❗ 단가와 수량은 0보다 커야 합니다.', 'error');
      return;
    }

    Store.add({
      id:        Store.generateId(),
      date, broker, name, ticker, currency,
      price, qty, fee, memo,
      createdAt: new Date().toISOString(),
    });

    render();
    UI.closeModal();
    UI.resetForm();
    UI.toast(`✅ ${name} (${ticker}) 매수 기록 저장!`);
  }

  /* ── 삭제 ────────────────────────────────────── */
  function deleteRecord(id) {
    if (!confirm('이 기록을 삭제할까요?')) return;
    Store.remove(id);
    render();
    UI.toast('🗑 삭제되었습니다.');
  }

  /* ── 초기화 ──────────────────────────────────── */
  function init() {
    Store.load();
    UI.buildCurrencyOptions();
    render();
  }

  return { init, render, saveRecord, deleteRecord };
})();

// DOM 준비 후 실행
document.addEventListener('DOMContentLoaded', App.init);
