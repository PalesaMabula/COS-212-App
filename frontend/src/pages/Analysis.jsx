import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../components/ui/Icon';
import Astronaut from '../components/ui/Astronaut';
import ReadAloud, { useReadAloud } from '../components/ui/ReadAloud';
import { Button, ButtonLink, Feedback, Panel, Pill, Row, Tag } from '../components/ui/primitives';
import { usePage } from '../context/PageContext';
import { api, learnerId } from '../api/client';
import { clearRemote, pushAll } from '../api/sync';
import { dateKey, planStore, trackStore } from '../data/stores';
import { SimilarQuestion } from '../components/topic/parts';

/*
 * My analysis. All numbers are worked out by the Python server
 * (/api/learners/:id/analysis) from the student's own tracked time and
 * checked answers. Habits, not marks: the insight is a nudge, not a label.
 */
const MODE_ICON = { Watching: 'eye', Listening: 'headphones', Reading: 'text', Trying: 'hand', Coding: 'code', Practising: 'target' };
const TONE = { Ready: 'ok', Review: 'warn', 'Watch out': 'warn', 'Not checked': 'lilac', 'Not checked yet': 'lilac', 'Not answered': 'none' };

export default function Analysis() {
  const [a, setA] = useState(null);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      await pushAll(); // make sure the server has the latest study time first
      setA(await api(`/api/learners/${learnerId()}/analysis`));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pageText = a
    ? [
        'My analysis.',
        a.insight.head,
        a.insight.body,
        a.insight.focus,
        a.insight.tips.length ? `Ideas that build on what you've been doing: ${a.insight.tips.join(' ')}` : '',
        a.insight.stretch ? `To stretch yourself: ${a.insight.stretch}` : '',
      ]
        .filter(Boolean)
        .join(' ')
    : 'My analysis.';
  usePage('My analysis', pageText);

  const clearTracked = async () => {
    trackStore.reset();
    await clearRemote('track');
    load();
  };

  const addPlan = () => {
    const today = new Date();
    planStore.set((p) => {
      const next = { ...p };
      a.plan.forEach((text, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i + 1);
        const k = dateKey(d);
        next[k] = [...(next[k] || []), { id: `a${Date.now()}${i}`, text, kind: 'plan', mine: true }];
      });
      return next;
    });
    setAdded(true);
  };

  if (error)
    return (
      <Panel role="alert">
        <h1>My analysis</h1>
        <p className="muted">Couldn’t reach the server for your analysis.</p>
        <Button onClick={load}>Try again</Button>
      </Panel>
    );
  if (!a) return <Panel role="status">Working out your analysis…</Panel>;

  const maxConcept = Math.max(1, ...a.concepts.map((c) => c.secs));
  const maxWeek = Math.max(1, ...a.week.map((w) => w.mins));

  return (
    <>
      <Panel style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
        <Astronaut />
        <div style={{ flex: '999 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Tag>My analysis</Tag>
          <h1>Your learning orbit</h1>
          <ReadAloud id="anIntro" muted={[0]} label="the introduction" parts={[{ text: 'How you’ve studied so far, what’s working, and how to prepare for the lecture. This is about habits, not marks.' }]} />
        </div>
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {a.empty ? <Pill $tone="warn">Nothing tracked yet</Pill> : <Pill $tone="ok">Showing your tracked time</Pill>}
          <p className="small muted">{a.empty ? a.message : 'Worked out by the Python server from your study time and answers.'}</p>
          {a.empty && (
            <ButtonLink as={Link} to="/module/1" style={{ alignSelf: 'flex-start' }}>
              <Icon name="book" size={18} />
              Start Module 1
            </ButtonLink>
          )}
          <Button onClick={clearTracked} disabled={a.empty} style={{ alignSelf: 'flex-start' }}>
            <Icon name="x" size={18} />
            Clear my tracked time
          </Button>
        </div>
      </Panel>

      <Stats>
        <Stat icon="clock" label="Time on task" value={a.total} />
        <Stat icon="target" label="Accuracy (first tries)" value={a.accuracy.pct === null ? '—' : `${a.accuracy.pct}%`} sub={a.accuracy.total ? `${a.accuracy.right} of ${a.accuracy.total}` : 'no answers yet'} />
        <Stat icon="layers" label="Topics done" value={`${a.topics.done} of ${a.topics.total}`} />
        <Stat icon="trophy" label="Lecture-ready goals" value={`${a.goals_ready.ready} of ${a.goals_ready.total}`} sub={a.report ? 'from your lecture-ready check' : 'take the lecture-ready check (Module 4)'} />
      </Stats>

      {a.report && (
        <Feedback $ok role="status">
          <p style={{ fontWeight: 700, fontSize: '1.18rem' }}>
            <Icon name="trophy" size={20} /> {a.report.comparison}
          </p>
          <p className="small">You compared with your own warm-up, not with anyone else. {a.report.note}</p>
        </Feedback>
      )}

      <Row>
        <Panel as="section" aria-labelledby="mode-h" style={{ flex: '999 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <h2 id="mode-h">How you spent your time</h2>
            <span className="small muted">by way of learning</span>
          </div>
          {a.modes.map((m) => (
            <HBar key={m.name}>
              <span className="lbl">
                <span className="ico">
                  <Icon name={MODE_ICON[m.name]} size={18} />
                </span>
                {m.name}
              </span>
              <div className="track" role="img" aria-label={`${m.name}: ${m.time}, ${m.pct} percent`}>
                <span style={{ width: `${Math.max(2, m.pct)}%`, background: m.name === a.top ? 'var(--mint)' : 'var(--lilac)' }} />
              </div>
              <span className="small" style={{ textAlign: 'right' }}>
                {m.time}
              </span>
            </HBar>
          ))}
          <p className="small muted">Watching = animations · Listening = read-aloud · Reading = notes on screen · Trying = map labs · Coding = code labs · Practising = questions</p>
        </Panel>

        <Panel as="section" aria-labelledby="ins-h" style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, borderColor: 'var(--mint)' }}>
          <h2 id="ins-h" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Icon name="bulb" /> What this suggests
          </h2>
          <Insight insight={a.insight} />
          <p className="small muted">This describes what you’ve done so far, not a fixed learning style. Preferences shift with the topic and the day, and mixing ways of learning usually helps ideas stick, so treat it as a nudge, not a label.</p>
        </Panel>
      </Row>

      <Row>
        <Panel as="section" aria-labelledby="con-h" style={{ flex: '999 1 460px', minWidth: 0 }}>
          <h2 id="con-h" style={{ marginBottom: 8 }}>
            Concept by concept
          </h2>
          {a.concepts.map((c) => (
            <Concept key={c.name}>
              <div style={{ flex: '1 1 180px' }}>
                <p style={{ fontWeight: 700 }}>{c.name}</p>
                <p className="small muted">
                  {c.time} · {c.pct === null ? 'no questions yet' : `${c.pct}% right first time (${c.right} of ${c.total})`}
                </p>
              </div>
              <div className="track" role="img" aria-label={`${c.name}: ${c.time}`} style={{ flex: '1 1 160px' }}>
                <span style={{ width: `${Math.max(2, Math.round((c.secs / maxConcept) * 100))}%`, background: c.status === 'Review' ? 'var(--amber)' : 'var(--mint)' }} />
              </div>
              <Pill $tone={TONE[c.status]}>{c.status}</Pill>
              <p className="small muted" style={{ flexBasis: '100%' }}>
                {c.advice}{' '}
                {c.status !== 'Ready' && !c.slips.length && <Link to={`/module/${c.review}`}>Go to Module {c.topic}</Link>}
              </p>
              {c.slips.map((sl) => (
                <Slip key={sl.tag} slip={sl} />
              ))}
            </Concept>
          ))}
        </Panel>

        <Panel as="section" aria-labelledby="wk-h" style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id="wk-h">This week</h2>
          <Bars role="img" aria-label={`Minutes per day: ${a.week.map((w) => `${w.day} ${w.mins}`).join(', ')}`}>
            {a.week.map((w) => (
              <div key={w.day} className={`bar${w.mins === maxWeek && w.mins > 0 ? ' hi' : ''}`} aria-hidden="true">
                <span className="small">{w.mins}</span>
                <span className="b" style={{ height: `${Math.max(4, Math.round((w.mins / maxWeek) * 100))}px` }} />
                <span className="small muted">{w.day}</span>
              </div>
            ))}
          </Bars>
          <p className="small">Short sessions with breaks usually beat one long one.</p>
        </Panel>
      </Row>

      <Panel as="section" aria-labelledby="prep-h" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 id="prep-h" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="calendar" /> Prepare for the lecture
        </h2>
        <Row>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Your plan for the next sessions</p>
            <ol style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {a.plan.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
            <Button $variant="primary" onClick={addPlan} disabled={added} style={{ marginTop: 12 }}>
              <Icon name={added ? 'check' : 'calendar'} size={18} />
              {added ? 'Added to your calendar' : 'Add these to my calendar'}
            </Button>
          </div>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Goal by goal</p>
            <p className="small muted" style={{ marginBottom: 8 }}>
              {a.report ? 'From your lecture-ready check.' : 'From your answers so far. The lecture-ready check gives the final word.'}
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {a.goals.map((g) => (
                <li key={g.num} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <span className="small">
                    {g.num}. {g.text}
                    {g.attempts?.total > 0 && (
                      <span className="muted">
                        {' '}
                        ({g.attempts.right} of {g.attempts.total} tries right)
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <Pill $tone={g.tone || TONE[g.status] || 'none'} style={{ whiteSpace: 'nowrap' }}>
                      {g.status}
                    </Pill>
                    {g.see && (
                      <Link to={`/module/${g.see}`} className="small">
                        Review
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {!a.report && (
              <ButtonLink as={Link} to={`/module/${a.ready_link}`} style={{ marginTop: 12 }}>
                Take the lecture-ready check <Icon name="arrow" size={18} />
              </ButtonLink>
            )}
          </div>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Questions to bring</p>
            <p className="small muted" style={{ marginBottom: 8 }}>
              Picked for the topics you’re finding hardest, plus any you wrote.
            </p>
            <ol style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {a.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </div>
        </Row>
      </Panel>
    </>
  );
}

/** "What this suggests": one speaker reads the summary, the ideas and the stretch tip. */
function Insight({ insight }) {
  const tips = insight.tips || [];
  const parts = useMemo(() => {
    const p = [{ lead: insight.head, text: insight.body }];
    if (insight.focus) p.push({ lead: 'Your focus:', text: insight.focus });
    (insight.tips || []).forEach((text) => p.push({ text }));
    if (insight.stretch) p.push({ lead: 'Stretch yourself:', text: insight.stretch });
    return p;
  }, [insight]);
  const ra = useReadAloud('insight', parts, { label: 'what this suggests' });
  const first = insight.focus ? 2 : 1; // index of the first tip
  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {ra.button}
        {ra.part(0)}
      </div>
      {insight.focus && <Feedback $tone="soft">{ra.part(1)}</Feedback>}
      {tips.length > 0 && (
        <>
          <p style={{ fontWeight: 700 }}>Ideas that build on what you’ve been doing</p>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tips.map((_, i) => ra.part(first + i, { as: 'li' }))}
          </ul>
        </>
      )}
      {insight.stretch && <Feedback $tone="soft">{ra.part(parts.length - 1)}</Feedback>}
    </>
  );
}

/** One misconception that keeps showing up: what it is, where it's taught, and a similar question. */
function Slip({ slip }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ flexBasis: '100%', padding: 12, borderRadius: 12, background: 'var(--amberbg)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p className="small">
        <strong>
          {slip.title} ({slip.count}×).
        </strong>{' '}
        {slip.explain}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <ButtonLink as={Link} to={`/module/${slip.link}`}>
          <Icon name="book" size={18} />
          {slip.label}
        </ButtonLink>
        {!open && (
          <Button onClick={() => setOpen(true)}>
            <Icon name="refresh" size={18} />
            Try a similar one
          </Button>
        )}
      </div>
      {open && <SimilarQuestion tag={slip.tag} />}
    </div>
  );
}

function Stat({ icon, label, value, sub }) {
  return (
    <Panel style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--mintbg)', color: 'var(--mint)', flex: 'none' }}>
        <Icon name={icon} />
      </span>
      <div>
        <p className="small muted">{label}</p>
        <p style={{ fontSize: '1.65rem', fontWeight: 700 }}>{value}</p>
        {sub && <p className="small muted">{sub}</p>}
      </div>
    </Panel>
  );
}

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 20px;
`;

const HBar = styled.div`
  display: grid;
  grid-template-columns: minmax(130px, 170px) 1fr 64px;
  gap: 12px;
  align-items: center;
  .lbl { display: flex; align-items: center; gap: 10px; font-weight: 600; }
  .ico { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--soft); flex: none; }
  .track { height: 16px; border-radius: 10px; background: var(--soft); overflow: hidden; }
  .track > span { display: block; height: 100%; border-radius: 10px; }
`;

const Concept = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid var(--edge);
  .track { height: 10px; border-radius: 10px; background: var(--soft); overflow: hidden; }
  .track > span { display: block; height: 100%; border-radius: 10px; }
`;

const Bars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 150px;
  .bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
  .b { width: 100%; max-width: 34px; border-radius: 8px 8px 4px 4px; background: var(--edge2); }
  .bar.hi .b { background: var(--mint); }
`;
