import { useState } from 'react';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import SectionTitle from '../ui/SectionTitle';
import { Button, Panel } from '../ui/primitives';
import useFocusTimer from '../../hooks/useFocusTimer';

const pad = (n) => String(n).padStart(2, '0');

/** Focus timer with the user's analogue clock face. */
export default function FocusTimer() {
  const [done, setDone] = useState('');
  const t = useFocusTimer(25, () => setDone('Session finished. Time for a short break.'));
  const mm = Math.floor(t.left / 60);
  const ss = t.left % 60;
  const minuteDeg = Math.round((t.elapsed / t.total) * 360);
  const secondDeg = (t.elapsed % 60) * 6;

  return (
    <Wrap aria-labelledby="focus-h">
      <SectionTitle id="focus-h" icon="clock">
        Focus timer
      </SectionTitle>
      <div className="row">
        <div className="face" role="img" aria-label={`Focus timer, ${mm} minutes ${ss} seconds left`}>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="tick" style={{ transform: `rotate(${i * 30}deg)` }} />
          ))}
          <span className="hand m" style={{ transform: `rotate(${minuteDeg}deg)` }} />
          <span className="hand s" style={{ transform: `rotate(${secondDeg}deg)` }} />
          <span className="hub" />
        </div>
        <div className="controls">
          <p className="time" aria-hidden="true">
            {pad(mm)}:{pad(ss)}
          </p>
          <div role="group" aria-label="Session length" className="lengths">
            {[15, 25, 45].map((n) => (
              <Button key={n} $on={t.minutes === n} aria-pressed={t.minutes === n} onClick={() => t.choose(n)}>
                {n} min
              </Button>
            ))}
          </div>
          <div className="lengths">
            <Button
              $variant="primary"
              onClick={() => {
                setDone('');
                t.toggle();
              }}
            >
              {t.label}
            </Button>
            <Button $icon aria-label="Reset timer" onClick={t.reset}>
              <Icon name="refresh" />
            </Button>
          </div>
        </div>
      </div>
      <p className="small muted" role="status">
        {done || 'Short, focused sessions with breaks help new ideas stick.'}
      </p>
    </Wrap>
  );
}

const Wrap = styled(Panel)`
  display: flex;
  flex-direction: column;
  gap: 14px;

  .row { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
  .controls { display: flex; flex-direction: column; gap: 8px; }
  .time { font-size: 1.65rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .lengths { display: flex; gap: 6px; flex-wrap: wrap; }

  .face {
    position: relative;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    outline: 6px solid #333;
    flex: none;
    background: repeating-radial-gradient(circle at 50% 50%, #c8c8c833 0, #c8c8c833 2%, transparent 2%, transparent 3%),
      conic-gradient(#fff 0%, silver 10%, #fff 35%, silver 45%, #fff 60%, silver 70%, #fff 80%, silver 95%, #fff 100%);
    box-shadow: inset 0 0 20px #0007;
  }
  .tick { position: absolute; left: 50%; top: 4px; margin-left: -1px; width: 2px; height: 8px; background: #333; transform-origin: 50% 51px; }
  .hand { position: absolute; left: 50%; bottom: 50%; transform-origin: 50% 100%; border-radius: 3px; }
  .hand.m { width: 4px; height: 38px; margin-left: -2px; background: #555; }
  .hand.s { width: 2px; height: 46px; margin-left: -1px; background: red; }
  .hub { position: absolute; left: 50%; top: 50%; width: 10px; height: 10px; margin: -5px; border-radius: 50%; background: red; border: 2px solid #eee; }
`;
