import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { Button, ButtonLink, Feedback, Panel, Pill, Tag } from '../components/ui/primitives';
import { Scroll } from '../components/topic/ModuleParts';
import { GenQuestion, GraphCard, QList } from '../components/practice/Generated';
import { usePage } from '../context/PageContext';
import { api, learnerId } from '../api/client';
import { post } from '../api/useApi';
import { TrackerProvider, useTracker } from '../hooks/useStudyTracker';

/*
 * The Full quiz: 15 new questions on one new graph (4 graphs, 6 BFS, 5 shortest
 * routes). No timer. Answer, change your mind, then Submit. The Python server
 * makes the quiz from a seed and marks it; past scores are kept for My analysis.
 */
export default function FullQuiz() {
  usePage('Full quiz', 'Full quiz. Fifteen new questions across modules 2 to 4, on one new graph. There is no timer.');
  return (
    <TrackerProvider key="quiz">
      <QuizBody />
    </TrackerProvider>
  );
}

function QuizBody() {
  const { act } = useTracker();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadHistory = () =>
    api(`/api/learners/${learnerId()}/quiz/history`)
      .then(setHistory)
      .catch(() => {});
  useEffect(() => {
    loadHistory();
  }, []);

  const start = async () => {
    setError('');
    try {
      setQuiz(await api('/api/quiz/full'));
      setAnswers({});
      setMarked(null);
      requestAnimationFrame(() => document.getElementById('fq-q')?.focus());
    } catch {
      setError('Couldn’t reach the server for a new quiz. Check that the app is running, then try again.');
    }
  };

  const qs = quiz?.questions || [];
  const answered = qs.filter((q) => answers[q.i] !== undefined && answers[q.i] !== '').length;

  const submit = async () => {
    setBusy(true);
    setError('');
    act('Practising');
    try {
      const body = { seed: quiz.seed, answers: qs.map((q) => (answers[q.i] === undefined || answers[q.i] === '' ? {} : q.type === 'mcq' ? { choice: answers[q.i] } : { text: answers[q.i] })) };
      const r = await post(`/api/learners/${learnerId()}/quiz/submit`, body);
      setMarked(r);
      loadHistory();
      requestAnimationFrame(() => document.getElementById('fq-score')?.focus());
    } catch {
      setError('Couldn’t reach the server to mark the quiz. Your answers are still here: try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 28 }}>
        <Tag>Full quiz · all modules</Tag>
        <h1>Test everything you’ve learned</h1>
        <p className="muted" style={{ maxWidth: '62ch' }}>
          15 questions on one new graph: 4 on graphs, 6 on BFS, 5 on shortest routes. There’s no timer. You can change any answer before you submit, and every new quiz has different questions and answers.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <Button $variant="primary" onClick={start}>
            <Icon name="play" size={18} />
            {quiz ? 'Start a new quiz' : 'Start the quiz'}
          </Button>
          <span className="small muted">{history.length ? `Earlier scores: ${history.map((h) => `${h.score}/${h.of}`).join(', ')}` : 'No attempts yet.'}</span>
        </div>
      </Panel>

      {error && (
        <Feedback role="alert">
          <p>{error}</p>
        </Feedback>
      )}

      {quiz && (
        <Panel aria-labelledby="fq-q" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 id="fq-q" tabIndex={-1}>
            Your quiz graph
          </h2>
          <GraphCard graph={quiz.graph} />

          {marked && (
            <Feedback $ok role="status" style={{ gap: 12 }}>
              <p id="fq-score" tabIndex={-1} style={{ fontWeight: 700, fontSize: '1.3rem' }}>
                {marked.score} out of {marked.of}
              </p>
              <Scroll>
                <table>
                  <caption className="sr-only">Results by module</caption>
                  <thead>
                    <tr>
                      <th scope="col">Module</th>
                      <th scope="col">Right</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marked.byModule.map((b) => (
                      <tr key={b.module}>
                        <th scope="row">{b.name}</th>
                        <td>
                          {b.right} of {b.of}
                        </td>
                        <td>
                          <Pill $tone={b.ready ? 'ok' : 'warn'}>{b.ready ? 'Ready' : 'Review'}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Button $variant="primary" onClick={start}>
                  Take a new quiz
                </Button>
                <ButtonLink as={Link} to="/practice">
                  Practise one module
                </ButtonLink>
              </div>
            </Feedback>
          )}

          <QList>
            {qs.map((q) => (
              <GenQuestion
                key={`${quiz.seed}-${q.i}`}
                q={q}
                total={qs.length}
                value={answers[q.i]}
                onChange={(v) => !marked && setAnswers((x) => ({ ...x, [q.i]: v }))}
                result={marked ? marked.results[q.i] : null}
              />
            ))}
          </QList>

          {!marked && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <Button $variant="primary" onClick={submit} disabled={busy}>
                {busy ? 'Marking…' : 'Submit quiz'}
              </Button>
              <p className="small muted" role="status">
                {answered} of {qs.length} answered.{answered < qs.length ? ' Unanswered questions count as not right yet.' : ''}
              </p>
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
