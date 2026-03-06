/**
 * price.js
 * 현재가 조회 — Yahoo Finance API + 수동 입력 fallback
 *
 * 흐름:
 *   1. 메모리 캐시 확인 (TTL 이내면 즉시 반환)
 *   2. Yahoo Finance proxy 순서대로 시도
 *   3. 모두 실패 → manualPrices 스토어에서 수동 입력값 반환
 */

const Price = (() => {

  // ── 메모리 캐시 { ticker: { price, currency, fetchedAt } } ──
  let _cache = {};

  // ── 수동 입력 가격 (localStorage 유지) ──────────────────────
  function _loadManual() {
    try { return JSON.parse(localStorage.getItem(CONFIG.PRICE_CACHE_KEY)) || {}; }
    catch { return {}; }
  }
  function _saveManual(map) {
    localStorage.setItem(CONFIG.PRICE_CACHE_KEY, JSON.stringify(map));
  }
  let _manual = _loadManual();

  // ── Yahoo Finance 단일 티커 fetch ────────────────────────────
  async function _fetchYahoo(ticker) {
    const proxies = CONFIG.YAHOO_PROXIES;
    for (const base of proxies) {
      try {
        const url  = `${base}${encodeURIComponent(ticker)}?interval=1d&range=1d`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!resp.ok) continue;
        const json = await resp.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta) continue;
        return {
          price:    meta.regularMarketPrice ?? meta.previousClose,
          currency: (meta.currency || 'USD').toUpperCase(),
          source:   'yahoo',
        };
      } catch {
        // 다음 proxy 시도
      }
    }
    return null;
  }

  // ── 공개 API: 단일 티커 현재가 조회 ─────────────────────────
  async function fetchPrice(ticker) {
    const t = ticker.toUpperCase();

    // 1. 메모리 캐시
    const cached = _cache[t];
    if (cached && Date.now() - cached.fetchedAt < CONFIG.PRICE_CACHE_TTL) {
      return { ...cached, fromCache: true };
    }

    // 2. Yahoo Finance
    const result = await _fetchYahoo(t);
    if (result) {
      _cache[t] = { ...result, fetchedAt: Date.now() };
      return _cache[t];
    }

    // 3. 수동 입력 fallback
    if (_manual[t]) {
      return { ..._manual[t], source: 'manual', fromCache: true };
    }

    return null;
  }

  // ── 여러 티커 일괄 조회 (Promise.allSettled) ─────────────────
  async function fetchPrices(tickers) {
    const uniq    = [...new Set(tickers.map(t => t.toUpperCase()))];
    const results = await Promise.allSettled(uniq.map(t => fetchPrice(t)));
    const map     = {};
    uniq.forEach((t, i) => {
      if (results[i].status === 'fulfilled' && results[i].value) {
        map[t] = results[i].value;
      }
    });
    return map;
  }

  // ── 수동 가격 저장 ───────────────────────────────────────────
  function setManualPrice(ticker, price, currency = 'USD') {
    const t    = ticker.toUpperCase();
    _manual[t] = { price: parseFloat(price), currency, fetchedAt: Date.now() };
    _saveManual(_manual);
    // 메모리 캐시도 갱신
    _cache[t]  = { ..._manual[t], source: 'manual' };
  }

  // ── 수동 가격 조회 ───────────────────────────────────────────
  function getManualPrice(ticker) {
    return _manual[ticker.toUpperCase()] || null;
  }

  // ── 캐시 초기화 ──────────────────────────────────────────────
  function clearCache() {
    _cache  = {};
    _manual = {};
    localStorage.removeItem(CONFIG.PRICE_CACHE_KEY);
  }

  return { fetchPrice, fetchPrices, setManualPrice, getManualPrice, clearCache };
})();
