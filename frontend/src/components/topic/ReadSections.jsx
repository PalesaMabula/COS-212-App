import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import { useReadAloud } from '../ui/ReadAloud';
import { Button, Choices, Pill } from '../ui/primitives';
import LessonSection from './LessonSection';
import { useSettings } from '../../context/SettingsContext';

const RATES = [
  [0.75, 'Slower'],
  [1, 'Normal'],
  [1.25, 'Faster'],
];

/** Notes: one idea per paragraph, one speaker for the whole block (the word being read is highlighted). */
export function NotesSection({ section, number, sid }) {
  const { settings, set } = useSettings();
  const parts = useMemo(() => section.paragraphs.map((text) => ({ text })), [section.paragraphs]);
  const ra = useReadAloud(`${sid}-notes`, parts, { label: 'the notes' });

  return (
    <LessonSection
      id="listen"
      icon="headphones"
      label={`${number} · Notes · read or listen`}
      title={section.title || 'Notes'}
      right={
        <Choices>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            {ra.button}
            {ra.speaking ? 'Stop' : 'Listen to all notes'}
          </span>
          <Choices role="group" aria-label="Voice speed">
            {RATES.map(([v, l]) => (
              <Button key={v} $on={settings.rate === v} aria-pressed={settings.rate === v} onClick={() => set('rate', v)}>
                {l}
              </Button>
            ))}
          </Choices>
        </Choices>
      }
    >
      <p className="small muted" style={{ marginBottom: 8 }}>
        Press the speaker to hear the notes. The word being read turns green. Press it again to stop.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{parts.map((_, i) => ra.part(i))}</div>
    </LessonSection>
  );
}

const LANGS = { zu: 'isiZulu', st: 'Sesotho', af: 'Afrikaans', tn: 'Setswana' };

/** New words as cards, one speaker for all of them. Settings > Language adds a (to be checked) key word line. */
export function WordsSection({ section, sid }) {
  const { settings } = useSettings();
  const lang = LANGS[settings.lang];
  const parts = useMemo(() => section.items.map((w) => ({ lead: `${w.term}:`, text: w.meaning })), [section.items]);
  const ra = useReadAloud(`${sid}-words`, parts, { label: 'the new words' });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {ra.button}
        <p style={{ color: 'var(--mint)', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>New words</p>
      </div>
      <Words aria-label="New words">
        {section.items.map((w, i) => (
          <div key={w.term} className="word">
            {ra.part(i)}
            {lang && <p className="small muted">{lang}: [term to be checked by a first-language speaker]</p>}
          </div>
        ))}
      </Words>
    </div>
  );
}

/** Worked examples: think first, then reveal the answer and the reason. */
export function ExamplesSection({ section, number }) {
  const [open, setOpen] = useState({});
  return (
    <LessonSection id="examples" icon="bulb" label={`${number} · Worked examples`} title="Think, then check">
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {section.items.map((x, i) => (
          <Example key={i}>
            <p style={{ fontWeight: 700 }}>{x.q}</p>
            {open[i] ? (
              <p role="status">
                <Pill $tone="ok">
                  <Icon name="check" size={14} />
                  {x.a}
                </Pill>{' '}
                {x.why}
              </p>
            ) : (
              <Button style={{ alignSelf: 'flex-start' }} aria-expanded={false} onClick={() => setOpen((o) => ({ ...o, [i]: true }))}>
                <Icon name="eye" size={18} />
                Show the answer
              </Button>
            )}
          </Example>
        ))}
      </ol>
    </LessonSection>
  );
}

export function LinksSection({ section }) {
  return (
    <Choices>
      {section.items.map((l) => (
        <Button key={l.to} as={Link} to={l.to} style={{ minHeight: 44 }}>
          <Icon name={l.icon} size={18} />
          {l.label}
        </Button>
      ))}
    </Choices>
  );
}

/** Two queue strips side by side, e.g. "mark on joining" vs "mark on serving" (3.3). */
export function CompareSection({ section, number }) {
  return (
    <LessonSection id="compare" icon="layers" label={`${number} · Side by side`} title={section.title}>
      <Scroll>
        <table>
          <caption className="sr-only">Queue after each place is served, two ways of marking</caption>
          <thead>
            <tr>
              {section.headers.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map(([label, good, bad]) => {
              const dup = bad.filter((x, i) => bad.indexOf(x) !== i);
              return (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>
                    <span className="q">{good.map((p) => <span key={p} className="chip">{p}</span>)}</span>
                  </td>
                  <td>
                    <span className="q">
                      {bad.map((p, i) => (
                        <span key={`${p}${i}`} className={`chip${dup.includes(p) ? ' dup' : ''}`}>
                          {p}
                          {dup.includes(p) && <span className="sr-only"> (in the queue twice)</span>}
                        </span>
                      ))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Scroll>
      <p className="small muted" style={{ marginTop: 8 }}>
        Places marked <strong>twice</strong> have a red dashed border: the Gym joins the queue twice when marking waits until serving.
      </p>
    </LessonSection>
  );
}

const Words = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 14px;
  .word { border: 1px solid var(--mint); background: var(--mintbg); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
`;

const Example = styled.li`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--edge);
  &:first-child { border-top: 0; }
`;

const Scroll = styled.div`
  overflow-x: auto;
  table { border-collapse: collapse; width: 100%; min-width: 480px; }
  th, td { text-align: left; padding: 10px; border-bottom: 1px solid var(--edge); vertical-align: middle; }
  thead th { font-size: 0.88rem; color: var(--muted); }
  .q { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.88rem; background: var(--amberbg); color: var(--amber); border: 2px dashed var(--amber); }
  .chip.dup { border-color: #ff8a8a; color: #ff8a8a; background: #3a1414; }
  :root[data-theme='light'] & .chip.dup { color: #a11; background: #fde2e2; border-color: #a11; }
`;
