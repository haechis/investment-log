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
    return Number(val).toLocaleString('ko-KR', { maximumFractionDigits: 6 });
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
    return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
  }

  /* ── buy records → 통화별 합계 (매수만) ─────────── */
  function totalByCurrency(records) {
    const map = {};
    records.filter(r => (r.type || 'buy') === 'buy').forEach(r => {
      map[r.currency] = (map[r.currency] || 0) + r.price * r.qty;
    });
    return map;
  }

  /* ── 티커별 순 보유수량 계산 (buy - sell) ──────── */
  function netQtyByTicker(allRecords) {
    const map = {};
    allRecords.forEach(r => {
      const t = r.ticker.toUpperCase();
      if (!map[t]) map[t] = 0;
      if ((r.type || 'buy') === 'buy')  map[t] += parseFloat(r.qty);
      if (r.type === 'sell')            map[t] -= parseFloat(r.qty);
    });
    return map;
  }

  /* ── records → 종목별 집계 (매수/매도 반영) ─────── */
  function groupByAsset(records) {
    const map = {};
    records.forEach(r => {
      const type = r.type || 'buy';
      const key  = `${r.ticker.toUpperCase()}::${r.currency}`;

      if (!map[key]) {
        map[key] = {
          name: r.name, ticker: r.ticker.toUpperCase(),
          broker: r.broker, currency: r.currency,
          qty: 0, totalAmt: 0, buyCount: 0, sellCount: 0,
          realizedProfit: 0,  // 실현 손익
        };
      }

      if (type === 'buy') {
        map[key].qty      += parseFloat(r.qty);
        map[key].totalAmt += r.price * r.qty;
        map[key].buyCount++;
      } else if (type === 'sell') {
        // 평균단가 기준 실현 손익
        const avgPrice = map[key].qty > 0 ? map[key].totalAmt / map[key].qty : 0;
        const sellQty  = parseFloat(r.qty);
        map[key].realizedProfit += (r.price - avgPrice) * sellQty;
        // 보유수량·투자금 차감 (평균단가 기준)
        map[key].totalAmt -= avgPrice * sellQty;
        map[key].qty      -= sellQty;
        map[key].sellCount++;
      }
    });

    // 수량 0 이하(완전 청산) 종목도 남겨두되, qty가 음수가 되지 않도록 보정
    return Object.values(map)
      .map(a => ({ ...a, qty: Math.max(0, a.qty), totalAmt: Math.max(0, a.totalAmt) }))
      .sort((a, b) => b.totalAmt - a.totalAmt);
  }

  /* ── 보유현황 전용 집계 (qty > 0인 티커만, 티커 단위로 묶음) ── */
  function groupHoldings(records) {
    // 1단계: 티커별로 모든 거래 집계
    const map = {};
    records.forEach(r => {
      const t    = r.ticker.toUpperCase();
      const type = r.type || 'buy';
      if (!map[t]) {
        map[t] = {
          ticker: t, name: r.name, currency: r.currency,
          brokers: new Set(),
          qty: 0, totalCost: 0,
          buyTrades: [],   // 개별 매수 내역 (차트용)
        };
      }
      map[t].brokers.add(r.broker);

      if (type === 'buy') {
        map[t].qty       += parseFloat(r.qty);
        map[t].totalCost += r.price * parseFloat(r.qty);
        map[t].buyTrades.push({ date: r.date, qty: parseFloat(r.qty), price: r.price });
      } else if (type === 'sell') {
        const avg = map[t].qty > 0 ? map[t].totalCost / map[t].qty : 0;
        const q   = parseFloat(r.qty);
        map[t].totalCost -= avg * q;
        map[t].qty       -= q;
      }
    });

    // 2단계: qty > 0인 것만, 투자금 내림차순
    return Object.values(map)
      .filter(h => h.qty > 1e-9)
      .map(h => ({
        ...h,
        qty:      Math.max(0, h.qty),
        totalCost: Math.max(0, h.totalCost),
        avgPrice: h.qty > 0 ? h.totalCost / h.qty : 0,
        brokers:  [...h.brokers].join(', '),
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  /* ── 오늘 날짜 ISO string ─────────────────────── */
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ── 수익 계산 ────────────────────────────────── */
  function calcProfit(asset, priceInfo) {
    if (!priceInfo || asset.qty <= 0) return null;
    const currentVal = asset.qty * priceInfo.price;
    const profit     = currentVal - asset.totalAmt;
    const rate       = asset.totalAmt > 0 ? (profit / asset.totalAmt) * 100 : 0;
    return { currentVal, profit, rate };
  }

  /* ── 수익률 포맷 ──────────────────────────────── */
  function fmtRate(rate) {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(2)}%`;
  }

  return {
    fmtMoney, fmtQty, toMonthLabel,
    groupByMonth, totalByCurrency, netQtyByTicker, groupByAsset, groupHoldings,
    today, calcProfit, fmtRate,
  };
})();
