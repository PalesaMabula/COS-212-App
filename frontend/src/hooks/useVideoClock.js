import { useEffect, useRef, useState } from 'react';

/*
 * Playback clock for the code-drawn videos.
 *   duration      total seconds
 *   chapterLen    seconds per chapter
 *   stepMode      Settings > Animation speed > "Only when I press Next":
 *                 playback stops at the end of every chapter.
 *   initialSpeed  0.75 when Settings > Animation speed is "Slow"
 */
export const SPEEDS = [0.75, 1, 1.25];

export default function useVideoClock({ duration, chapterLen, stepMode = false, initialSpeed = 1 }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  const stopAt = useRef(duration);

  useEffect(() => setSpeed(initialSpeed), [initialSpeed]);

  useEffect(() => {
    if (!playing) return undefined;
    let prev = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = ((now - prev) / 1000) * speed;
      prev = now;
      setT((x) => {
        const next = x + dt;
        if (next >= stopAt.current) {
          setPlaying(false);
          return stopAt.current;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, speed]);

  const chapter = Math.min(Math.floor(Math.min(t, duration - 0.001) / chapterLen), Math.ceil(duration / chapterLen) - 1);
  const progress = (Math.min(t, duration - 0.001) - chapter * chapterLen) / chapterLen;

  const playFrom = (from) => {
    const start = from >= duration ? 0 : from;
    const ch = Math.floor(start / chapterLen);
    stopAt.current = stepMode ? Math.min(duration, (ch + 1) * chapterLen) : duration;
    setT(start);
    setStarted(true);
    setPlaying(true);
  };

  return {
    t,
    playing,
    started,
    speed,
    chapter,
    progress,
    ended: t >= duration,
    play: () => playFrom(t),
    pause: () => setPlaying(false),
    toggle: () => (playing ? setPlaying(false) : playFrom(t)),
    restart: () => playFrom(0),
    seekChapter: (i) => playFrom(i * chapterLen),
    cycleSpeed: () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]),
  };
}
