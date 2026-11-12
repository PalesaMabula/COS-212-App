import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../context/SpeechContext';
import { addStudyTime, MODES } from '../data/stores';

/*
 * Counts how a student spends time on a lesson, by way of learning:
 * Watching, Listening, Reading, Trying, Coding, Practising.
 *
 * Every second (only while the tab is visible and "Track my study time" is on):
 *   - video playing            -> Watching
 *   - read-aloud speaking      -> Listening
 *   - code running             -> Coding
 *   - else the last thing they did in the past 30 s (Trying, Coding, Practising)
 *   - else Reading, but only if they scrolled/typed/clicked in the past minute
 *     (so leaving the tab open doesn't count as study).
 * Time is saved to "cos212-track" every 10 s and when leaving the page.
 */
const TrackerContext = createContext(null);
const ZERO = Object.fromEntries(MODES.map((m) => [m, 0]));

export function TrackerProvider({ children }) {
  const { settings } = useSettings();
  const { speakingId } = useSpeech();
  const [session, setSession] = useState(ZERO);
  const signals = useRef({ video: false, code: false });
  const last = useRef({ mode: 'Reading', concept: 'BFS', at: 0 });
  const lastInput = useRef(Date.now());
  const pending = useRef({}); // unsaved seconds: { 'Mode|Concept': secs }
  const speaking = useRef(false);
  speaking.current = !!speakingId;

  const flush = useCallback(() => {
    Object.entries(pending.current).forEach(([k, secs]) => {
      const [mode, concept] = k.split('|');
      addStudyTime(mode, secs, concept);
    });
    pending.current = {};
  }, []);

  useEffect(() => {
    const touch = () => (lastInput.current = Date.now());
    const events = ['pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, touch));
  }, []);

  useEffect(() => {
    if (!settings.trackOn) return undefined;
    let ticks = 0;
    const id = setInterval(() => {
      if (document.hidden) return;
      const now = Date.now();
      let mode = null;
      let concept = 'BFS';
      if (signals.current.video) mode = 'Watching';
      else if (speaking.current) mode = 'Listening';
      else if (signals.current.code) {
        mode = 'Coding';
        concept = 'BFS in Python';
      } else if (now - last.current.at < 30000) {
        mode = last.current.mode;
        concept = last.current.concept;
      } else if (now - lastInput.current < 60000) mode = 'Reading';

      if (mode) {
        setSession((s) => ({ ...s, [mode]: s[mode] + 1 }));
        const k = `${mode}|${concept}`;
        pending.current[k] = (pending.current[k] || 0) + 1;
      }
      if (++ticks % 10 === 0) flush();
    }, 1000);
    return () => {
      clearInterval(id);
      flush();
    };
  }, [settings.trackOn, flush]);

  /** Call when the student does something: act('Trying', 'BFS') */
  const act = useCallback((mode, concept = 'BFS') => {
    last.current = { mode, concept, at: Date.now() };
  }, []);
  /** Tell the tracker the video or code tracer is running. */
  const signal = useCallback((name, on) => {
    signals.current[name] = on;
  }, []);

  const value = useMemo(() => ({ session, enabled: settings.trackOn, act, signal }), [session, settings.trackOn, act, signal]);

  return createElement(TrackerContext.Provider, { value }, children);
}

const OFF = { session: ZERO, enabled: false, act: () => {}, signal: () => {} };

export function useTracker() {
  return useContext(TrackerContext) || OFF;
}
