// Безопасная обёртка над localStorage (может быть недоступен: приватный режим,
// file:// в некоторых браузерах, запреты). При недоступности — память.

const mem = new Map<string, string>();
let ok: boolean | null = null;

function available(): boolean {
  if (ok !== null) return ok;
  try {
    const k = '__tankorost_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    ok = true;
  } catch { ok = false; }
  return ok;
}

export const storage = {
  get(key: string): string | null {
    if (available()) { try { return localStorage.getItem(key); } catch { /* ниже */ } }
    return mem.get(key) ?? null;
  },
  set(key: string, v: string): boolean {
    mem.set(key, v);
    if (available()) { try { localStorage.setItem(key, v); return true; } catch { return false; } }
    return false;
  },
  remove(key: string): void {
    mem.delete(key);
    if (available()) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
  },
  persistent(): boolean {
    return available();
  },
};
