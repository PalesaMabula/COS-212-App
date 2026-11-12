import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import SpeakButton from './SpeakButton';
import { useSpeech } from '../../context/SpeechContext';

/*
 * One speaker for a whole block. Reads every part in order and highlights the
 * word being read (green and underlined, so it isn't colour alone). Where the
 * browser or voice doesn't report word positions, the whole part being read is
 * highlighted instead. Press the speaker again to stop.
 *
 *   const ra = useReadAloud('about', [{ text: '…' }, { lead: 'Course goal:', text: '…' }]);
 *   {ra.button}  ...  {ra.part(0)}  {ra.part(1)}
 *
 * or the simple form:  <ReadAloud id="goal" parts={[{ lead: 'Goal:', text }]} />
 */
const WORD = /\S+/g;

function splitWords(full) {
  const out = [];
  let m;
  WORD.lastIndex = 0;
  while ((m = WORD.exec(full))) out.push({ w: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

/*
 * Light markup in course text: **bold**, *italic* and `code`.
 * Returns the plain text (what is spoken) and the style of each character.
 */
export function parseMarks(text) {
  let plain = '';
  const style = [];
  let b = false;
  let it = false;
  let code = false;
  for (let i = 0; i < text.length; i++) {
    if (!code && text.startsWith('**', i)) {
      b = !b;
      i++;
      continue;
    }
    if (text[i] === '`') {
      code = !code;
      continue;
    }
    if (!code && text[i] === '*' && text[i + 1] !== ' ') {
      it = !it;
      continue;
    }
    if (!code && text[i] === '*' && it) {
      it = false;
      continue;
    }
    plain += text[i];
    style.push({ b, i: it, c: code });
  }
  return { plain, style };
}

function withMarks(word, st) {
  if (!st) return word;
  let out = word;
  if (st.c) out = <code className="inl">{out}</code>;
  if (st.i) out = <em>{out}</em>;
  if (st.b) out = <strong>{out}</strong>;
  return out;
}

export function useReadAloud(id, parts, { label, prefix } = {}) {
  const { speak, stop, isSpeaking } = useSpeech();
  const [pos, setPos] = useState(null); // { part, word } or { part, word: null } (no word events)
  const active = useRef(false);
  const items = useMemo(
    () =>
      parts.map((p) => {
        const { plain, style } = parseMarks(p.text);
        const full = p.lead ? `${p.lead} ${plain}` : plain;
        const shift = p.lead ? p.lead.length + 1 : 0;
        const words = splitWords(full).map((w) => ({ ...w, st: w.start >= shift ? style[w.start - shift] : null }));
        return { ...p, full, words, leadWords: p.lead ? splitWords(p.lead).length : 0 };
      }),
    [parts]
  );
  const speaking = isSpeaking(id);

  const play = useCallback(
    (i) => {
      if (!active.current || i >= items.length) {
        active.current = false;
        setPos(null);
        return;
      }
      setPos({ part: i, word: null });
      const said = i === 0 && prefix ? `${prefix} ${items[i].full}` : items[i].full;
      const shift = i === 0 && prefix ? prefix.length + 1 : 0;
      speak(
        id,
        said,
        () => play(i + 1),
        (charIndex) => {
          const c = charIndex - shift;
          const w = items[i].words.findIndex((x) => c >= x.start && c < x.end + 1);
          if (w >= 0) setPos({ part: i, word: w });
        }
      );
    },
    [id, items, prefix, speak]
  );

  const toggle = () => {
    if (active.current || speaking) {
      active.current = false;
      setPos(null);
      stop();
      return;
    }
    active.current = true;
    play(0);
  };

  // Stop highlighting if something else starts speaking.
  useEffect(() => {
    if (!speaking && pos && !active.current) setPos(null);
  }, [speaking, pos]);
  useEffect(
    () => () => {
      if (active.current) stop();
    },
    [stop]
  );

  const allText = items.map((p) => p.full).join(' ');
  const button = <SpeakButton id={id} text={allText} label={label ? `Read aloud: ${label}` : undefined} onToggle={toggle} on={active.current || speaking} />;

  const part = (i, { as: Tag = 'p', className, style } = {}) => {
    const it = items[i];
    const on = pos && pos.part === i;
    return (
      <Tag key={i} className={`${className || ''}${on && pos.word === null ? ' ra-part-on' : ''}`} style={style}>
        {it.words.map((w, k) => {
          const word = (
            <span className={on && pos.word === k ? 'ra-on' : undefined} aria-current={on && pos.word === k ? 'true' : undefined}>
              {w.w}
            </span>
          );
          return (
            <Fragment key={k}>
              {k > 0 && ' '}
              {k < it.leadWords ? <strong>{word}</strong> : withMarks(word, w.st)}
            </Fragment>
          );
        })}
      </Tag>
    );
  };

  return { button, part, speaking: active.current || speaking };
}

/** Simple form: one speaker beside a block of paragraphs. */
export default function ReadAloud({ id, parts, label, prefix, className, muted = [] }) {
  const ra = useReadAloud(id, parts, { label, prefix });
  return (
    <Block className={className}>
      {ra.button}
      <div className="parts">{parts.map((_, i) => ra.part(i, { className: muted.includes(i) ? 'muted' : undefined }))}</div>
    </Block>
  );
}

export const Block = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  .parts { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
`;
