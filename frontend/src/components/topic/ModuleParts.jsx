import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import { useReadAloud } from '../ui/ReadAloud';
import { Button, Feedback, Panel } from '../ui/primitives';
import CampusMap from './CampusMap';
import useApi from '../../api/useApi';
import { topicsStore } from '../../data/stores';
import { useTracker } from '../../hooks/useStudyTracker';

/*
 * The blocks of a module page (one page per module, numbered sections).
 * Layout follows the agreed plan: each section has a number, a title, one
 * speaker for the whole section, a short explanation, then its blocks.
 */

/** Marks a section as done once it has been on screen for 4 seconds. */
function useSeen(key) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    let timer = null;
    const io = new IntersectionObserver(
      ([e]) => {
        clearTimeout(timer);
        if (e.isIntersecting) {
          timer = setTimeout(() => topicsStore.set((t) => (t[key] ? t : { ...t, [key]: true })), 4000);
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      clearTimeout(timer);
      io.disconnect();
    };
  }, [key]);
  return ref;
}

/** One numbered section: number, title, one speaker, the explanation, then its blocks. */
export function Part({ moduleId, part, children }) {
  const ref = useSeen(`${moduleId}/${part.id}`);
  const parts = part.text.map((t) => ({ text: t }));
  const ra = useReadAloud(`part-${moduleId}-${part.id}`, parts, { label: part.title, prefix: part.title });
  return (
    <PartPanel id={part.id} ref={ref} aria-labelledby={`${part.id}-h`}>
      <div className="head">
        {part.num && (
          <span className="num" aria-hidden="true">
            {part.num}
          </span>
        )}
        <h2 id={`${part.id}-h`}>
          {part.num && <span className="sr-only">{part.num}. </span>}
          {part.title}
        </h2>
        {part.text.length > 0 && ra.button}
      </div>
      {part.text.length > 0 && <div className="text">{parts.map((_, i) => ra.part(i))}</div>}
      {children}
    </PartPanel>
  );
}

const PartPanel = styled(Panel)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-margin-top: 16px;
  .head { display: flex; align-items: flex-start; gap: 14px; }
  .head h2 { flex: 1; padding-top: 4px; }
  .num { font-family: var(--font-head); font-size: 2.1rem; font-weight: 700; color: var(--mint); line-height: 1; min-width: 52px; }
  .text { display: flex; flex-direction: column; gap: 10px; max-width: 72ch; }
`;

/** Quick check: try first, then Show solution. No marks. */
export function QuickCheck({ section }) {
  const [open, setOpen] = useState(false);
  const { act } = useTracker();
  return (
    <Box>
      <p className="lbl">Quick check</p>
      <p>{section.q}</p>
      <div>
        <Button
          aria-expanded={open}
          style={{ minHeight: 40 }}
          onClick={() => {
            setOpen((o) => !o);
            act('Trying');
          }}
        >
          <Icon name={open ? 'x' : 'bulb'} size={16} />
          {open ? 'Hide solution' : 'Show solution'}
        </Button>
      </div>
      {open && (
        <Feedback $ok>
          <p style={{ fontWeight: 700 }}>{section.a}</p>
          {section.why && <p>{section.why}</p>}
        </Feedback>
      )}
    </Box>
  );
}

/** Practice exercises: longer questions, each with Show solution. */
export function Exercises({ section }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {section.items.map((x, i) => (
        <li key={x.q}>
          <Exercise n={i + 1} item={x} />
        </li>
      ))}
    </ol>
  );
}

function Exercise({ n, item }) {
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <p className="lbl">Exercise {n}</p>
      <p>{item.q}</p>
      <div>
        <Button aria-expanded={open} style={{ minHeight: 40 }} onClick={() => setOpen((o) => !o)}>
          <Icon name={open ? 'x' : 'bulb'} size={16} />
          {open ? 'Hide solution' : 'Show solution'}
        </Button>
      </div>
      {open && (
        <Feedback $ok>
          <p>{item.a}</p>
        </Feedback>
      )}
    </Box>
  );
}

export const Box = styled.div`
  border: 1px dashed var(--edge2);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--soft);
  .lbl { font-size: 0.76rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; color: var(--lilac); }
