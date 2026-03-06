/**
 * io.js
 * JSON 내보내기 / 불러오기 (round-trip)
 */

const IO = (() => {

  /* ── 내보내기 ──────────────────────────────────── */
  function exportJSON() {
    const records = Store.getAll();
    if (!records.length) {
      UI.toast('❗ 내보낼 기록이 없습니다.');
      return;
    }

    const payload = {
      _meta: {
        version:    CONFIG.EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        count:      records.length,
        app:        CONFIG.APP_NAME,
      },
      records,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `portfolio_log_${Utils.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    UI.toast(`💾 ${records.length}건 내보내기 완료!`);
  }

  /* ── 불러오기 트리거 ────────────────────────────── */
  function triggerImport() {
    document.getElementById('importFile').click();
  }

  /* ── 파일 읽기 핸들러 ───────────────────────────── */
  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed   = JSON.parse(ev.target.result);
        const incoming = parsed.records || (Array.isArray(parsed) ? parsed : null);
        if (!incoming) throw new Error('올바른 형식이 아닙니다.');

        // 버전 체크 (향후 마이그레이션 대비)
        const version = parsed._meta?.version ?? 0;
        if (version > CONFIG.EXPORT_VERSION) {
          UI.toast(`⚠️ 파일 버전(${version})이 앱보다 높습니다. 일부 데이터가 누락될 수 있습니다.`);
        }

        const { added, skipped } = Store.merge(incoming);
        App.render();
        UI.toast(`📂 ${added}건 추가 (중복 ${skipped}건 스킵)`);
      } catch (err) {
        UI.toast('❌ 파일 형식 오류: ' + err.message, 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  return { exportJSON, triggerImport, handleImport };
})();
