import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import { Button, Choices, Feedback, Field } from '../ui/primitives';
import { useSettings } from '../../context/SettingsContext';
import useSpeechInput from '../../hooks/useSpeechInput';
import { checkAnswer } from '../../api/learner';
import useApi, { post } from '../../api/useApi';
import { learnerId } from '../../api/client';
import SketchChoice from '../ui/SketchChoice';

/* Small pieces shared by quizzes, traces and explain sections. */

export const SELF_RATE = ['Got it', 'Partly', 'Not yet'];

/** A text box with an optional microphone (Settings > Answer with my voice). */
export function VoiceField({ id, value, onChange, placeholder, multiline = false, label }) {
  const { settings } = useSettings();
  const voice = useSpeechInput();
  const on = voice.listening === id;
  const append = (said) => onChange((value ? `${value} ` : '') + said);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Field as={multiline ? 'textarea' : 'input'} id={id} rows={multiline ? 3 : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        {settings.mic && (
          <Button
            $icon
            style={on ? { background: '#ff6b6b', color: '#fff', borderColor: '#ff6b6b' } : undefined}
            aria-pressed={on}
            aria-label={on ? 'Stop recording' : 'Answer by voice'}
            onClick={() => voice.toggle(id, append)}
          >
            <Icon name="mic" />
          </Button>
        )}
      </div>
      <p className="small muted" role="status">
        {voice.message}
      </p>
    </div>
  );
}

/** "Not yet" ladder: hint 1 → hint 2 → link back to the topic that teaches it. */
export function HintLadder({ hints = [], see, onLast, lastLabel }) {
  const [n, setN] = useState(0);
  if (!hints.length && !see && !onLast) return null;
  const atEnd = n >= hints.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {!atEnd && (
          <Button onClick={() => setN((x) => x + 1)}>
            <Icon name="bulb" size={18} />
            {n === 0 ? 'Show a hint' : 'Another hint'}
          </Button>
        )}
        {atEnd && onLast && (
          <Button onClick={onLast}>
            <Icon name="video" size={18} />
            {lastLabel}
          </Button>
        )}
        {atEnd && !onLast && see && (
          <Button as={Link} to={`/module/${see}`}>
            <Icon name="book" size={18} />
            Go back to Module {see}
          </Button>
        )}
      </div>
      {n > 0 && (
        <Feedback $tone="soft" role="status">
          {hints.slice(0, n).map((h, i) => (
            <p key={i}>
              Hint {i + 1}: {h}
            </p>
          ))}
        </Feedback>
      )}
    </div>
  );
}

/*
 * Explain it (type or say), then compare with a model answer and rate yourself.
 * The model answer comes from the server only after the student has tried.
 */
