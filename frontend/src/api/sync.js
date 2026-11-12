import { api, learnerId, startHealthChecks } from './client';

/*
 * Keeps the browser stores and the Python server in step.
 *  - When the server is reached: download everything saved for this guest.
 *    For each store, the newer copy wins (browser or server).
 *  - After that, every local change is sent to the server (batched, ~0.8 s).
 *  - If the server goes away, changes stay in the browser and are sent the
 *    next time it's reachable.
 */
const stores = [];
const timers = {};

export function registerSynced(...list) {
  list.forEach((s) => {
    if (!s.sync || stores.includes(s)) return;
    stores.push(s);
    s.subscribe((origin) => {
      if (origin === 'server' || origin === 'tab') return;
      clearTimeout(timers[s.sync]);
      timers[s.sync] = setTimeout(() => push(s), 800);
    });
  });
}

async function push(s) {
  try {
    await api(`/api/learners/${learnerId()}/state/${s.sync}`, { method: 'PUT', body: { value: s.get() } });
  } catch {
    /* offline: pulled/pushed again on reconnect */
  }
}

async function pullAll() {
  let remote = {};
  try {
    remote = await api(`/api/learners/${learnerId()}/state`);
  } catch {
    return;
  }
  for (const s of stores) {
    const r = remote[s.sync];
    const localAt = s.changedAt();
    const remoteAt = r ? r.updated * 1000 : 0;
    if (r && remoteAt >= localAt) s.set(r.value, 'server');
    else if (localAt > 0) push(s); // browser copy is newer (or server has none)
  }
}

/** Start once, from main.jsx. */
export function startSync() {
  startHealthChecks(pullAll);
}

/** Remove one saved part on the server too (e.g. "Clear tracked data"). */
export async function clearRemote(key) {
  try {
    await api(`/api/learners/${learnerId()}/state/${key}`, { method: 'DELETE' });
  } catch {
    /* offline: nothing to clear */
  }
}

/** Send every local store now (e.g. right before asking the server for My analysis). */
export async function pushAll() {
  stores.forEach((s) => clearTimeout(timers[s.sync]));
  await Promise.all(stores.filter((s) => s.changedAt() > 0).map(push));
}
