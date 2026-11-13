import { useId, useState } from 'react';
import styled from 'styled-components';
import StartOver from '../components/ui/StartOver';
import Icon from '../components/ui/Icon';
import SliderSwitch from '../components/ui/SliderSwitch';
import { Button, Choices, Panel, Tag } from '../components/ui/primitives';
import { usePage } from '../context/PageContext';
import { useSettings } from '../context/SettingsContext';
import { api, learnerId } from '../api/client';
import { SYNCED_STORES } from '../data/stores';
import { textSizes, fontStacks, themes } from '../theme/tokens';

/*
 * Settings. Worded so nobody has to say why they use an option (L12, UDL):
 * "Use any of these, for any reason". Everything applies instantly and is saved.
 */
const CHOICES = {
  size: [
    [0, 'Small'],
    [1, 'Medium'],
    [2, 'Large'],
    [3, 'Extra large'],
  ],
  font: [
    ['work', 'Work Sans (default)'],
    ['lexend', 'Lexend (dyslexia-friendly)'],
    ['atkinson', 'Atkinson Hyperlegible (low vision)'],
  ],
  spacing: [
    ['normal', 'Normal'],
    ['wide', 'Wide'],
  ],
  theme: [
    ['dark', 'Dark'],
    ['light', 'Light'],
    ['contrast', 'High contrast'],
  ],
  speedA: [
    ['slow', 'Slow'],
    ['normal', 'Normal'],
    ['step', 'Only when I press Next'],
  ],
  rate: [
    [0.75, 'Slower'],
    [1, 'Normal'],
    [1.25, 'Faster'],
    [1.5, 'Fastest'],
  ],
  lang: [
    ['off', 'Off'],
    ['zu', 'isiZulu'],
    ['st', 'Sesotho'],
    ['af', 'Afrikaans'],
    ['tn', 'Setswana'],
  ],
};

export default function Settings() {
  const { settings, reset } = useSettings();
  const [cleared, setCleared] = useState('');
  usePage('Settings', 'Settings. Make it work for you. Use any of these, for any reason, and change them whenever you like. Nobody needs to explain why.');

  const clearAll = async () => {
    SYNCED_STORES.forEach((s) => s.reset());
    try {
      await api(`/api/learners/${learnerId()}`, { method: 'DELETE' });
      setCleared('All your progress, answers and tracked time have been cleared, here and on the server.');
    } catch {
      setCleared('Cleared in this browser. The server could not be reached.');
    }
  };

  return (
    <>
      <Panel style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 420px' }}>
          <Tag>Settings</Tag>
          <h1>Make it work for you</h1>
          <p className="muted">Use any of these, for any reason, and change them whenever you like. Nobody needs to explain why.</p>
        </div>
        <Button onClick={reset}>
          <Icon name="refresh" size={18} />
          Reset to default
        </Button>
      </Panel>

      <Layout>
        <div className="col">
          <Group icon="text" title="Reading">
            <Choice label="Text size" k="size" />
            <Choice label="Font" k="font" />
            <Choice label="Line and letter spacing" k="spacing" />
          </Group>

          <Group icon="eye" title="Seeing and motion">
            <Choice label="Colours" k="theme" />
            <Choice label="Animation speed" k="speedA" />
            <Toggle k="still" title="Reduce motion" text="Stops moving backgrounds and slides. Nothing ever flashes." />
            <Toggle k="solar" title="Solar system background" text="The planets behind the pages." />
          </Group>

          <Group icon="headphones" title="Listening and speaking">
            <Choice label="Reading voice speed" k="rate" />
            <Toggle k="autoRead" title="Read each section aloud automatically" text="Otherwise, press the speaker next to any paragraph." />
            <Toggle k="mic" title="Answer with my voice" text="Shows a microphone next to written answers (Chrome and Edge)." />
            <Toggle k="captions" title="Captions on every animation" text="The animations have no sound. Every one also has a full transcript." />
            <Toggle k="sound" title="Hear the ripple" text="A soft tone that rises with each hop. Off by default." />
          </Group>

          <Group icon="chart" title="Tracking and privacy">
            <Toggle k="trackOn" title="Track my study time" text="Counts time spent watching, listening, reading, trying, coding and practising." />
            <p className="small muted">
              Tracking powers My analysis. It’s saved with your anonymous guest copy of the course (no name, no login) and is never shared.
            </p>
            <StartOver style={{ alignSelf: 'flex-start' }} />
            <Button onClick={clearAll} style={{ alignSelf: 'flex-start' }}>
              <Icon name="x" size={18} />
              Clear all my progress and data
            </Button>
            <p className="small" role="status">
              {cleared}
            </p>
          </Group>

          <Group icon="book" title="Language">
            <Choice label="Also show key words in" k="lang" />
            <p className="small muted">Lessons stay in plain English. Translations will be checked by first-language speakers before release.</p>
          </Group>
        </div>

        <Preview settings={settings} />
      </Layout>
    </>
  );
}

