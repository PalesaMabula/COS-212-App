import { useEffect, useRef, useState } from 'react';

/*
 * Focus timer (Pomodoro-style). The student starts it themselves; nothing in
 * the app ever times a question. Uses the real clock, so it stays accurate
 * even if the browser slows down background tabs.
 */
export default function useFocusTimer(initialMinutes = 25, onFinish) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [left, setLeft] = useState(initialMinutes * 60);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);
  const finish = useRef(onFinish);
  finish.current = onFinish;

  useEffect(() => {
    if (!running) return undefined;
    endAt.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const secs = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(secs);
      if (secs === 0) {
        setRunning(false);
        finish.current?.();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const total = minutes * 60;
  return {
    minutes,
    left,
    running,
    elapsed: total - left,
    total,
    label: running ? 'Pause' : left > 0 && left < total ? 'Resume' : 'Start',
    toggle: () => {
      if (!running && left === 0) setLeft(total);
      setRunning((r) => !r);
    },
    reset: () => {
      setRunning(false);
      setLeft(total);
    },
    choose: (m) => {
      setRunning(false);
      setMinutes(m);
      setLeft(m * 60);
    },
  };
}
