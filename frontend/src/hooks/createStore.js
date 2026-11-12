import { useSyncExternalStore } from 'react';
import { load, save, remove } from './storage';

/*
 * A tiny saved store: one localStorage key, shared by every component that
 * uses it. When one screen changes it (e.g. the lesson ticks off "Ran BFS in
 * Python"), every other screen that reads it updates straight away.
 *
 *   const todoStore = createStore('cos212-todos', DEFAULT_TODOS, { sync: 'todos' });
 *   const todos = todoStore.use();                 // read (re-renders on change)
 *   todoStore.set((old) => [...old, newTodo]);     // write (value or updater)
 *
 * `sync` names the key used on the Python server (see src/api/sync.js).
 * Each store remembers when it last changed, so the newer copy wins when the
 * browser and the server disagree.
 */
const META = 'cos212-meta';
const stamps = () => load(META, {});
const stamp = (key, t) => save(META, { ...stamps(), [key]: t });

export default function createStore(key, initial, { sync } = {}) {
  let state = load(key, initial);
  const listeners = new Set();
  const notify = (origin) => listeners.forEach((l) => l(origin));

  const get = () => state;
  /** origin 'server' means the change came from the backend (so don't send it back). */
  const set = (next, origin = 'local') => {
    state = typeof next === 'function' ? next(state) : next;
    save(key, state);
    stamp(key, origin === 'server' ? 0 : Date.now());
    notify(origin);
  };
  const reset = () => {
    remove(key);
    state = initial;
    stamp(key, Date.now());
    notify('local');
  };
  const subscribe = (l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const changedAt = () => stamps()[key] || 0;

  // Keep two open tabs in sync.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === key) {
        state = load(key, initial);
        notify('tab');
      }
    });
  }

  const use = () => useSyncExternalStore(subscribe, get, get);
  return { get, set, reset, use, subscribe, changedAt, key, sync, initial };
}
