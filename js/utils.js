/**
 * utils.js
 * 포맷팅 · 계산 유틸리티
 */

const Utils = (() => {

  /* ── 통화 포맷 ─────────────────────────────────── */
  function fmtMoney(val, currency = 'KRW') {
    const sym      = CONFIG.CURRENCY_SYMBOLS[currency] || '';
    const decimals = CONFIG.DECIMAL_PLACES[currency] ?? 2;
    const locale   = currency === 'KRW' || currency === 'JPY' ? 'ko-KR' : 'en-US';
    return sym + Number(val).toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /* ── 수량 포맷 ─────────────────────────────────── */
  function fmtQty(val) {
    return Number(val).toLocaleString('ko-KR', {
      maximumFractionDigits: 6,
    });
  }

  /* ── 날짜 → YYYY.MM 라벨 ──────────────────────── */
  function toMonthLabel(yyyymm) {
    const [y, m] = yyyymm.split('-');
    return `${y}.${m}`;
  }

  /* ── records → 월별 그룹 Map ──────────────────── */
  function groupByMonth(records) {
    const map = new Map();
    records.forEach(r => {
      const ym = r.date.slice(0, 7);
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym).push(r);
    });
    // 최신 월 순 정렬
    return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
  }

  /* ── records → 통화별 합계 ────────────────────── */
  function totalByCurrency(records) {
    const map = {};
    records.forEach(r => {
      map[r.currency] = (map[r.currency] || 0) + r.price * r.qty;
    });
    return map;
  }

  /* ── records → 종목별 집계 ────────────────────── */
  function groupByAsset(records) {
    const map = {};
    records.forEach(r => {
      const key = `${r.ticker}::${r.currency}::${r.broker}`;
      if (!map[key]) {
        map[key] = {
          name: r.name, ticker: r.ticker,
          broker: r.broker, currency: r.currency,
          qty: 0, totalAmt: 0, count: 0,
        };
      }
      map[key].qty      += parseFloat(r.qty);
      map[key].totalAmt += r.price * r.qty;
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.totalAmt - a.totalAmt);
  }

  /* ── 오늘 날짜 ISO string ─────────────────────── */
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  return { fmtMoney, fmtQty, toMonthLabel, groupByMonth, totalByCurrency, groupByAsset, today };
})();
