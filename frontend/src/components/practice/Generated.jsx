import { useId } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import SketchChoice from '../ui/SketchChoice';
import { Button, Feedback, Field, Pill } from '../ui/primitives';
import { MisconceptionBox } from '../topic/parts';

/*
 * Pieces shared by the Practice page and the Full quiz. Questions are made
 * and checked by the Python server (core/quizgen.py); the browser only has the
 * question text and the options, never the answer.
 */

/** A small graph drawn from its adjacency list (vertices on an ellipse), plus the list itself. */
export function GraphCard({ graph }) {
  const W = 340;
  const H = 230;
  const n = graph.vertices.length;
  const P = {};
  graph.vertices.forEach((v, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    P[v] = [Math.round(W / 2 + 130 * Math.cos(a)), Math.round(H / 2 + 82 * Math.sin(a))];
  });
  const edges = [];
  graph.vertices.forEach((a) => graph.adj[a].forEach((b) => a < b && edges.push([a, b])));
  return (
    <GraphWrap>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={graph.alt} className="g">
        {edges.map(([a, b]) => (
          <line key={`${a}${b}`} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} />
        ))}
        {graph.vertices.map((v) => (
          <g key={v}>
            <circle cx={P[v][0]} cy={P[v][1]} r="20" className={graph.adj[v].length ? '' : 'iso'} />
            <text x={P[v][0]} y={P[v][1] + 6} textAnchor="middle">
              {v}
            </text>
          </g>
        ))}
      </svg>
      <div className="list">
        <p className="small muted">Adjacency list (neighbours in alphabetical order)</p>
        <pre>{graph.listText}</pre>
      </div>
    </GraphWrap>
  );
}

const GraphWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
  .g { width: 340px; max-width: 100%; height: auto; background: #0b1220; border-radius: 16px; flex: none; }
  .g line { stroke: #7f93b3; stroke-width: 4; stroke-linecap: round; }
  .g circle { fill: #0f1b2e; stroke: #f5f4f0; stroke-width: 3; }
  .g circle.iso { stroke-dasharray: 6 4; opacity: 0.7; }
  .g text { fill: #f5f4f0; font-weight: 700; font-size: 17px; font-family: var(--font-body); }
  .list { flex: 1 1 220px; min-width: 0; }
  pre { margin: 6px 0 0; padding: 14px 16px; border-radius: 14px; background: var(--soft); border: 1px solid var(--edge); font-size: 0.92rem; white-space: pre-wrap; }
`;

/**
 * One generated question.
 *   value / onChange     the student's answer (option index, or text)
 *   result               the server's verdict once checked (or null)
 *   onCheck              shows a Check button (Practice); leave out for the Full quiz
 */
export function GenQuestion({ q, total, value, onChange, result, onCheck, busy }) {
  const id = useId();
  const checked = !!result;
  const blank = value === undefined || value === null || value === '';
  return (
    <Card>
      <div className="meta">
        <Pill $tone="lilac">
          {q.i + 1} of {total}
        </Pill>
        <span className="small muted">{q.kindLabel}</span>
      </div>
      {q.type === 'mcq' ? (
        <SketchChoice
          legend={q.prompt}
          legendVisible
          options={q.opts}
          value={value ?? null}
          disabled={checked}
          answer={checked ? (result.right ? value : -1) : undefined}
          onChange={onChange}
        />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (onCheck && !blank) onCheck();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <label htmlFor={id} className="q">
            {q.prompt}
          </label>
          <Field id={id} value={value || ''} placeholder="Type here" autoComplete="off" disabled={checked} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 420 }} />
        </form>
      )}
      {onCheck && !checked && (
        <Button $variant="primary" style={{ alignSelf: 'flex-start', minHeight: 40 }} disabled={blank || busy} onClick={onCheck}>
          Check
        </Button>
      )}
      {checked && (
        <div role="status">
          <Feedback $ok={result.right}>
            <p style={{ fontWeight: 700 }}>{result.right ? 'Yes, that’s it.' : result.blank ? `Not answered. The answer is: ${result.answer}.` : `Not yet. The answer is: ${result.answer}.`}</p>
            <p>{result.explain}</p>
            <p className="small">
              <Link to={`/module/${q.link.module}?go=${q.link.part}`}>
                <Icon name="arrow" size={14} /> Show me in the lesson: {q.link.label}
              </Link>
            </p>
          </Feedback>
          {!result.right && result.misconception && <MisconceptionBox m={result.misconception} />}
        </div>
      )}
    </Card>
  );
}

const Card = styled.li`
  list-style: none;
  border: 1px solid var(--edge);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--soft);
  .meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .q { font-weight: 700; font-size: 1.05rem; }
`;

export const QList = styled.ol`
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;
