/**
 * chart.js
 * 티커별 주가 차트 — Yahoo Finance 히스토리 + 매수 시점 오버레이
 * Chart.js (CDN) 사용
 */

const ChartModule = (() => {

  let _chartInstance = null;   // 현재 열린 Chart.js 인스턴스
  let _historyCache  = {};     // { TICKER: { timestamps, closes, fetchedAt } }

  const CACHE_TTL = 10 * 60 * 1000;  // 10분

  /* ── Yahoo Finance 히스토리 fetch ───────────────
     range: 1mo | 3mo | 6mo | 1y | 2y | 5y
     interval: 1d | 1wk | 1mo
  ─────────────────────────────────────────────── */
  async function fetchHistory(ticker, range = '1y') {
    const t   = ticker.toUpperCase();
    const key = `${t}::${range}`;

    if (_historyCache[key] && Date.now() - _historyCache[key].fetchedAt < CACHE_TTL) {
      return _historyCache[key];
    }

    const interval  = range === '5y' || range === '2y' ? '1wk' : '1d';
    const yahooUrl  = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?interval=${interval}&range=${range}`;
    const proxies   = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`,
    ];

    for (const url of proxies) {
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) continue;
        const json   = await resp.json();
        const result = json?.chart?.result?.[0];
        if (!result) continue;

        const timestamps = result.timestamp || [];
        const closes     = result.indicators?.quote?.[0]?.close || [];
        const currency   = result.meta?.currency || 'USD';

        // null 제거
        const data = timestamps
          .map((ts, i) => ({ ts, price: closes[i] }))
          .filter(d => d.price != null);

        const out = {
          ticker:    t,
          range,
          currency,
          timestamps: data.map(d => d.ts * 1000),   // ms
          closes:     data.map(d => d.price),
          fetchedAt:  Date.now(),
        };
        _historyCache[key] = out;
        return out;
      } catch { /* 다음 프록시 */ }
    }
    return null;
  }

  /* ── 날짜 포맷 헬퍼 ─────────────────────────── */
  function _fmtDate(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  /* ── 모달 열기 ──────────────────────────────── */
  function openChart(ticker, records) {
    const t         = ticker.toUpperCase();
    const buyTrades = records.filter(r => r.ticker.toUpperCase() === t && (r.type||'buy') === 'buy');

    // 평균단가 계산
    const totalQty = buyTrades.reduce((s,r) => s + parseFloat(r.qty), 0);
    const totalAmt = buyTrades.reduce((s,r) => s + r.price * parseFloat(r.qty), 0);
    const avgPrice = totalQty > 0 ? totalAmt / totalQty : null;

    // 모달 세팅
    document.getElementById('chartModalTicker').textContent = t;
    document.getElementById('chartOverlay').classList.add('open');
    document.getElementById('chartLoading').style.display  = 'flex';
    document.getElementById('chartCanvas').style.display   = 'none';
    document.getElementById('chartError').style.display    = 'none';

    // range 버튼 초기화
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.range-btn[data-range="1y"]')?.classList.add('active');

    // 전역에 저장 (range 변경 시 재사용)
    window._chartState = { ticker: t, records, buyTrades, avgPrice, range: '1y', showBuys: false };

    _loadAndDraw();
  }

  /* ── 차트 로드 & 그리기 ──────────────────────── */
  async function _loadAndDraw() {
    const { ticker, buyTrades, avgPrice, range, showBuys } = window._chartState;

    document.getElementById('chartLoading').style.display = 'flex';
    document.getElementById('chartCanvas').style.display  = 'none';
    document.getElementById('chartError').style.display   = 'none';

    const history = await fetchHistory(ticker, range);

    if (!history || history.closes.length === 0) {
      document.getElementById('chartLoading').style.display = 'none';
      document.getElementById('chartError').style.display   = 'block';
      return;
    }

    document.getElementById('chartLoading').style.display = 'none';
    document.getElementById('chartCanvas').style.display  = 'block';

    _drawChart(history, buyTrades, avgPrice, showBuys);
  }

  /* ── Chart.js 그리기 ─────────────────────────── */
  function _drawChart(history, buyTrades, avgPrice, showBuys) {
    if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }

    const ctx    = document.getElementById('chartCanvas').getContext('2d');
    const labels = history.timestamps.map(_fmtDate);
    const prices = history.closes;

    // 기본 주가 라인
    const datasets = [
      {
        label:           history.ticker,
        data:            prices,
        borderColor:     '#c8f04a',
        backgroundColor: 'rgba(200,240,74,0.06)',
        borderWidth:     2,
        pointRadius:     0,
        pointHoverRadius: 4,
        fill:            true,
        tension:         0.3,
        order:           2,
      },
    ];

    // 평균단가 수평 점선
    if (avgPrice) {
      datasets.push({
        label:       `평균단가 ${avgPrice.toFixed(2)}`,
        data:        Array(prices.length).fill(avgPrice),
        borderColor: 'rgba(255,200,50,0.85)',
        borderWidth: 1.5,
        borderDash:  [6, 4],
        pointRadius: 0,
        fill:        false,
        tension:     0,
        order:       1,
      });
    }

    // 매수 시점 scatter (showBuys 토글)
    if (showBuys && buyTrades.length > 0) {
      const scatterData = buyTrades.map(r => {
        const tradeMs  = new Date(r.date).getTime();
        // 가장 가까운 날짜 인덱스 찾기
        const idx      = history.timestamps.reduce((best, ts, i) =>
          Math.abs(ts - tradeMs) < Math.abs(history.timestamps[best] - tradeMs) ? i : best, 0);
        return {
          x:   labels[idx],
          y:   history.closes[idx],
          qty: parseFloat(r.qty),
          price: r.price,
          date:  r.date,
        };
      }).filter(d => d.y != null);

      datasets.push({
        type:            'scatter',
        label:           '매수 시점',
        data:            scatterData,
        backgroundColor: 'rgba(74,240,200,0.9)',
        borderColor:     '#4af0c8',
        borderWidth:     2,
        pointRadius:     8,
        pointHoverRadius: 11,
        pointStyle:      'triangle',
        order:           0,
      });
    }

    _chartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#9ca3af', font: { family: 'DM Mono', size: 11 } },
          },
          tooltip: {
            backgroundColor: '#181c24',
            borderColor:     '#252a35',
            borderWidth:     1,
            titleColor:      '#e8ecf0',
            bodyColor:       '#9ca3af',
            callbacks: {
              label(ctx) {
                if (ctx.dataset.type === 'scatter') {
                  const d = ctx.raw;
                  return [`매수: ${d.date}`, `수량: ${d.qty}주`, `단가: ${d.price}`];
                }
                const val = ctx.parsed.y;
                return val != null ? ` ${ctx.dataset.label}: ${val.toFixed(2)}` : '';
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color:       '#6b7280',
              font:        { family: 'DM Mono', size: 10 },
              maxTicksLimit: 8,
              maxRotation: 0,
            },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
          y: {
            position: 'right',
            ticks: {
              color: '#6b7280',
              font:  { family: 'DM Mono', size: 10 },
            },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
        },
      },
    });
  }

  /* ── range 변경 ─────────────────────────────── */
  function changeRange(range, btn) {
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window._chartState.range = range;
    _loadAndDraw();
  }

  /* ── 매수 시점 토글 ─────────────────────────── */
  function toggleBuys(btn) {
    window._chartState.showBuys = !window._chartState.showBuys;
    btn.classList.toggle('active', window._chartState.showBuys);
    btn.textContent = window._chartState.showBuys ? '📍 매수시점 ON' : '📍 매수시점';
    _loadAndDraw();
  }

  /* ── 모달 닫기 ──────────────────────────────── */
  function closeChart() {
    if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }
    document.getElementById('chartOverlay').classList.remove('open');
    window._chartState = null;
  }

  function closeChartOutside(e) {
    if (e.target.id === 'chartOverlay') closeChart();
  }

  return { openChart, closeChart, closeChartOutside, changeRange, toggleBuys };
})();
