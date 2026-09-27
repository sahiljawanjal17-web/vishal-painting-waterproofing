// Safe localStorage wrapper. Storage can throw or be absent (private mode, blocked
// site data, tests), so every call is guarded and the app must work without it.

const memory = new Map();

function backend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function getItem(key) {
  try {
    const store = backend();
    return store ? store.getItem(key) : (memory.get(key) ?? null);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function setItem(key, value) {
  try {
    const store = backend();
    if (store) store.setItem(key, value);
    else memory.set(key, value);
    return true;
  } catch {
    memory.set(key, value);
    return false;
  }
}

export function removeItem(key) {
  memory.delete(key);
  try {
    backend()?.removeItem(key);
  } catch {
    /* nothing to clean up */
  }
}

// Booking draft: values + step, expiring so stale personal data doesn't linger (docs/08 §8.5).
const DAY_MS = 24 * 60 * 60 * 1000;

export function saveDraft(key, draft, ttlDays, now = Date.now()) {
  return setItem(key, JSON.stringify({ savedAt: now, expiresAt: now + ttlDays * DAY_MS, draft }));
}

export function loadDraft(key, now = Date.now()) {
  const raw = getItem(key);
  if (!raw) return null;
  try {
    const { expiresAt, draft } = JSON.parse(raw);
    if (typeof expiresAt !== 'number' || now > expiresAt) {
      removeItem(key);
      return null;
    }
    return draft ?? null;
  } catch {
    removeItem(key);
    return null;
  }
}

export const clearDraft = removeItem;
