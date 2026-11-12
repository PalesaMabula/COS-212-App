import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import ReadAloud from '../ui/ReadAloud';
import { Panel, Pill, Row } from '../ui/primitives';
import LessonSection from './LessonSection';
import Ide, { IdeButton } from './Ide';
import { useSettings } from '../../context/SettingsContext';
import { useCourse } from '../../context/CourseContext';
import { useTracker } from '../../hooks/useStudyTracker';
import useApi from '../../api/useApi';
import { markDone } from '../../data/stores';

/*
 * Code lab: BFS in Python, traced line by line by the Python server
 * (/api/code). Run plays the trace, Step moves one line, and the panel beside
 * it shows the variables.
 */
export default function CodeLab({ section, number }) {
  const { settings } = useSettings();
  const { places } = useCourse().graph;
  const { act, signal } = useTracker();
  const [start, setStart] = useState('A');
  const [i, setI] = useState(0);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState('');
  const [said, setSaid] = useState(''); // announced only on manual steps, not during Run
  const { data, loading, error } = useApi(`/api/code?start=${encodeURIComponent(start)}`);

  const frames = useMemo(() => data?.frames || [], [data]);
  const src = data?.source || [];
  const f = frames[Math.min(i, frames.length - 1)];
  const last = frames.length > 0 && i >= frames.length - 1;
  const delay = settings.speedA === 'slow' ? 800 : 400;

  useEffect(() => {
    signal('code', running);
    if (!running) return undefined;
    const id = setInterval(() => {
      setI((x) => {
        if (x >= frames.length - 1) {
          setRunning(false);
          return x;
        }
        return x + 1;
      });
    }, delay);
    return () => clearInterval(id);
  }, [running, frames.length, delay, signal]);

  useEffect(() => {
    if (last) {
      markDone('ranCode');
      setSaid(`Finished. Output: ${frames.at(-1).out}`);
    }
  }, [last, frames]);

  useEffect(() => () => signal('code', false), [signal]);

  const step = () => {
    act('Coding', 'BFS');
    setRunning(false);
    const n = Math.min(i + 1, frames.length - 1);
    setI(n);
    setSaid(`Line ${frames[n].line}. ${frames[n].note}`);
  };
  const run = () => {
    act('Coding', 'BFS');
    if (settings.speedA === 'step') return step();
    if (last) setI(0);
    setRunning((r) => !r);
  };
  const reset = () => {
    setRunning(false);
    setI(0);
    setSaid('Reset to the start.');
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(src.join('\n'));
      setCopied('Copied');
    } catch {
      setCopied('Copy failed');
    }
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <LessonSection id="code" icon="code" label={`${number} · Code lab · Python`} title={section.title}>
      <ReadAloud
        id="codeRead"
        label="the code lab instructions"
        parts={[
          {
            text: 'Here is the same search in Python. Press Step to run one line at a time and watch the queue change, or Run to play it through. The highlighted line is the one running now.',
          },
        ]}
      />

      {error && <p role="alert">Couldn’t load the code from the server. Is it running?</p>}
      {loading && !data && <p role="status">Loading the code…</p>}
      {f && (
        <Row style={{ marginTop: 12 }}>
          <div style={{ flex: '999 1 420px', minWidth: 0 }}>
            <Ide
              file="bfs.py"
              lines={src}
              current={f.line}
              label="Python breadth-first search code"
              buttons={
                <>
                  <IdeButton onClick={run} aria-pressed={running}>
                    <Icon name={running ? 'pause' : 'play'} size={16} />
                    {running ? 'Pause' : 'Run'}
                  </IdeButton>
                  <IdeButton onClick={step} disabled={last}>
                    <Icon name="step" size={16} />
                    Step
                  </IdeButton>
                  <IdeButton onClick={reset}>
                    <Icon name="refresh" size={16} />
                    Reset
                  </IdeButton>
                  <IdeButton onClick={copy}>
                    <Icon name={copied === 'Copied' ? 'check' : 'copy'} size={16} />
                    {copied || 'Copy'}
                  </IdeButton>
                  <label>
                    Start at
                    <select
                      value={start}
                      onChange={(e) => {
                        setStart(e.target.value);
                        setI(0);
                        setRunning(false);
                      }}
                    >
                      {places.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                </>
              }
              terminal={
                <>
                  <span className="who">● traced by the Python server</span>
                  {'\n'}$ python bfs.py{'\n'}
                  {f.out || (i > 0 ? `running… line ${f.line}` : 'Press Run or Step')}
                </>
              }
            />
          </div>

          <Side>
            <Panel style={{ padding: 14, background: 'var(--soft)' }}>
              <p className="tag">
                Step {Math.min(i, frames.length - 1) + 1} of {frames.length} · line {f.line}
              </p>
              <p style={{ marginTop: 4 }}>{f.note}</p>
            </Panel>
            <Panel style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="list" size={18} />
                Variables
              </p>
              <p className="small">
                <span className="muted">vertex</span> = <strong>{f.place}</strong> · <span className="muted">n</span> = <strong>{f.n}</strong>
              </p>
              <p className="small muted">queue (front first)</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {f.q.length ? f.q.map((q) => <Pill key={q} $tone="warn">{q}</Pill>) : <span className="small muted">empty</span>}
              </div>
              <p className="small muted">found</p>
              <p className="small">{`{${f.found.join(', ')}}`}</p>
              <p className="small muted">order</p>
              <p className="small">{`[${f.order.join(', ')}]`}</p>
            </Panel>
            <p className="sr-only" aria-live="polite">
              {said}
            </p>
          </Side>
        </Row>
      )}
    </LessonSection>
  );
}

const Side = styled.div`
  flex: 1 1 280px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  .tag { color: var(--amber); font-size: 0.76rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
`;
