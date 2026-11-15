import createStore from '../hooks/createStore';

/* ------------------------------------------------------------------
 * All saved student data lives here: in the browser, and also on the Python
 * server when it's running (src/api/sync.js). No login, no personal details.
 * ------------------------------------------------------------------ */

/** Lecture-ready checklist flags (ids from READY_STEPS) plus small counters. */
export const progressStore = createStore(
  'cos212-progress',
  { warmup: false, watched: false, traced: false, ranCode: false, readyCheck: false, practice5: false, question: false, practiceCount: 0 },
  { sync: 'progress' }
);

export const markDone = (id) => progressStore.set((p) => (p[id] ? p : { ...p, [id]: true }));

/** What the student wants to be called, and their lecture date (both optional; no login). */
export const profileStore = createStore('cos212-profile', { name: '', lecture: '' }, { sync: 'profile' });
export const setName = (name) => profileStore.set((p) => ({ ...p, name: name.trim().slice(0, 40) }));
/** lecture: 'YYYY-MM-DD' or '' (not set). */
export const setLecture = (lecture) => profileStore.set((p) => ({ ...p, lecture: /^\d{4}-\d{2}-\d{2}$/.test(lecture) ? lecture : '' }));
export const initials = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'You';

/** Progress through the module pages: { '3/s01': true (section seen), '3': true (module finished) } */
export const topicsStore = createStore('cos212-topics', {}, { sync: 'topics' });
export const markTopicDone = (id) => topicsStore.set((t) => (t[id] ? t : { ...t, [id]: true }));

/** Calendar plans: { 'YYYY-MM-DD': [{ id, text, kind: 'plan'|'done', mine? }] }
 * A first plan starts from today's real date. The lecture itself comes from the
 * date the student sets (profileStore.lecture), not from this list. */
const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dateKey(d);
};
export const planStore = createStore('cos212-plans', {
  [inDays(0)]: [{ id: 'p1', text: 'Study: Modules 1 and 2', kind: 'plan' }],
  [inDays(1)]: [{ id: 'p2', text: 'Study: Module 3 (BFS)', kind: 'plan' }],
  [inDays(2)]: [{ id: 'p3', text: 'Module 4 and the lecture-ready check', kind: 'plan' }],
}, { sync: 'plans' });

/** To-do list: [{ id, text, done }] */
export const todoStore = createStore('cos212-todos', [
  { id: 1, text: 'Do the warm-up (Module 1)', done: false },
  { id: 2, text: 'Finish Module 3: Breadth-first search', done: false },
  { id: 3, text: 'Do a practice round', done: false },
  { id: 4, text: 'Write one question for the lecture', done: false },
], { sync: 'todos' });

/*
 * Study-time tracking, written by the lesson while "Track my study time" is on.
 * Same shape the Analysis prototype reads, plus `days` for the weekly chart:
 *   { modes: { Watching: secs, ... }, concepts: {...}, acc: {...},
 *     days: { 'YYYY-MM-DD': secs }, saved: timestamp }
 */
export const MODES = ['Watching', 'Listening', 'Reading', 'Trying', 'Coding', 'Practising'];
export const trackStore = createStore('cos212-track', { modes: {}, concepts: {}, acc: {}, days: {} }, { sync: 'track' });

/** Add tracked seconds for a way of learning (and optional concept) to today. */
export function addStudyTime(mode, seconds, concept) {
  const day = dateKey(new Date());
  trackStore.set((t) => ({
    ...t,
    modes: { ...t.modes, [mode]: (t.modes?.[mode] || 0) + seconds },
    concepts: concept ? { ...t.concepts, [concept]: (t.concepts?.[concept] || 0) + seconds } : t.concepts,
    days: { ...t.days, [day]: (t.days?.[day] || 0) + seconds },
    saved: Date.now(),
  }));
}

/** Record one answer for a concept: acc[concept] = [right, total]. Feeds My analysis. */
export function recordAnswer(concept, right) {
  trackStore.set((t) => {
    const [r, n] = t.acc?.[concept] || [0, 0];
    return { ...t, acc: { ...t.acc, [concept]: [r + (right ? 1 : 0), n + 1] }, saved: Date.now() };
  });
}

/** One practice question answered: counts towards "Did 5 practice questions". */
export function countPractice() {
  progressStore.set((p) => {
    const practiceCount = (p.practiceCount || 0) + 1;
    return { ...p, practiceCount, practice5: p.practice5 || practiceCount >= 5 };
  });
}

/** Questions the student wants to bring to the lecture: [{ id, text, from }] */
export const questionStore = createStore('cos212-questions', [], { sync: 'questions' });

/** Every store that is also saved on the Python server. */
export const SYNCED_STORES = [profileStore, progressStore, topicsStore, planStore, todoStore, trackStore, questionStore];

export function addLectureQuestion(text, from = 'Lessons') {
  const t = text.trim();
  if (!t) return;
  questionStore.set((list) => [...list, { id: Date.now(), text: t, from }]);
  markDone('question');
}

/* ---------- date helpers ---------- */

export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Monday..Sunday of the week containing `d`. */
export function weekDates(d = new Date()) {
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * This week's minutes per day, from the student's own tracked time only.
 * No sample data: an empty week shows zeros (isEmpty: true) and topMode is null.
 */
export function weekSummary(track) {
  const days = weekDates();
  const mins = days.map((d) => Math.round((track?.days?.[dateKey(d)] || 0) / 60));
  const modes = track?.modes || {};
  const hasModes = MODES.some((m) => (modes[m] || 0) > 0);
  const top = hasModes ? MODES.reduce((best, m) => ((modes[m] || 0) > (modes[best] || 0) ? m : best), MODES[0]) : null;
  const total = mins.reduce((a, b) => a + b, 0);
  return {
    isEmpty: total === 0,
    total,
    topMode: top,
    bars: mins.map((v, i) => ({ short: DAY_SHORT[i], long: DAY_LONG[i], mins: v })),
  };
}
