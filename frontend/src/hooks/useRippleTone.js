import { useCallback, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';

/*
 * Settings > "Hear the ripple": a soft tone that rises with each hop from the
 * start. Off by default. Uses the Web Audio API; silent if unavailable.
 */
export default function useRippleTone() {
  const { settings } = useSettings();
  const ctx = useRef(null);

  return useCallback(
    (hop) => {
      if (!settings.sound) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx.current = ctx.current || new AC();
        const ac = ctx.current;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = 330 * Math.pow(2, (hop * 4) / 12); // up a major third per hop
        gain.gain.setValueAtTime(0.0001, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.5);
        osc.connect(gain).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.55);
      } catch {
        /* no audio: ignore */
      }
    },
    [settings.sound]
  );
}
