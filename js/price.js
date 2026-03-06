/**
 * price.js
 * 현재가 조회 — Yahoo Finance (CORS 프록시) + 수동 입력 fallback
 * 환율 조회 — exchangerate-api (무료)
 */

const Price = (() => {

  let _cache  = {};
  let _fxCache = null;  // { rates: {USD: 1350, ...}, fetchedAt, label }

  // ── 수동 입력 가격 (localStorage) ───────────────
  function _loadManual() {
    try { return JSON.parse(localStorage.getItem(CONFIG.PRICE_CACHE_KEY)) || {}; }
    catch { return {}; }
  }
  function _saveManual(map) {
    localStorage.setItem(CONFIG.PRICE_CACHE_KEY, JSON.stringify(map));
  }
  let _manual = _loadManual();

  // ── Yahoo Finance (CORS 프록시만 사용) ───────────
  async function _fetchYahoo(ticker) {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`,
    ];
    for (const url of proxies) {
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) continue;
        const json = await resp.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) continue;
        return {
          price:    meta.regularMarketPrice,
          currency: (meta.currency || 'USD').toUpperCase(),
          source:   'yahoo',
        };
      } catch { /* 다음 프록시 */ }
    }
    return null;
  }

  // ── 환율 조회 (KRW 기준) ────────────────────────
  // exchangerate-api 무료 엔드포인트 사용
  async function fetchFxRates() {
    // 캐시 유효하면 재사용
    if (_fxCache && Date.now() - _fxCache.fetchedAt < CONFIG.PRICE_CACHE_TTL) {
      return _fxCache;
    }

    const urls = [
      'https://open.er-api.com/v6/latest/KRW',         // 무료, CORS OK
      `https://api.allorigins.win/raw?url=${encodeURIComponent('https://open.er-api.com/v6/latest/KRW')}`,
    ];

    for (const url of urls) {
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) continue;
        const json = await resp.json();

        // open.er-api: rates는 1 KRW = x USD 형태 → 역수로 변환해서 1 USD = x KRW
        if (json?.rates) {
          const krwPerUsd = 1 / (json.rates['USD'] || 0.00072);
          const krwPerJpy = 1 / (json.rates['JPY'] || 0.0065);
          const krwPerEur = 1 / (json.rates['EUR'] || 0.00068);
          const krwPerCny = 1 / (json.rates['CNY'] || 0.0051);

          const now = new Date();
          const label = `${now.getFullYear()}년 ${String(now.getMonth()+1).padStart(2,'0')}월 ${String(now.getDate()).padStart(2,'0')}일 ${String(now.getHours()).padStart(2,'0')}시 ${String(now.getMinutes()).padStart(2,'0')}분 기준`;

          _fxCache = {
            rates: { KRW: 1, USD: krwPerUsd, JPY: krwPerJpy, EUR: krwPerEur, CNY: krwPerCny },
            fetchedAt: Date.now(),
            label,
            usdKrw: Math.round(krwPerUsd),
          };
          return _fxCache;
        }
      } catch { /* 다음 시도 */ }
    }

    // 실패 시 fallback (대략적 고정값)
    return {
      rates:     { KRW: 1, USD: 1350, JPY: 9.0, EUR: 1480, CNY: 186 },
      fetchedAt: Date.now(),
      label:     '환율 조회 실패 (추정값 사용)',
      usdKrw:    1350,
      isFallback: true,
    };
  }

  function getFxCache() { return _fxCache; }

  // ── 단일 티커 현재가 조회 ────────────────────────
  async function fetchPrice(ticker) {
    const t = ticker.toUpperCase();
    const cached = _cache[t];
    if (cached && Date.now() - cached.fetchedAt < CONFIG.PRICE_CACHE_TTL) {
      return { ...cached, fromCache: true };
    }
    const result = await _fetchYahoo(t);
    if (result) {
      _cache[t] = { ...result, fetchedAt: Date.now() };
      return _cache[t];
    }
    if (_manual[t]) {
      return { ..._manual[t], source: 'manual', fromCache: true };
    }
    return null;
  }

  // ── 여러 티커 일괄 조회 ──────────────────────────
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

  // ── 수동 가격 저장 / 조회 ────────────────────────
  function setManualPrice(ticker, price, currency = 'USD') {
    const t    = ticker.toUpperCase();
    _manual[t] = { price: parseFloat(price), currency, fetchedAt: Date.now() };
    _saveManual(_manual);
    _cache[t]  = { ..._manual[t], source: 'manual' };
  }

  function getManualPrice(ticker) {
    return _manual[ticker.toUpperCase()] || null;
  }

  // 캐시에서 특정 티커 강제 삭제 (수동 수정 후 재조회 용)
  function invalidate(ticker) {
    delete _cache[ticker.toUpperCase()];
  }

  function clearCache() {
    _cache   = {};
    _manual  = {};
    _fxCache = null;
    localStorage.removeItem(CONFIG.PRICE_CACHE_KEY);
  }

  return {
    fetchPrice, fetchPrices,
    fetchFxRates, getFxCache,
    setManualPrice, getManualPrice, invalidate, clearCache,
  };
})();
