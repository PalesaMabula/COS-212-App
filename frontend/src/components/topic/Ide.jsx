import styled from 'styled-components';
import Icon from '../ui/Icon';

/*
 * The purple IDE window (user's component). Shows Python with simple syntax
 * colours, an optional highlighted line, a button bar and a terminal.
 *   <Ide file="bfs.py" lines={[...]} current={8} buttons={...} terminal="..." />
 */
const TOKENS = /("[^"]*"|'[^']*')|(#.*$)|\b(from|import|def|while|for|in|if|not|return|is|None|break|lambda)\b|\b(print|deque|popleft|append|add|len|sum|max|list|bfs|bfs_path|add_edge)\b|([{}[\]()])|(=)/g;

export function tokenize(line) {
  const segs = [];
  let last = 0;
  let m;
  TOKENS.lastIndex = 0;
  while ((m = TOKENS.exec(line))) {
    if (m.index > last) segs.push({ t: line.slice(last, m.index), c: '' });
    segs.push({ t: m[0], c: m[1] ? 'st' : m[2] ? 'cm' : m[3] ? 'kw' : m[4] ? 'fn' : m[5] ? 'pn' : 'op' });
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push({ t: line.slice(last), c: '' });
  if (!segs.length) segs.push({ t: ' ', c: '' });
  return segs;
}

export default function Ide({ file, lines, current, buttons, terminal, terminalLabel, label, bad = false }) {
  return (
    <Window $bad={bad}>
      <div className="titlebar">
        <span className="name">
          <Icon name="terminal" size={16} />
          {file} · Python 3
        </span>
        <span className="wbtns" aria-hidden="true">
          <span>
            <svg viewBox="0 0 10.2 1">
              <rect x="0" y="0" width="10.2" height="1" />
            </svg>
          </span>
          <span>
            <svg viewBox="0 0 10 10">
              <path d="M0,0v10h10V0H0z M9,9H1V1h8V9z" />
            </svg>
          </span>
          <span>
            <svg viewBox="0 0 10 10">
              <polygon points="10.2,0.7 9.5,0 5.1,4.4 0.7,0 0,0.7 4.4,5.1 0,9.5 0.7,10.2 5.1,5.8 9.5,10.2 10.2,9.5 5.8,5.1" />
            </svg>
          </span>
        </span>
      </div>
      <pre tabIndex={0} aria-label={label || `Python code: ${file}`}>
        <code>
          {lines.map((line, n) => (
            <span key={n} className={`ln${current === n + 1 ? ' on' : ''}`} aria-current={current === n + 1 ? 'step' : undefined}>
              <span className="lno" aria-hidden="true">
                {n + 1}
              </span>
              {tokenize(line).map((s, k) => (
                <span key={k} className={s.c}>
                  {s.t}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>
      {buttons && <div className="bar">{buttons}</div>}
      {terminal !== undefined && (
        <div className="term" role="log" aria-label={terminalLabel || 'Output'}>
          {terminal}
        </div>
      )}
    </Window>
  );
}

/** Button styled for the IDE bar. */
export const IdeButton = styled.button.attrs({ type: 'button' })`
  min-height: 44px;
  padding: 6px 14px;
  border-radius: 10px;
  border: 1px solid #c042ff;
  background: #2e0043;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Work Sans', sans-serif;
  font-size: 15px;
  font-weight: 600;
  &:hover { background: #c042ff55; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Window = styled.div`
  min-width: 0;
  background: #15001f;
  border: 1px solid ${({ $bad }) => ($bad ? '#ff8a8a' : '#c042ff')};
  border-radius: 14px;
  overflow: hidden;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 14px;
  letter-spacing: normal;
  word-spacing: normal;
  color: #bafff8;

  .titlebar { display: flex; align-items: center; justify-content: space-between; background: #2e0043; padding-left: 14px; font-family: 'Work Sans', sans-serif; font-size: 14px; color: #f3e3ff; }
  .name { display: flex; align-items: center; gap: 8px; }
  .wbtns { display: flex; }
  .wbtns span { width: 44px; height: 36px; display: grid; place-items: center; }
  .wbtns svg { width: 10px; height: 10px; fill: #fff; }

  pre { margin: 0; padding: 12px 0; overflow-x: auto; line-height: 1.5; }
  pre:focus-visible { outline-offset: -3px; }
  .ln { display: block; white-space: pre; padding: 0 14px; border-left: 4px solid transparent; min-height: 1.5em; }
  .ln.on { background: #c042ff33; border-left-color: #c042ff; }
  .lno { display: inline-block; width: 2.2em; color: #a98bbd; user-select: none; }
  .kw { color: #ff6b9d; } .st { color: #22ff00; } .fn { color: #6fa0ff; } .pn { color: #ffae00; } .op { color: #ffff00; } .cm { color: #a98bbd; font-style: italic; }

  .bar { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 14px; background: #1f0030; border-top: 1px solid #c042ff44; align-items: center; }
  .bar label { display: flex; align-items: center; gap: 6px; color: #f3e3ff; font-family: 'Work Sans', sans-serif; font-size: 15px; }
  .bar select { min-height: 44px; border-radius: 8px; background: #2e0043; color: #fff; border: 1px solid #c042ff; padding: 4px 8px; }
  .term { background: #0b0010; border-top: 1px solid #c042ff66; padding: 10px 14px; color: #22ff00; min-height: 56px; white-space: pre-wrap; }
  .term .who { color: #c9a8ff; font-size: 12px; }
`;
