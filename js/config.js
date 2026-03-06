/**
 * config.js
 * 앱 전역 설정값 및 상수
 */

const CONFIG = {
  STORAGE_KEY: 'portfolio_log_v1',
  EXPORT_VERSION: 1,
  APP_NAME: 'portfolio-log',

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
