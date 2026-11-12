import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from './SettingsContext';

/*
 * Read-aloud for the whole app (Web Speech API, speechSynthesis, en-ZA).
 * Only one thing speaks at a time. Each speaker button passes an id; pressing
 * the same button again stops it (toggle). If the browser has no speech
 * support, a polite message is announced instead and the text stays on screen.
 */
const SpeechContext = createContext(null);

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return (
    voices.find((v) => v.lang === 'en-ZA') ||
    voices.find((v) => v.lang?.startsWith('en-GB')) ||
    voices.find((v) => v.lang?.startsWith('en')) ||
    null
  );
}

export function SpeechProvider({ children }) {
  const { settings } = useSettings();
  const [speakingId, setSpeakingId] = useState(null);
  const [message, setMessage] = useState('');
  const currentId = useRef(null);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';

  const stop = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    currentId.current = null;
    setSpeakingId(null);
  }, []);

  /**
   * speak(id, text, onDone?, onWord?)
   * onWord(charIndex) is called as each word starts (where the browser and voice
   * report word boundaries), so the screen can highlight the word being read.
   */
  const speak = useCallback(
    (id, text, onDone, onWord) => {
      if (!supported) {
        setMessage("Read-aloud isn't available in this browser. The text is on screen.");
        return;
      }
      const wasThis = currentId.current === id;
      stop();
      if (wasThis) return; // second press = stop
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-ZA';
        u.rate = settings.rate || 1;
        const v = pickVoice();
        if (v) u.voice = v;
        if (onWord) {
          u.onboundary = (e) => {
            if (currentId.current === id && (e.name === 'word' || e.name === undefined)) onWord(e.charIndex);
          };
        }
        u.onend = () => {
          if (currentId.current === id) {
            currentId.current = null;
            setSpeakingId(null);
            onDone?.();
          }
        };
        u.onerror = () => {
          if (currentId.current === id) {
            currentId.current = null;
            setSpeakingId(null);
          }
        };
        currentId.current = id;
        setSpeakingId(id);
        setMessage('');
        window.speechSynthesis.speak(u);
      } catch {
        setMessage("Read-aloud isn't available here.");
      }
    },
    [supported, settings.rate, stop]
  );

  // Stop talking when the tab closes.
  useEffect(() => stop, [stop]);

  const value = useMemo(
    () => ({ speak, stop, speakingId, isSpeaking: (id) => speakingId === id, message, setMessage, supported }),
    [speak, stop, speakingId, message, supported]
  );
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech() {
  const ctx = useContext(SpeechContext);
  if (!ctx) throw new Error('useSpeech must be used inside <SpeechProvider>');
  return ctx;
}