`;

export function Note({ section }) {
  return (
    <Feedback $tone="soft">
      <p style={{ fontWeight: 700 }}>{section.title}</p>
      <p>{section.text}</p>
    </Feedback>
  );
}

/** A plain table from the content. */
export function TableBlock({ section }) {
  return (
    <Scroll tabIndex={0} role="region" aria-label={section.title || 'Table'}>
      <table>
        {section.title && <caption className="sr-only">{section.title}</caption>}
        <thead>
          <tr>
            {section.headers.map((h, i) => (
              <th key={i} scope="col">
                {h || <span className="sr-only">Row</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) =>
                c === 0 && section.rowHeaders ? (
                  <th key={c} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={c}>{cell}</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

export const Scroll = styled.div`
  overflow-x: auto;
  border: 1px solid var(--edge);
  border-radius: 14px;
  table { border-collapse: collapse; width: 100%; font-size: 0.94rem; }
  th, td { border-bottom: 1px solid var(--edge); padding: 10px 12px; text-align: left; vertical-align: top; }
  thead th { color: var(--muted); font-weight: 600; font-size: 0.86rem; }
  tbody th { font-weight: 700; }
  tr:last-child td, tr:last-child th { border-bottom: 0; }
  tr.now td, tr.now th { background: var(--mintbg); }
`;

/** BFS from a start, one row per step, with Next step / Previous step (frames from the server). */
export function Stepper({ section }) {
  const { data } = useApi(`/api/bfs?start=${encodeURIComponent(section.start)}`);
  const [step, setStep] = useState(0);
  const { act } = useTracker();
  if (!data) return <p role="status">Loading…</p>;
  const frames = data.frames;
  const last = frames.length - 1;
  const fmt = (l) => (l.length ? l.join(', ') : 'none');
  const rows = frames.slice(0, step + 1).map((f, i) => {
    const served = i === 0 ? '—' : f.order.at(-1);
    const before = i === 0 ? [] : [...frames[i - 1].order, ...frames[i - 1].q];
    const already = i === 0 ? [] : (data.adj?.[served] || []).filter((n) => before.includes(n));
    const found = i === 0 ? section.start : f.added.length ? `${f.added.join(', ')}${already.length ? ` (${already.join(' and ')} already found)` : ''}` : 'none';
    return { step: i === 0 ? 'Start' : String(i), served, found, queue: `[${f.q.join(', ')}]`, set: fmt([...f.order, ...f.q].sort()) };
  });
  const f = frames[step];
  const status =
    step === 0 ? `Start: ${section.start} is in the queue and in the found set.` : `Step ${step}: served ${f.order.at(-1)}. The queue is now [${f.q.join(', ')}].`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {section.intro && <p>{section.intro}</p>}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ position: 'relative', maxWidth: 640, minWidth: 290, height: 260 }}>
          <CampusMap frame={f} />
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          <Icon name="back" size={18} />
          Previous step
        </Button>
        <Button
          $variant="primary"
          disabled={step === last}
          onClick={() => {
            setStep((s) => Math.min(last, s + 1));
            act('Trying', 'BFS');
          }}
        >
          Next step
          <Icon name="arrow" size={18} />
        </Button>
        <p className="small muted" aria-live="polite">
          {status}
        </p>
      </div>
      <Scroll>
        <table>
          <caption className="sr-only">BFS from {section.start}, one row per step</caption>
          <thead>
            <tr>
              <th scope="col">Step</th>
              <th scope="col">Serve (front)</th>
              <th scope="col">New neighbours found</th>
              <th scope="col">Queue after</th>
              <th scope="col">Found so far</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.step} className={i === step ? 'now' : undefined}>
                <th scope="row">{r.step}</th>
                <td>{r.served}</td>
                <td>{r.found}</td>
                <td>
                  <code className="inl">{r.queue}</code>
                </td>
                <td>{r.set}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroll>
      {step === last && (
        <Feedback $ok role="status">
          <p style={{ fontWeight: 700 }}>Visit order: {f.order.join(', ')}.</p>
          <p>{data.unreached?.length ? `${data.unreached.join(', ')} never joins the queue, so BFS never finds it.` : 'Every vertex was found.'}</p>
        </Feedback>
      )}
    </div>
  );
}
