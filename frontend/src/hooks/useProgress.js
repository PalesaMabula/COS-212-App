import { useCourse } from '../context/CourseContext';
import { progressStore, topicsStore } from '../data/stores';

/*
 * Where the student is in the course. Each module is one page of numbered
 * sections; a section counts as done once it has been read (on screen for a
 * few seconds). No locks: every module is open, the order is a suggestion.
 *
 *   topics   every section of every module, in course order:
 *            { id: '3/s01', module: 3, part: 's01', num: '01', title, short, done }
 *   modules  { ...module, topics: its sections, count, total, status, finished }
 *   next     the first section not done yet (null when all are done)
 */
export default function useProgress() {
  const course = useCourse();
  const done = topicsStore.use();
  const flags = progressStore.use();

  const topics = course.topics.flatMap((m) =>
    m.parts.map((p) => ({ id: `${m.id}/${p.id}`, module: m.module, part: p.id, num: p.num, title: p.title, short: p.short, done: !!done[`${m.id}/${p.id}`] }))
  );
  const next = topics.find((t) => !t.done) || null;
  const modules = course.modules.map((m) => {
    const mine = topics.filter((t) => t.module === m.num);
    const count = mine.filter((t) => t.done).length;
    const finished = !!done[String(m.num)] || count === mine.length;
    const status = finished ? 'done' : count > 0 || next?.module === m.num ? 'open' : 'later';
    const info = course.topics.find((t) => t.module === m.num);
    return { ...m, topics: mine, count, total: mine.length, status, finished, minutes: info?.minutes, goal: info?.goal };
  });
  const checklist = course.checklist.map((c) => ({ ...c, done: !!flags[c.id] }));

  return {
    topics,
    modules,
    next,
    doneCount: topics.filter((t) => t.done).length,
    checklist,
    readyDone: checklist.filter((c) => c.done).length,
    // The module to show on the Dashboard: the one with the next section in it.
    currentModule: modules.find((m) => m.num === (next?.module ?? modules.length)) || modules.at(-1),
  };
}

/** Link to a module ('3') or one of its sections ('3/s04'). */
export const topicPath = (id) => {
  const [m, part] = String(id).split('/');
  return part ? `/module/${m}?go=${part}` : `/module/${m}`;
};
