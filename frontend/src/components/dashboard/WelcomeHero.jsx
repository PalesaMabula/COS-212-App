import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import GlowLink from '../ui/GlowLink';
import ReadAloud from '../ui/ReadAloud';
import { ButtonLink, Panel, Tag } from '../ui/primitives';
import ModuleCard from './ModuleCard';
import useProgress, { topicPath } from '../../hooks/useProgress';
import { profileStore } from '../../data/stores';

/** Headline follows the real lecture-ready progress instead of a fixed claim. */
export function heroHeading(done, total, name = '') {
  const hi = name ? `, ${name}` : '';
  if (done === 0) return `Welcome${hi}. Let's get you lecture-ready.`;
  if (done === total) return `Welcome back${hi}. You're lecture-ready.`;
  if (done * 2 >= total) return `Welcome back${hi}. You're past halfway: ${done} of ${total} ready steps done.`;
  return `Welcome back${hi}. ${done} of ${total} lecture-ready steps done.`;
}

export function heroText(next, doneCount, total) {
  if (!next) return `You've worked through all ${total} sections. Try the Full quiz, or check My analysis for your readiness report.`;
  return `${doneCount} of ${total} sections done. Next up is Module ${next.module}, section ${next.num}: ${next.title}.`;
}

export default function WelcomeHero() {
  const p = useProgress();
  const { name } = profileStore.use();
  const heading = heroHeading(p.readyDone, p.checklist.length, name);
  const text = heroText(p.next, p.doneCount, p.topics.length);

  return (
    <Hero aria-labelledby="hero-h">
      <div className="intro">
        <Tag>Pre-lecture course · Graphs and BFS</Tag>
        <h1 id="hero-h">{heading}</h1>
        <ReadAloud id="hero" parts={[{ text }]} prefix={heading} muted={[0]} label="the welcome" />
        <div className="actions">
          <GlowLink to={p.next ? topicPath(p.next.id) : '/quiz'}>
            <Icon name="play" />
            {p.next ? (p.doneCount ? `Continue Module ${p.next.module}: ${p.next.short}` : 'Start with Module 1') : 'Take the Full quiz'}
          </GlowLink>
          <ButtonLink as={Link} to="/course">
            <Icon name="book" size={18} />
            Course overview
          </ButtonLink>
        </div>
      </div>
      <ul className="mods" aria-label="Modules">
        {p.modules.map((m) => (
          <li key={m.num}>
            <ModuleCard module={m} />
          </li>
        ))}
      </ul>
    </Hero>
  );
}

const Hero = styled(Panel)`
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  align-items: stretch;

  .intro {
    flex: 999 1 360px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    justify-content: center;
  }
  .flush { padding: 0; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .mods {
    flex: 1 1 520px;
    min-width: 0;
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .mods > li { display: flex; }
  .mods > li > a { flex: 1; }
`;