function Choice({ label, k }) {
  const { settings, set } = useSettings();
  const id = useId();
  return (
    <div className="setting">
      <p id={id} className="name">
        {label}
      </p>
      <Choices role="group" aria-labelledby={id}>
        {CHOICES[k].map(([v, l]) => (
          <Button key={String(v)} $on={settings[k] === v} aria-pressed={settings[k] === v} onClick={() => set(k, v)} style={{ minHeight: 44 }}>
            {l}
          </Button>
        ))}
      </Choices>
    </div>
  );
}

function Toggle({ k, title, text }) {
  const { settings, set } = useSettings();
  const id = useId();
  return (
    <div className="toggle">
      <div>
        <p className="name">{title}</p>
        <p id={id} className="small muted">
          {text}
        </p>
      </div>
      <SliderSwitch checked={!!settings[k]} onChange={(v) => set(k, v)} label={title} describedBy={id} />
    </div>
  );
}

function Group({ icon, title, children }) {
  const id = useId();
  return (
    <Panel as="section" aria-labelledby={id} className="group">
      <h2 id={id} className="gh">
        <span className="ico">
          <Icon name={icon} />
        </span>
        {title}
      </h2>
      {children}
    </Panel>
  );
}

/** Live preview: shows the chosen text size, font, spacing and colours together. */
function Preview({ settings }) {
  const t = themes[settings.theme] || themes.dark;
  const cafe = 'B';
  const lab = 'C';
  return (
    <aside className="preview" aria-labelledby="prev-h">
      <Panel style={{ position: 'sticky', top: 16 }}>
        <h2 id="prev-h" style={{ fontSize: '1.18rem', marginBottom: 10 }}>
          Live preview
        </h2>
        <div
          style={{
            background: t.bg,
            color: t.fg,
            border: `2px solid ${t.edge2}`,
            borderRadius: 14,
            padding: 16,
            fontFamily: fontStacks[settings.font],
            fontSize: textSizes[settings.size],
            lineHeight: settings.spacing === 'wide' ? 2 : 1.6,
            letterSpacing: settings.spacing === 'wide' ? '0.05em' : 'normal',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ padding: '6px 14px', borderRadius: 10, fontWeight: 700, background: t.amberbg, color: t.amber, border: `3px solid ${t.amber}` }}>
              {cafe} · next
            </span>
            <span style={{ padding: '6px 14px', borderRadius: 10, fontWeight: 700, background: t.amberbg, color: t.amber, border: `2px dashed ${t.amber}` }}>
              {lab}
            </span>
          </div>
          <p>
            {cafe} joined the queue before {lab}, so {cafe} is served first.
          </p>
          <span style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 12, background: t.mint, color: t.ink, fontWeight: 700 }}>Continue</span>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          Changes apply to every page straight away.
        </p>
      </Panel>
    </aside>
  );
}

const Layout = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;

  .col {
    flex: 999 1 520px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .preview {
    flex: 1 1 300px;
    min-width: 0;
    align-self: stretch;
  }
  .group {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .gh {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.3rem;
  }
  .ico {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: var(--lilacbg);
    color: var(--lilac);
    flex: none;
  }
  .setting {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .name {
    font-weight: 700;
  }
  .toggle {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
  }
`;