export function ExplainBox({ topic, section, question = '1', prompt, onRated }) {
  const fieldId = useId();
  const [text, setText] = useState('');
  const [model, setModel] = useState(null);
  const [rating, setRating] = useState(null);
  const [error, setError] = useState('');

  const reveal = async () => {
    setError('');
    try {
      const r = await checkAnswer({ topic, section, question, text });
      setModel(r.model);
    } catch {
      setError('Couldn’t reach the server. Try again.');
    }
  };
  const rate = async (i) => {
    setRating(i);
    try {
      const r = await checkAnswer({ topic, section, question, text, rating: i });
      onRated?.(r, i);
    } catch {
      setError('Couldn’t save your rating. Try again.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <VoiceField id={fieldId} value={text} onChange={setText} multiline placeholder="Type here" label={prompt} />
      {!model && (
        <Button style={{ alignSelf: 'flex-start' }} onClick={reveal}>
          <Icon name="eye" size={18} />
          Compare with a model answer
        </Button>
      )}
      {error && <p role="alert">{error}</p>}
      {model && (
        <Feedback $ok>
          <p style={{ fontWeight: 700 }}>Model answer</p>
          <p>{model}</p>
          <p style={{ marginTop: 8, fontWeight: 700 }}>How close was yours?</p>
          <Choices role="group" aria-label="How close was yours?">
            {SELF_RATE.map((l, i) => (
              <Button key={l} $on={rating === i} aria-pressed={rating === i} onClick={() => rate(i)}>
                {l}
              </Button>
            ))}
          </Choices>
          {rating !== null && rating > 0 && <p className="small">That’s a good one to ask about in the lecture.</p>}
        </Feedback>
      )}
    </div>
  );
}

/*
 * After a tagged wrong answer: what the mistake is, a link to where it's taught
 * (the "worked state"), and a parallel question for the same misconception.
 */
export function MisconceptionBox({ m }) {
  const [open, setOpen] = useState(false);
  if (!m) return null;
  return (
    <Feedback $tone="soft">
      <p>
        <strong>{m.title}.</strong> {m.explain}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        <Button as={Link} to={`/module/${m.topic}?go=${m.go}`}>
          <Icon name="book" size={18} />
          {m.label}
        </Button>
        {!open && (
          <Button $variant="primary" onClick={() => setOpen(true)}>
            <Icon name="refresh" size={18} />
            Try a similar one
          </Button>
        )}
      </div>
      {open && <SimilarQuestion tag={m.tag} />}
    </Feedback>
  );
}

/** A parallel question for one misconception tag, generated and checked by the server. */
export function SimilarQuestion({ tag }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 200000) + 1);
  const { data: q, error } = useApi(`/api/practice/similar?tag=${tag}&seed=${seed}`);
  const [choice, setChoice] = useState(null);
  const [res, setRes] = useState(null);

  const pick = async (i) => {
    if (res) return;
    setChoice(i);
    try {
      setRes(await post(`/api/learners/${learnerId()}/similar`, { tag, seed, choice: i }));
    } catch {
      setRes({ right: false, feedback: 'Couldn’t reach the server to check that. Try again.' });
    }
  };

  if (error) return <p role="alert">Couldn’t get a question from the server.</p>;
  if (!q) return <p role="status">Making a similar question…</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--edge2)' }}>
      <SketchChoice legend={q.q} legendVisible options={q.opts} value={choice} disabled={!!res} answer={res ? (res.right ? choice : -1) : undefined} onChange={pick} />
      {res && (
        <Feedback $ok={res.right} role="status">
          <p>{res.feedback}</p>
        </Feedback>
      )}
      {res && (
        <Button
          style={{ alignSelf: 'flex-start' }}
          onClick={() => {
            setSeed((s) => (s * 7 + 13) % 233279 || 1);
            setChoice(null);
            setRes(null);
          }}
        >
          Another similar one
        </Button>
      )}
    </div>
  );
}

/** "Retry this objective": a fresh question for an objective marked Review. Right → Ready. */
export function RetryObjective({ objective, onReady }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 200000) + 1);
  const { data: q, error } = useApi(`/api/learners/${learnerId()}/retry/${objective}?seed=${seed}`);
  const [choice, setChoice] = useState(null);
  const [res, setRes] = useState(null);

  const pick = async (i) => {
    if (res) return;
    setChoice(i);
    try {
      const r = await post(`/api/learners/${learnerId()}/retry/${objective}`, { seed, choice: i });
      setRes(r);
      if (r.ready) onReady?.();
    } catch {
      setRes({ right: false, feedback: 'Couldn’t reach the server to check that. Try again.' });
    }
  };

  if (error) return <p role="alert">Couldn’t get a question from the server.</p>;
  if (!q) return <p role="status">Making a question…</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 12, background: 'var(--soft)' }}>
      <SketchChoice legend={q.q} legendVisible options={q.opts} value={choice} disabled={!!res} answer={res ? (res.right ? choice : -1) : undefined} onChange={pick} />
      {res && (
        <Feedback $ok={res.right} role="status">
          <p>{res.feedback}</p>
          {res.right && <p style={{ fontWeight: 700 }}>This goal is now marked Ready.</p>}
        </Feedback>
      )}
      {res && !res.right && (
        <Button
          style={{ alignSelf: 'flex-start' }}
          onClick={() => {
            setSeed((s) => (s * 7 + 13) % 233279 || 1);
            setChoice(null);
            setRes(null);
          }}
        >
          Try another one
        </Button>
      )}
    </div>
  );
}
