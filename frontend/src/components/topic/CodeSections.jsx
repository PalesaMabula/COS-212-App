import { useState } from 'react';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import { Button, Feedback, Field, Row } from '../ui/primitives';
import LessonSection from './LessonSection';
import Ide, { IdeButton } from './Ide';
import { useTracker } from '../../hooks/useStudyTracker';
import { runCode } from '../../api/learner';

/*
 * Code from the course, run for real by the Python server.
 * Tasks follow "predict, then run": write what you think it prints, then Run.
 */
export function CodeSection({ section, number, topic, index }) {
  const { act } = useTracker();
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);

  const runAll = async () => {
    act('Coding', topic.concept || 'Graphs in Python');
    setBusy(true);
    try {
      setOut(await runCode(topic.id, { section: index }));
    } catch {
      setOut({ ok: false, output: '', error: 'Couldn’t reach the Python server.' });
    }
    setBusy(false);
  };

  return (
    <LessonSection id="code" icon="code" label={`${number} · Code lab · Python`} title="See it in code">
      <Ide
        file={section.file}
        lines={section.source}
        buttons={
          <IdeButton onClick={runAll} disabled={busy}>
            <Icon name="play" size={16} />
            {busy ? 'Running…' : 'Run'}
          </IdeButton>
        }
        terminal={
          <>
            <span className="who">● runs on the Python server</span>
            {'\n'}$ python {section.file}
            {'\n'}
            {out ? out.output || out.error : 'Press Run to see what it prints.'}
          </>
        }
      />
      {section.tasks.length > 0 && (
        <>
          <h3 style={{ marginTop: 18 }}>Predict, then run</h3>
          <p className="small muted">Write what you think will happen, then press Run to check. Guesses are welcome.</p>
          <Tasks>
            {section.tasks.map((t, i) => (
              <Task key={i} task={t} n={i} topic={topic} index={index} />
            ))}
          </Tasks>
        </>
      )}
    </LessonSection>
  );
}

function Task({ task, n, topic, index }) {
  const { act } = useTracker();
  const [guess, setGuess] = useState('');
  const [res, setRes] = useState(null);
  const id = `task-${index}-${n}`;
  const run = async () => {
    act('Coding', topic.concept || 'Graphs in Python');
    try {
      setRes(await runCode(topic.id, { section: index, task: n }));
    } catch {
      setRes({ ok: false, output: '', error: 'Couldn’t reach the Python server.' });
    }
  };
  return (
    <li className="task">
      <label htmlFor={id} style={{ fontWeight: 700 }}>
        {n + 1}. {task.q}
      </label>
      <Row style={{ gap: 8 }}>
        <Field id={id} value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Type here" style={{ flex: '1 1 220px' }} />
        <Button $variant="primary" onClick={run}>
          <Icon name="play" size={18} />
          Run to check
        </Button>
      </Row>
      {res && (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <pre className="out">
            <span className="muted">&gt;&gt;&gt; {task.run.split('\n').join('\n>>> ')}</span>
            {'\n'}
            {res.output || res.error}
          </pre>
          {res.answer && (
            <Feedback $ok>
              <p>
                <strong>Answer: {res.answer}.</strong> {res.why}
              </p>
            </Feedback>
          )}
        </div>
      )}
    </li>
  );
}

/** Two code blocks side by side (bug vs correct), each runnable on the server. */
export function CodeCompareSection({ section, number, topic, index }) {
  const { act } = useTracker();
  const [outs, setOuts] = useState({});
  const run = async (b) => {
    act('Coding', topic.concept);
    try {
      const r = await runCode(topic.id, { section: index, block: b });
      setOuts((o) => ({ ...o, [b]: r.output || r.error }));
    } catch {
      setOuts((o) => ({ ...o, [b]: 'Couldn’t reach the Python server.' }));
    }
  };
  return (
    <LessonSection id="code" icon="code" label={`${number} · Code · spot the difference`} title={section.title}>
      <Row>
        {section.blocks.map((b, i) => (
          <div key={b.label} style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name={b.bad ? 'x' : 'check'} size={18} />
              {b.label}
            </p>
            <Ide
              file={b.bad ? 'bfs_bug.py' : 'bfs.py'}
              lines={b.source}
              bad={b.bad}
              buttons={
                <IdeButton onClick={() => run(i)}>
                  <Icon name="play" size={16} />
                  Run it
                </IdeButton>
              }
              terminal={outs[i] ?? 'Press Run to see which vertices get served.'}
            />
          </div>
        ))}
      </Row>
    </LessonSection>
  );
}

const Tasks = styled.ol`
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  .task { display: flex; flex-direction: column; gap: 8px; }
  .out { margin: 0; padding: 10px 14px; border-radius: 10px; background: #0b0010; color: #22ff00; white-space: pre-wrap; font-size: 14px; }
  .out .muted { color: #a98bbd; }
`;
