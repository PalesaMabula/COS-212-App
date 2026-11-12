import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * Voice answers (Web Speech API SpeechRecognition, en-ZA).
 * Works in Chrome and Edge. Elsewhere it says so politely and the student types.
 *
 *   const voice = useSpeechInput();
 *   voice.toggle('q2', (said) => setAnswer((a) => (a ? a + ' ' : '') + said));
 *   voice.listening === 'q2'   // which field is recording
 *   voice.message              // status text for a role="status" element
 */
export default function useSpeechInput() {
  const [listening, setListening] = useState(null);
  const [message, setMessage] = useState('');
  const rec = useRef(null);
  const API = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

  const stop = useCallback(() => {
    try {
      rec.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(null);
  }, []);

  useEffect(() => stop, [stop]);

  const toggle = useCallback(
    (field, onText) => {
      if (listening === field) {
        stop();
        setMessage('Stopped listening.');
        return;
      }
      if (!API) {
        setMessage("Voice answers aren't available in this browser. You can type instead.");
        return;
      }
      stop();
      try {
        const r = new API();
        r.lang = 'en-ZA';
        r.interimResults = false;
        r.maxAlternatives = 1;
        r.onresult = (e) => {
          onText(e.results[0][0].transcript);
          setMessage('Got it. You can edit the text before checking.');
        };
        r.onerror = (e) =>
          setMessage(
            e.error === 'not-allowed'
              ? 'Microphone permission was blocked. You can type instead.'
              : e.error === 'no-speech'
                ? "I didn't hear anything. Try again, or type."
                : "The microphone isn't available. You can type instead."
          );
        r.onend = () => setListening(null);
        rec.current = r;
        r.start();
        setListening(field);
        setMessage('Listening… speak your answer.');
      } catch {
        setMessage('Unable to start the microphone. You can type instead.');
      }
    },
    [API, listening, stop]
  );

  return { listening, message, toggle, stop, supported: !!API };
}
