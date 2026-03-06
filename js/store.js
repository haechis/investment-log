/**
 * store.js
 * 데이터 저장 / 불러오기 / CRUD
 */

const Store = (() => {
  let _records = [];

  function load() {
    try {
      _records = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || [];
    } catch {
      _records = [];
    }
    return _records;
  }

  function save() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(_records));
  }

  function getAll() {
    return [..._records];
  }

  function add(record) {
    _records.push(record);
    save();
  }

  function remove(id) {
    _records = _records.filter(r => r.id !== id);
    save();
  }

  /** 외부에서 가져온 records 배열을 머지 (중복 id 스킵) */
  function merge(incoming) {
    const existing = new Set(_records.map(r => r.id));
    let added = 0;
    incoming.forEach(r => {
      if (!existing.has(r.id)) {
        _records.push(r);
        added++;
      }
    });
    save();
    return { added, skipped: incoming.length - added };
  }

  /** 전체 교체 (import 완전 덮어쓰기 옵션용) */
  function replace(incoming) {
    _records = [...incoming];
    save();
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  return { load, getAll, add, remove, merge, replace, generateId };
})();
