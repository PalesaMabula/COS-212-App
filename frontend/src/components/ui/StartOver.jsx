import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { Button } from './primitives';
import { api, learnerId } from '../../api/client';
import { progressStore, topicsStore } from '../../data/stores';

/* Start over: clears sections done, checklist, answers and quiz scores.
   Keeps the name, settings, plans and to-dos. Asks once, in place. */
export default function StartOver({ style }) {
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState('');
  const first = useRef(null);
  const navigate = useNavigate();

  const go = async () => {
    topicsStore.reset();
    progressStore.reset();
    try {
      await api(`/api/learners/${learnerId()}/start-over`, { method: 'POST' });
    } catch {
      /* offline: the browser copy is already reset */
    }
    setAsking(false);
    setMsg('The course has started again from Module 1.');
    navigate('/module/1');
  };

  if (asking) {
    return (
      <div role="group" aria-label="Start the course over?" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', ...style }}>
        <p className="small" style={{ flexBasis: '100%' }}>
          Start again from Module 1? Your progress, answers and quiz scores will be cleared. Your name and settings stay.
        </p>
        <Button ref={first} $variant="primary" onClick={go}>Yes, start over</Button>
        <Button onClick={() => setAsking(false)}>Cancel</Button>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <Button
        onClick={() => {
          setMsg('');
          setAsking(true);
          requestAnimationFrame(() => first.current?.focus());
        }}
      >
        <Icon name="refresh" size={18} />
        Start over
      </Button>
      <p className="small" role="status">{msg}</p>
    </div>
  );
}