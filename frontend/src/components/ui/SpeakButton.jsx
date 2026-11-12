import styled from 'styled-components';
import Icon from './Icon';
import { useSpeech } from '../../context/SpeechContext';

/**
 * Round speaker toggle used next to paragraphs. Press to hear `text`, press
 * again to stop. `id` must be unique on the page.
 */
/** Short, unique name for a speaker button: "Read aloud: Breadth-first search, or BFS…" */
export const speakLabel = (text) => {
  const words = String(text).split(/\s+/).slice(0, 6).join(' ');
  return `Read aloud: ${words}${String(text).split(/\s+/).length > 6 ? '…' : ''}`;
};

/** Round speaker toggle. Give onToggle/on to control it from outside (ReadAloud does). */
export default function SpeakButton({ id, text, label, onDone, onToggle, on: onProp }) {
  const { speak, isSpeaking } = useSpeech();
  const on = onProp ?? isSpeaking(id);
  const name = label || speakLabel(text);
  return (
    <Round
      type="button"
      $on={on}
      aria-pressed={on}
      aria-label={on ? `Stop reading: ${name.replace(/^Read aloud: /, '')}` : name}
      onClick={onToggle || (() => speak(id, text, onDone))}
    >
      <Icon name={on ? 'mute' : 'speaker'} />
    </Round>
  );
}

const Round = styled.button`
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${({ $on }) => ($on ? 'var(--mint)' : 'var(--edge2)')};
  background: ${({ $on }) => ($on ? 'var(--mint)' : 'var(--soft)')};
  color: ${({ $on }) => ($on ? 'var(--ink)' : 'var(--mint)')};
  cursor: pointer;
  display: grid;
  place-items: center;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px solid var(--mint);
    opacity: 0;
    ${({ $on }) => $on && 'animation: ping 1.4s infinite; opacity: 1;'}
  }
`;
