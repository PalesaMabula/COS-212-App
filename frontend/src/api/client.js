import { useSyncExternalStore } from 'react';

/*
 * Talks to the Python backend (FastAPI).
 *  - In development Vite forwards /api/... to http://localhost:8000 (see vite.config.js).
 *  - For a hosted build, set VITE_API_URL to the backend's address.
 * If the server can't be reached, everything keeps working in the browser and
 * the status shows "offline". It checks again every 20 seconds.
 */
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/* ---------- server status: 'checking' | 'online' | 'offline' ---------- */
let status = 'checking';
const listeners = new Set();
const setStatus = (s) => {
  if (s === status) return;
  status = s;
  listeners.forEach((l) => l());
};
export const getStatus = () => status;
export const onStatus = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useServerStatus = () => useSyncExternalStore(onStatus, getStatus, getStatus);

/** fetch JSON with a timeout; marks the server offline on network failure. */
export async function api(path, { method = 'GET', body, timeout = 4000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    // A static host with no API returns HTML (or 404) instead of JSON: treat as offline.
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw new TypeError('No API here');
    const data = await res.json();
    setStatus('online');
    if (!res.ok) throw Object.assign(new Error(data?.detail || res.statusText), { status: res.status });
    return data;
  } catch (e) {
    if (e.name === 'AbortError' || e instanceof TypeError) setStatus('offline');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkHealth() {
  try {
    await api('/api/health', { timeout: 2500 });
    return true;
  } catch {
    return false;
  }
}

let poller = null;
/** Called once at start-up. Keeps re-checking while offline. */
export function startHealthChecks(onOnline) {
  const tick = async () => {
    const was = status;
    const ok = await checkHealth();
    if (ok && was !== 'online') onOnline?.();
  };
  tick();
  clearInterval(poller);
  poller = setInterval(() => status !== 'online' && tick(), 20000);
}

/* ---------- anonymous guest id (no login) ---------- */
const ID_KEY = 'cos212-learner';
function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  // Fallback UUID v4 for older browsers.
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}
export function learnerId() {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = makeId();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return makeId();
  }
}
