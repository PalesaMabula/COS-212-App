import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import ReadAloud from '../ui/ReadAloud';
import SketchChoice from '../ui/SketchChoice';
import { Button, ButtonLink, Chip, Feedback, Field, Pill } from '../ui/primitives';
import LessonSection from './LessonSection';
import { ExplainBox, HintLadder, MisconceptionBox, RetryObjective, VoiceField } from './parts';
import { useTracker } from '../../hooks/useStudyTracker';
import { checkAnswer } from '../../api/learner';
import { api, learnerId } from '../../api/client';
import { addLectureQuestion, markDone, questionStore } from '../../data/stores';

/*
 * Quizzes, checked by the Python server.
 *   mode "warmup": no marks, only a neutral line after each answer (Module 1)
 *   mode "check":  "Not yet" feedback, two hints, then a link back to the lesson
 *   mode "module": answer every question, then Submit; feedback on each one
 *   mode "ready":  the lecture-ready check; ends with the readiness report (Module 4)
 */
export default function QuizSection(props) {
  if (props.section.mode === 'module') return <ModuleQuiz {...props} />;
  return <InstantQuiz {...props} />;
}

function InstantQuiz({ section, number, topic, onComplete }) {
  const [results, setResults] = useState({});
  const [report, setReport] = useState(null);
  const qs = section.questions;
  const answered = qs.filter((q) => results[q.id]).length;
  const right = qs.filter((q) => results[q.id]?.first).length;
  const allDone = answered === qs.length;

  const record = (q, r) =>
    setResults((old) => (old[q.id] ? { ...old, [q.id]: { ...old[q.id], last: r.right } } : { ...old, [q.id]: { first: !!r.right, last: r.right } }));

  useEffect(() => {
    if (!allDone) return;
    onComplete?.();
    if (section.mode === 'warmup') markDone('warmup');
    if (section.mode === 'ready') {
      markDone('readyCheck');
      api(`/api/learners/${learnerId()}/report`)
        .then(setReport)
        .catch(() => setReport({ error: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const chip =
    section.mode === 'warmup' ? `${answered} of ${qs.length} answered` : section.mode === 'ready' ? `${answered} of ${qs.length} answered` : `${right} of ${qs.length} right first time`;

  return (
    <LessonSection id="quiz" icon="help" label={`${number} · ${section.mode === 'warmup' ? 'Warm-up · no marks' : 'Quick check · no marks, no timer'}`} title={section.title || topic.title} minor={section.mode !== 'check'} right={<Chip>{chip}</Chip>}>
      {section.intro && (
        <div style={{ marginBottom: 14 }}>
          <ReadAloud id={`intro-${section.quiz}`} parts={[{ text: section.intro }]} label="the instructions" />
        </div>
      )}
      <List>
        {qs.map((q, i) => (
          <QuestionCard key={q.id} q={q} n={i} section={section} topic={topic} onResult={(r) => record(q, r)} />
        ))}
      </List>

      {allDone && section.mode === 'warmup' && (
        <Feedback $tone="soft" role="status" style={{ marginTop: 18 }}>
          <p style={{ fontWeight: 700 }}>{section.done_text}</p>
          <p>Your answers are kept so you can compare them in the lecture-ready check at the end of Module 4.</p>
        </Feedback>
      )}
      {section.mode === 'ready' && report && (
        <ReadinessReport
          report={report}
          refresh={() =>
            api(`/api/learners/${learnerId()}/report`)
              .then(setReport)
              .catch(() => {})
          }
        />
      )}
      {section.ask && <LectureQuestionBox />}
    </LessonSection>
  );
}

/** Module quiz: answer every question, then Submit. The server checks each answer. */
function ModuleQuiz({ section, topic }) {
  const { act } = useTracker();
  const [choices, setChoices] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const qs = section.questions;
  const left = qs.filter((q) => choices[q.id] === undefined).length;

  const submit = async () => {
    if (left) {
      setError(`Answer ${left} more question${left === 1 ? '' : 's'} first.`);
      return;
    }
    setBusy(true);
    setError('');
    act('Practising', topic.concept || 'BFS');
    try {
      const out = {};
      for (const q of qs) {
        out[q.id] = await checkAnswer({ topic: topic.id, section: section.quiz, question: q.id, choice: choices[q.id] });
      }
      setResults(out);
    } catch {
      setError('Couldn’t reach the server to check your answers. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const score = results ? qs.filter((q) => results[q.id]?.right).length : 0;

  return (
    <LessonSection id="quiz" icon="help" label="Module quiz" title={section.title || 'Module quiz'} minor>
      <List>
        {qs.map((q, i) => {
          const r = results?.[q.id];
          return (
            <li key={q.id} className="card">
              <SketchChoice
                legend={`${i + 1}. ${q.q}`}
                legendVisible
                options={q.opts}
                value={choices[q.id] ?? null}
                disabled={!!results}
                answer={r ? (r.right ? choices[q.id] : -1) : undefined}
                onChange={(j) => setChoices((c) => ({ ...c, [q.id]: j }))}
              />
              {r && (
                <div role="status">
                  <Feedback $ok={r.right}>
                    <p style={{ fontWeight: 700 }}>{r.right ? 'Yes, that’s it.' : `Not yet. The answer is: ${r.answer}.`}</p>
                    {!r.right && <p>{r.feedback}</p>}
                  </Feedback>
                  {!r.right && <MisconceptionBox m={r.misconception} />}
                </div>
              )}
            </li>
          );
        })}
      </List>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 16 }}>
        {!results ? (
          <Button $variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Checking…' : 'Submit'}
          </Button>
        ) : (
          <Button
            onClick={() => {
              setResults(null);
              setChoices({});
            }}
          >
            <Icon name="refresh" size={18} />
            Try again
          </Button>
        )}
        <p role="status" style={{ fontWeight: 600 }}>
          {results ? `You got ${score} out of ${qs.length}.${score === qs.length ? ' Well done.' : ' Each “Not yet” says why.'}` : error}
        </p>
      </div>
    </LessonSection>
  );
}

function QuestionCard({ q, n, section, topic, onResult }) {
  const { act } = useTracker();
  const fieldId = useId();
  const [choice, setChoice] = useState(null);
  const [text, setText] = useState('');
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const warm = section.mode === 'warmup';
  const ready = section.mode === 'ready';

  const send = async (body) => {
    act('Practising', q.concept || topic.concept || 'BFS');
    setError('');
    try {
      const r = await checkAnswer({ topic: topic.id, section: section.quiz, question: q.id, ...body });
      setRes(r);
      onResult(r);
    } catch {
      setError('Couldn’t reach the server to check that. Try again.');
    }
  };

  const qText = `${ready ? q.id : n + 1}. ${q.q}`;

  return (
    <li className="card">
      {q.type === 'choice' && (
        <SketchChoice
          legend={qText}
          legendVisible
          options={q.opts}
          value={choice}
          answer={!res || warm ? undefined : res.right ? choice : -1}
          onChange={(i) => {
            setChoice(i);
            send({ choice: i });
          }}
        />
      )}

      {(q.type === 'text' || q.type === 'route') && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send({ text });
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <label htmlFor={fieldId} className="q">
            {qText}
          </label>
          <VoiceField id={fieldId} value={text} onChange={setText} placeholder="Type here" />
          <Button type="submit" $variant="primary" style={{ alignSelf: 'flex-start' }} disabled={!text.trim()}>
            Check
          </Button>
        </form>
      )}

      {q.type === 'explain' && (
        <>
          <p className="q">{qText}</p>
          <ExplainBox
            topic={topic.id}
            section={section.quiz}
            question={q.id}
            prompt={q.q}
            onRated={(r) => {
              setRes(r);
              onResult(r);
            }}
          />
        </>
      )}

      <div role="status" aria-live="polite">
        {error && <p>{error}</p>}
        {res && warm && res.after && (
          <Feedback $tone="soft">
            <p>{res.after}</p>
          </Feedback>
        )}
        {res && !warm && res.feedback && q.type !== 'explain' && (
          <Feedback $ok={res.right}>
            {res.right && !/^(Yes|Not yet)/.test(res.feedback) && <p style={{ fontWeight: 700 }}>Yes, that’s it.</p>}
            <p>{res.feedback}</p>
          </Feedback>
        )}
      </div>

      {!warm && res && res.right === false && <MisconceptionBox m={res.misconception} />}
      {!warm && !ready && res && !res.right && <HintLadder hints={q.hints} see={q.see} />}
    </li>
  );
}

/** Readiness report (end of Module 4): ipsative (you vs your warm-up), goal by goal, questions to bring. */
function ReadinessReport({ report, refresh }) {
  const [retrying, setRetrying] = useState(null);
  if (report.error) return <p role="alert">Couldn’t load your report. You can see it in My analysis.</p>;
  const tone = { Ready: 'ok', Review: 'warn', 'Not answered': 'none' };
  return (
    <Report aria-labelledby="report-h">
      <h3 id="report-h">
        <Icon name="trophy" /> Your readiness report
      </h3>
      <p className="big">{report.comparison}</p>
      <p className="small muted">This compares you with your own warm-up, not with anyone else.</p>
      <p className="small">
        <strong>{report.note}</strong>
      </p>
      <h4>Goal by goal</h4>
      <ul>
        {report.objectives.map((o) => (
          <li key={o.num}>
            <span>
              {o.num}. {o.text}
            </span>
            <span className="end">
              <Pill $tone={tone[o.status] || 'none'}>
                <Icon name={o.status === 'Ready' ? 'check' : 'refresh'} size={14} />
                {o.status}
              </Pill>
              {o.retried && <span className="small muted">after a retry</span>}
              {o.see && (
                <Link to={`/module/${o.see}`} className="small">
                  Revisit Module {o.see}
                </Link>
              )}
              {o.can_retry && retrying !== o.num && (
                <Button style={{ minHeight: 40 }} onClick={() => setRetrying(o.num)}>
                  <Icon name="refresh" size={16} />
                  Retry this objective
                </Button>
              )}
            </span>
            {retrying === o.num && (
              <div style={{ flexBasis: '100%' }}>
                <RetryObjective
                  objective={o.num}
                  onReady={() => {
                    refresh();
                  }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      <h4>Questions to bring to the lecture</h4>
      <ol>
        {report.questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      <ButtonLink as={Link} to="/analysis" $variant="primary" style={{ alignSelf: 'flex-start' }}>
        See My analysis <Icon name="arrow" size={18} />
      </ButtonLink>
    </Report>
  );
}

function LectureQuestionBox() {
  const questions = questionStore.use();
  const [ask, setAsk] = useState('');
  const [saved, setSaved] = useState(false);
  return (
    <div className="askbox" style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--edge)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label htmlFor="askq" style={{ fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Icon name="bulb" size={20} /> A question to bring to the lecture
      </label>
      <p className="small muted">Anything still fuzzy? Write it here. It’s saved to My analysis.</p>
      <form
        style={{ display: 'flex', gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!ask.trim()) return;
          addLectureQuestion(ask);
          setAsk('');
          setSaved(true);
        }}
      >
        <Field
          id="askq"
          value={ask}
          placeholder="Type here"
          onChange={(e) => {
            setAsk(e.target.value);
            setSaved(false);
          }}
        />
        <Button type="submit">
          <Icon name="plus" size={18} />
          Save
        </Button>
      </form>
      <p className="small" role="status">
        {saved ? `Saved. You have ${questions.length} question${questions.length === 1 ? '' : 's'} for the lecture.` : ''}
      </p>
    </div>
  );
}

const List = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
  .card { display: flex; flex-direction: column; gap: 10px; padding-top: 16px; border-top: 1px solid var(--edge); }
  .card:first-child { border-top: 0; padding-top: 0; }
  .q { font-weight: 700; font-size: 1.12rem; }
`;

const Report = styled.section`
  margin-top: 22px;
  padding: 18px;
  border-radius: 16px;
  border: 2px solid var(--mint);
  background: var(--mintbg);
  display: flex;
  flex-direction: column;
  gap: 10px;
  h3 { display: flex; gap: 8px; align-items: center; }
  h4 { font-size: 1rem; margin: 8px 0 0; }
  .big { font-size: 1.4rem; font-weight: 700; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; align-items: center; }
  .end { display: flex; gap: 10px; align-items: center; }
  ol { margin: 0; padding-left: 22px; }
  ol li { display: list-item; }
`;
