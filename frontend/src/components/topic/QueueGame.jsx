import { useState } from 'react';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import { Button, Choices, Feedback, Pill, Row } from '../ui/primitives';
import LessonSection from './LessonSection';
import CampusMap, { QueueStrip } from './CampusMap';
import { useSettings } from '../../context/SettingsContext';
import { useCourse } from '../../context/CourseContext';
import { useTracker } from '../../hooks/useStudyTracker';
import { post } from '../../api/useApi';
import { markDone } from '../../data/stores';
import { learnerId } from '../../api/client';
import { MisconceptionBox } from './parts';

/*
 * Be the Queue (Module 3, section 06): the student runs BFS. Each round: serve the front, choose
 * which neighbours join (in list order) and their hop counts. The Python server
 * checks every move against the real BFS and tags mistakes (stack order,
 * duplicates, non-neighbours, skipped neighbours, wrong order, stopping early,
 * wrong hop). Everything is buttons; the map is an extra way to pick.
 */
const fresh = (start) => ({ queue: [start], found: [start], order: [], parent: { [start]: null }, hop: { [start]: 0 } });

export default function QueueGame({ section, number }) {
  const { settings } = useSettings();
  const { graph } = useCourse();
  const { act } = useTracker();
  const [start, setStart] = useState(section.start);
  const [done, setDone] = useState(0);
  const [state, setState] = useState(fresh(section.start));
  const [serving, setServing] = useState(null);
  const [picked, setPicked] = useState([]);
  const [hops, setHops] = useState({});
  const [msg, setMsg] = useState(null);
  const [ledger, setLedger] = useState([]); // { step, served, joined, queue_after, state }
  const [finished, setFinished] = useState(false);
  const [replay, setReplay] = useState(null); // index into ledger, or null for live
  const [mistakes, setMistakes] = useState(0);

  const restart = (s = start) => {
    setStart(s);
    setDone(0);
    setState(fresh(s));
    setServing(null);
    setPicked([]);
    setHops({});
    setMsg(null);
    setLedger([]);
    setFinished(false);
    setReplay(null);
    setMistakes(0);
  };

  const send = async (move) => {
    act('Trying', 'BFS');
    try {
      const r = await post('/api/queue-game/move', { start, done, move, learner: learnerId() });
      setMsg({ ok: r.ok, text: r.message, tag: r.tag, misconception: r.misconception });
      if (!r.ok) setMistakes((m) => m + 1);
      return r;
    } catch {
      setMsg({ ok: false, text: 'Couldn’t reach the server to check that. Try again.' });
      return null;
    }
  };

  const serve = async (place) => {
    const r = await send({ type: 'serve', place });
    if (r?.ok) {
      setServing(place);
      setPicked([]);
      setHops({});
    }
  };

  const join = async () => {
    const r = await send({ type: 'join', served: serving, picked, hops });
    if (r?.ok) {
      setLedger((l) => [...l, { ...r.row, state: r.state }]);
      setState(r.state);
      setDone(r.done);
      setServing(null);
      setPicked([]);
      setHops({});
    }
  };

  const finish = async () => {
    const r = await send({ type: 'finish' });
    if (r?.ok) {
      setFinished(true);
      markDone('traced');
    }
  };

  const togglePick = (p) => {
    if (!serving || p === serving) return;
    setPicked((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]));
    setHops((h) => {
      const next = { ...h };
      delete next[p];
      return next;
    });
  };

  // What the map and panels show: live state, or a snapshot when replaying.
  const view = replay !== null ? ledger[replay].state : state;
  const servingNow = replay === null ? serving : null;
  const queueView = servingNow ? view.queue.slice(1) : view.queue;
  const orderView = servingNow ? [...view.order, servingNow] : view.order;
  const frame = {
    q: queueView,
    order: orderView,
    added: [],
    parent: Object.fromEntries(Object.entries(view.parent).filter(([, v]) => v)),
    hop: view.hop,
  };
  const baseHop = servingNow ? view.hop[servingNow] : 0;
  const ready = picked.every((p) => hops[p] !== undefined);
  const textState =
    `Queue, front to back: ${queueView.length ? queueView.join(', ') : 'empty'}. ` +
    `Found: ${view.found.join(', ')}. Served so far: ${orderView.length ? orderView.join(', ') : 'none'}.` +
    (servingNow ? ` Now serving ${servingNow}.` : '');

  return (
    <LessonSection id="queue" icon="list" label={`${number} · Be the Queue · you run BFS`} title={section.title}>
      <p style={{ marginBottom: 10 }}>{section.intro}</p>

      <Choices role="group" aria-label="Start vertex" style={{ marginBottom: 10 }}>
        <span className="small muted">Start at</span>
        {graph.places.map((p) => (
          <Button key={p} $on={start === p} aria-pressed={start === p} onClick={() => restart(p)}>
            {p}
          </Button>
        ))}
      </Choices>

      <Order>
        <p className="small" style={{ fontWeight: 700 }}>
          Neighbour lists, in order (as in the adjacency list):
        </p>
        <ul>
          {graph.places.map((p) => (
            <li key={p} className="small">
              <strong>{p}:</strong> {graph.adj[p].length ? graph.adj[p].join(', ') : '(none)'}
            </li>
          ))}
        </ul>
      </Order>

      <Row style={{ marginTop: 12 }}>
        <div style={{ flex: '999 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ position: 'relative', minWidth: 290, height: 260 }}>
              <CampusMap
                frame={frame}
                labels={settings.labels}
                picked={picked}
                onPick={(p) => (replay !== null || finished ? null : servingNow ? togglePick(p) : queueView.includes(p) ? serve(p) : null)}
              />
            </div>
          </div>
          <QueueStrip queue={queueView} labels={settings.labels} />
          <p className="sr-only" aria-live="polite">
            {textState}
          </p>
          <StateTable>
            <caption className="small muted">Every found vertex, its parent and level</caption>
            <thead>
              <tr>
                <th scope="col">Vertex</th>
                <th scope="col">Parent</th>
                <th scope="col">Level</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {view.found.map((p) => (
                <tr key={p}>
                  <th scope="row">{p}</th>
                  <td>{view.parent[p] || '—'}</td>
                  <td>{view.hop[p]}</td>
                  <td>{orderView.includes(p) ? '✓ served' : '⏱ waiting'}</td>
                </tr>
              ))}
            </tbody>
          </StateTable>
        </div>

        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {replay !== null ? (
            <Feedback $tone="soft">
              <p>
                <strong>Replaying step {replay + 1}</strong> of {ledger.length}: served {ledger[replay].served}
                {ledger[replay].joined.length ? `, then ${ledger[replay].joined.join(' and ')} joined.` : ', nobody new joined.'}
              </p>
            </Feedback>
          ) : finished ? (
            <Feedback $ok>
              <p style={{ fontWeight: 700 }}>You ran BFS from {start}.</p>
              <p>
                Order: {state.order.join(', ')}. {mistakes === 0 ? 'No mistakes.' : `${mistakes} “not yet” on the way, which is how this works.`}
              </p>
              <Button onClick={() => restart(start === 'A' ? 'D' : 'A')} style={{ alignSelf: 'flex-start' }}>
                Try another start
              </Button>
            </Feedback>
          ) : !servingNow ? (
            <>
              <p style={{ fontWeight: 700, fontSize: '1.12rem' }}>Round {done + 1}: who is served now?</p>
              <Choices role="group" aria-label="Serve a vertex from the queue">
                {state.queue.map((p, i) => (
                  <Button key={p} onClick={() => serve(p)}>
                    Serve {p} {i === 0 ? '(front)' : i === state.queue.length - 1 ? '(back)' : ''}
                  </Button>
                ))}
              </Choices>
              <Button onClick={finish} style={{ alignSelf: 'flex-start' }}>
                <Icon name="check" size={18} />
                Finish: the queue is empty
              </Button>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 700, fontSize: '1.12rem' }}>Serving {servingNow}. Who joins the back?</p>
              <p className="small muted">Tap the vertices in the order they join. Then give each one’s level (edges from the start).</p>
              <Choices role="group" aria-label={`Vertices that join after serving ${servingNow}`}>
                {graph.places
                  .filter((p) => p !== servingNow)
                  .map((p) => (
                    <Button key={p} $on={picked.includes(p)} aria-pressed={picked.includes(p)} onClick={() => togglePick(p)}>
                      {picked.includes(p) ? `${picked.indexOf(p) + 1}. ` : ''}
                      {p}
                    </Button>
                  ))}
              </Choices>
              {picked.map((p) => (
                <Choices key={p} role="group" aria-label={`Edges from ${start} to ${p}`}>
                  <span className="small">
                    {p}: edges from {start}
                  </span>
                  {[baseHop, baseHop + 1, baseHop + 2].map((h) => (
                    <Button key={h} $on={hops[p] === h} aria-pressed={hops[p] === h} onClick={() => setHops((x) => ({ ...x, [p]: h }))}>
                      {h}
                    </Button>
                  ))}
                </Choices>
              ))}
              <Button $variant="primary" onClick={join} disabled={!ready} style={{ alignSelf: 'flex-start' }}>
                {picked.length ? `Add ${picked.join(', ')} to the back` : 'Nobody new joins'}
              </Button>
              {!ready && <p className="small muted">Choose a level for each vertex first.</p>}
            </>
          )}

          <div role="status" aria-live="polite">
            {msg && replay === null && (
              <Feedback $ok={msg.ok}>
                <p>{msg.text}</p>
                {msg.tag && <Pill $tone="warn">Mistake type: {msg.tag.replace(/_/g, ' ')}</Pill>}
              </Feedback>
            )}
            {msg && !msg.ok && replay === null && <MisconceptionBox key={msg.text} m={msg.misconception} />}
          </div>
        </div>
      </Row>

      <h3 style={{ marginTop: 18 }}>Step ledger</h3>
      {ledger.length === 0 ? (
        <p className="small muted">Each finished round appears here.</p>
      ) : (
        <>
          <StateTable>
            <thead>
              <tr>
                <th scope="col">Step</th>
                <th scope="col">Served</th>
                <th scope="col">Joined</th>
                <th scope="col">Queue after</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((r, i) => (
                <tr key={r.step} aria-current={replay === i ? 'step' : undefined} className={replay === i ? 'on' : ''}>
                  <td>{r.step}</td>
                  <td>{r.served}</td>
                  <td>{r.joined.length ? r.joined.join(', ') : '—'}</td>
                  <td>{r.queue_after.length ? r.queue_after.join(', ') : 'empty'}</td>
                </tr>
              ))}
            </tbody>
          </StateTable>
          <Choices style={{ marginTop: 8 }}>
            <Button onClick={() => setReplay(0)}>
              <Icon name="refresh" size={18} />
              Replay from step 1
            </Button>
            <Button onClick={() => setReplay((r) => Math.max(0, (r ?? 1) - 1))} disabled={replay === null || replay === 0}>
              <Icon name="back" size={18} />
              Previous step
            </Button>
            <Button onClick={() => setReplay((r) => Math.min(ledger.length - 1, (r ?? -1) + 1))} disabled={replay === null || replay === ledger.length - 1}>
              Next step <Icon name="arrow" size={18} />
            </Button>
            {replay !== null && <Button onClick={() => setReplay(null)}>Back to my game</Button>}
            <Button onClick={() => restart()}>Start over</Button>
          </Choices>
        </>
      )}
    </LessonSection>
  );
}

const Order = styled.div`
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--soft);
  ul { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 18px; }
`;

const StateTable = styled.table`
  border-collapse: collapse;
  width: 100%;
  caption { text-align: left; padding-bottom: 4px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--edge); font-size: 0.88rem; }
  thead th { color: var(--muted); }
  tr.on td { background: var(--mintbg); }
`;
