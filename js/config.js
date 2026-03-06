/**
 * config.js
 * 앱 전역 설정값 및 상수
 */

const CONFIG = {
  STORAGE_KEY: 'portfolio_log_v1',
  PRICE_CACHE_KEY: 'portfolio_price_cache_v1',
  EXPORT_VERSION: 1,
  APP_NAME: 'portfolio-log',

  // Yahoo Finance CORS 우회 프록시 (무료, 오픈소스)
  // 장애 시 아래 목록에서 순서대로 fallback
  YAHOO_PROXIES: [
    'https://query1.finance.yahoo.com/v8/finance/chart/',
    'https://query2.finance.yahoo.com/v8/finance/chart/',
  ],

  // 가격 캐시 유효 시간 (ms) — 기본 5분
  PRICE_CACHE_TTL: 5 * 60 * 1000,

  CURRENCIES: ['KRW', 'USD', 'JPY', 'EUR', 'CNY'],

  CURRENCY_SYMBOLS: {
    KRW: '₩',
    USD: '$',
    JPY: '¥',
    EUR: '€',
    CNY: '¥',
  },

  // 소수점 자릿수
  DECIMAL_PLACES: {
    KRW: 0,
    USD: 2,
    JPY: 0,
    EUR: 2,
    CNY: 2,
  },
};
