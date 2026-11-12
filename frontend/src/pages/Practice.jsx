import { useState } from 'react';
import styled from 'styled-components';
import Icon from '../components/ui/Icon';
import { Button, Feedback, Panel, Pill, Tag } from '../components/ui/primitives';
import { GenQuestion, GraphCard, QList } from '../components/practice/Generated';
import { usePage } from '../context/PageContext';
import { api, learnerId } from '../api/client';
import { post } from '../api/useApi';
import { markDone, progressStore } from '../data/stores';
import { TrackerProvider, useTracker } from '../hooks/useStudyTracker';

/*
 * Practice: pick a module, get 5 new questions on a graph you haven't seen.
 * The Python server makes the round from a seed and checks every answer.
 */
const MODS = [
  { id: '2', kicker: 'Module 2', title: 'Graphs', desc: 'Neighbours, degree, isolated vertices, path length.', tone: 'ok' },
  { id: '3', kicker: 'Module 3', title: 'Breadth-first search', desc: 'BFS order, the queue, levels, spotting the bug.', tone: 'warn' },
  { id: '4', kicker: 'Module 4', title: 'Shortest routes', desc: 'Fewest edges, typing a route, parents, unreachable vertices.', tone: 'lilac' },
  { id: 'mix', kicker: 'All modules', title: 'Mixed', desc: 'A bit of everything from modules 2 to 4.', tone: 'none' },
];

export default function Practice() {
  usePage('Practice', 'Practice. Pick a module and get five new questions on a new graph. Press New questions as often as you like.');
  return (
    <TrackerProvider key="practice">
      <PracticeBody />
    </TrackerProvider>
  );
}

function PracticeBody() {
  const { act } = useTracker();
  const [mod, setMod] = useState(null);
  const [round, setRound] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [n, setN] = useState(0);

  const start = async (m) => {
    setMod(m);
    setError('');
    try {
      const r = await api(`/api/practice/round?module=${m}`);
      setRound(r);
      setAnswers({});
      setResults({});
      setN((x) => x + 1);
      requestAnimationFrame(() => document.getElementById('round-h')?.focus());
    } catch {
      setError('Couldn’t reach the server for new questions. Check that the app is running, then try again.');
    }
  };

  const check = async (q) => {
    setBusy(q.i);
    act('Practising');
    const a = answers[q.i];
    try {
      const r = await post(`/api/learners/${learnerId()}/practice/check`, {
        module: round.module === 'mix' ? 'mix' : String(round.module),
        seed: round.seed,
        index: q.i,
        ...(q.type === 'mcq' ? { choice: a } : { text: a }),
      });
      setResults((x) => ({ ...x, [q.i]: r }));
      progressStore.set((p) => ({ ...p, practiceCount: (p.practiceCount || 0) + 1 }));
      if ((progressStore.get().practiceCount || 0) >= 5) markDone('practice5');
    } catch {
      setError('Couldn’t reach the server to check that. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const qs = round?.questions || [];
  const checkedN = Object.keys(results).length;
  const rightN = Object.values(results).filter((r) => r.right).length;
  const missed = [...new Set(qs.filter((q) => results[q.i] && !results[q.i].right).map((q) => q.kindLabel.split(' · ')[1]))];
  const info = MODS.find((m) => m.id === mod);

  return (
    <>
      <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 28 }}>
        <Tag>Practice</Tag>
        <h1>Pick a module, get new questions</h1>
        <p className="muted" style={{ maxWidth: '62ch' }}>
          Each round is 5 questions on a small graph you haven’t seen. Press New questions as often as you like: the graph and the answers change every time.
        </p>
      </Panel>

      <Cards role="group" aria-label="Choose a module">
        {MODS.map((m) => (
          <button key={m.id} type="button" className={`mod${mod === m.id ? ' on' : ''}`} aria-pressed={mod === m.id} onClick={() => start(m.id)}>
            <Pill $tone={m.tone}>{m.kicker}</Pill>
            <span className="t">{m.title}</span>
            <span className="small muted">{m.desc}</span>
          </button>
        ))}
      </Cards>

      {error && (
        <Feedback role="alert">
          <p>{error}</p>
        </Feedback>
      )}

      {round && info && (
        <Panel aria-labelledby="round-h" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h2 id="round-h" tabIndex={-1}>
              {info.kicker}: {info.title} · round {n}
            </h2>
            <Button onClick={() => start(mod)}>
              <Icon name="refresh" size={18} />
              New questions
            </Button>
          </div>
          <GraphCard graph={round.graph} />
          <QList>
            {qs.map((q) => (
              <GenQuestion
                key={`${round.seed}-${q.i}`}
                q={q}
                total={qs.length}
                value={answers[q.i]}
                onChange={(v) => setAnswers((x) => ({ ...x, [q.i]: v }))}
                result={results[q.i]}
                busy={busy === q.i}
                onCheck={() => check(q)}
              />
            ))}
          </QList>
          {checkedN === qs.length && (
            <Feedback $ok role="status">
              <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                Round done: {rightN} out of {qs.length} right.
              </p>
              <p>{missed.length ? `Worth another look: ${missed.join(', ')}. Press New questions for a fresh graph.` : 'All right. Try another round, or a different module.'}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Button $variant="primary" onClick={() => start(mod)}>
                  New questions
                </Button>
                <Button
                  onClick={() => {
                    setRound(null);
                    setMod(null);
                  }}
                >
                  Change module
                </Button>
              </div>
            </Feedback>
          )}
        </Panel>
      )}
    </>
  );
}

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
  gap: 16px;
  .mod {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
    text-align: left;
    padding: 20px;
    border-radius: 20px;
    border: 1px solid var(--edge);
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
    min-height: 170px;
  }
  .mod:hover { border-color: var(--mint); }
  .mod.on { border-color: var(--mint); background: var(--mintbg); }
  .t { font-family: var(--font-head); font-size: 1.3rem; font-weight: 700; }
`;
