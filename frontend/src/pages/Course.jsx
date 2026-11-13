import { useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../components/ui/Icon';
import ReadAloud, { useReadAloud } from '../components/ui/ReadAloud';
import StartOver from '../components/ui/StartOver';
import GlowLink from '../components/ui/GlowLink';
import { Chip, Panel, Pill, Tag } from '../components/ui/primitives';
import ModuleCard from '../components/dashboard/ModuleCard';
import VideoSection, { CHAPTER_SECONDS } from '../components/topic/VideoSection';
import { usePage } from '../context/PageContext';
import { useCourse } from '../context/CourseContext';
import { useSettings } from '../context/SettingsContext';
import useProgress, { topicPath } from '../hooks/useProgress';
import useVideoClock from '../hooks/useVideoClock';
import useApi from '../api/useApi';

/*
 * Course overview: Overview (intro video, about, ways to learn, modules),
 * Course content (all 16 topics), Objectives (CS2023 Bloom levels and where
 * each is practised and checked: constructive alignment) and Glossary.
 * Everything here comes from the course content on the server.
 */
const TABS = [
  ['overview', 'Overview'],
  ['content', 'Course content'],
  ['objectives', 'Objectives'],
  ['glossary', 'Glossary'],
];

export default function Course() {
  const course = useCourse();
  const p = useProgress();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'overview';
  const tabRefs = useRef({});
  usePage('Course overview', `${course.title}. ${course.tagline} ${course.about.join(' ')}`);

  const choose = (id, focus = false) => {
    setParams(id === 'overview' ? {} : { tab: id }, { replace: true });
    if (focus) requestAnimationFrame(() => tabRefs.current[id]?.focus());
  };
  const onKey = (e) => {
    const i = TABS.findIndex(([id]) => id === tab);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    choose(TABS[(to + TABS.length) % TABS.length][0], true);
  };

  return (
    <>
      <Hero>
        <div className="intro">
          <Tag>Pre-lecture course · self-paced</Tag>
          <h1>{course.title}</h1>
          <ReadAloud id="tagline" parts={[{ text: course.tagline }]} muted={[0]} />
          <div className="facts">
            {course.facts.map((f) => (
              <Chip key={f}>{f}</Chip>
            ))}
          </div>
        </div>
        <div className="actions">
          <GlowLink to={p.next ? topicPath(p.next.id) : '/quiz'}>
            <Icon name="play" />
            {p.next ? (p.doneCount ? `Continue with Module ${p.next.module}` : 'Start course') : 'Take the Full quiz'}
          </GlowLink>
          {p.doneCount > 0 && <StartOver />}
        </div>
      </Hero>

      <Tabs role="tablist" aria-label="Course information" onKeyDown={onKey}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            ref={(el) => (tabRefs.current[id] = el)}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => choose(id)}
          >
            {label}
          </button>
        ))}
      </Tabs>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {tab === 'overview' && <Overview course={course} modules={p.modules} />}
        {tab === 'content' && <Content modules={p.modules} next={p.next} />}
        {tab === 'objectives' && <Objectives course={course} />}
        {tab === 'glossary' && <Glossary course={course} />}
      </div>
    </>
  );
}

function Overview({ course, modules }) {
  const { settings } = useSettings();
  const { data: intro } = useApi('/api/topics/1');
  const video = intro?.sections.find((s) => s.kind === 'video');
  const clock = useVideoClock({
    duration: (video?.chapters.length || 6) * CHAPTER_SECONDS,
    chapterLen: CHAPTER_SECONDS,
    stepMode: settings.speedA === 'step',
    initialSpeed: settings.speedA === 'slow' ? 0.75 : 1,
  });
  return (
    <>
      {video && <VideoSection section={{ ...video, title: 'The question this course answers' }} clock={clock} number="Module 1" topicId="1" />}
      <About course={course} />
      <Panel as="section" aria-labelledby="ways-h" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 id="ways-h">Learn it your way</h2>
        <Ways>
          {course.ways.map((w) => (
            <div key={w.title} className="way">
              <span className="ico">
                <Icon name={w.icon} />
              </span>
              <div>
                <p style={{ fontWeight: 700 }}>{w.title}</p>
                <p className="small muted">{w.text}</p>
              </div>
            </div>
          ))}
        </Ways>
      </Panel>
      <Panel as="section" aria-labelledby="mods-h">
        <h2 id="mods-h" style={{ marginBottom: 12 }}>
          Modules
        </h2>
        <ModGrid>
          {modules.map((m) => (
            <li key={m.num}>
              <ModuleCard module={m} />
            </li>
          ))}
        </ModGrid>
      </Panel>
    </>
  );
}

/** About this course: one speaker beside the heading reads the whole section. */
function About({ course }) {
  const parts = [...course.about.map((text) => ({ text })), { lead: 'Course goal:', text: course.goal }];
  const ra = useReadAloud('about', parts, { label: 'About this course' });
  return (
    <Panel as="section" aria-labelledby="about-h" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 id="about-h">About this course</h2>
        {ra.button}
      </div>
      {parts.map((_, i) => ra.part(i))}
    </Panel>
  );
}

function Content({ modules, next }) {
  return modules.map((m) => (
    <Panel as="section" key={m.num} aria-labelledby={`m${m.num}-h`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
        <h2 id={`m${m.num}-h`}>
          <Link to={`/module/${m.num}`} style={{ color: 'inherit' }}>
            Module {m.num} · {m.title}
          </Link>
        </h2>
        <span className="small muted">
          {m.count} of {m.total} sections done · about {m.minutes} min
        </span>
      </div>
      <p className="muted" style={{ margin: '6px 0 10px' }}>
        {m.summary}
      </p>
      <TopicList>
        {m.topics.map((t) => (
          <li key={t.id}>
            <Link to={topicPath(t.id)} className="topic">
              <span className="ico">
                <span style={{ fontWeight: 700 }}>{t.num}</span>
              </span>
              <span className="main">
                <strong>
                  {t.num} {t.title}
                </strong>
              </span>
              {t.done ? (
                <Pill $tone="ok">
                  <Icon name="check" size={14} />
                  Done
                </Pill>
              ) : next?.id === t.id ? (
                <Pill $tone="warn">Up next</Pill>
              ) : null}
            </Link>
          </li>
        ))}
      </TopicList>
    </Panel>
  ));
}

function Objectives({ course }) {
  return (
    <Panel as="section" aria-labelledby="obj-h">
      <h2 id="obj-h">What you’ll be able to do</h2>
      <p className="muted" style={{ margin: '6px 0 12px' }}>
        Each objective is tagged with its CS2023 level, and shows where you practise it and where it’s checked.
      </p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {course.objectives.map((o) => (
          <Obj key={o.num}>
            <span className="num">{o.num}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700 }}>{o.text}</p>
              <p className="small muted">
                Practised in {o.practised} · Checked in {o.checked}
              </p>
            </div>
            <Pill $tone={o.level === 'Evaluate' ? 'lilac' : o.level === 'Apply' ? 'ok' : 'warn'}>{o.level}</Pill>
          </Obj>
        ))}
      </ol>
    </Panel>
  );
}

function Glossary({ course }) {
  const parts = course.glossary.map((g) => ({ lead: `${g.term}:`, text: g.meaning }));
  const ra = useReadAloud('glossary', parts, { label: 'the glossary' });
  return (
    <Panel as="section" aria-labelledby="gl-h">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h2 id="gl-h">Glossary</h2>
        {ra.button}
      </div>
      <Gloss>
        {course.glossary.map((g, i) => (
          <div key={g.term} className="term">
            {ra.part(i)}
            <Link to={topicPath(g.topic)} className="small">
              See {g.term} in Module {g.topic}
            </Link>
          </div>
        ))}
      </Gloss>
    </Panel>
  );
}

const Hero = styled(Panel)`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: space-between;
  align-items: flex-end;
  .intro { flex: 999 1 420px; display: flex; flex-direction: column; gap: 10px; }
  .flush { padding: 0; }
  .facts { display: flex; flex-wrap: wrap; gap: 8px; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; }
`;

const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  button {
    min-height: 44px;
    padding: 8px 18px;
    border-radius: 12px;
    border: 1px solid var(--edge2);
    background: var(--soft);
    font-weight: 600;
    cursor: pointer;
  }
  button[aria-selected='true'] { background: var(--mint); color: var(--ink); border-color: var(--mint); }
`;

const Ways = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: 12px;
  .way { display: flex; gap: 10px; padding: 12px; border-radius: 14px; background: var(--soft); }
  .ico { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--mintbg); color: var(--mint); flex: none; }
`;

const ModGrid = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: 12px;
  li { display: flex; }
  li > a { flex: 1; }
`;

const TopicList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  .topic { display: flex; gap: 12px; align-items: center; padding: 10px 12px; min-height: 56px; border-radius: 12px; color: var(--fg); text-decoration: none; border: 1px solid transparent; }
  .topic:hover { background: var(--soft); border-color: var(--edge2); }
  .ico { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--soft); flex: none; }
  .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
`;

const Obj = styled.li`
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 12px;
  border-radius: 14px;
  background: var(--soft);
  flex-wrap: wrap;
  .num { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--mint); color: var(--ink); font-weight: 700; flex: none; }
`;

const Gloss = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 12px;
  .term { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 14px; background: var(--soft); }
  dl { margin: 0; }
  dt { font-weight: 700; }
  dd { margin: 0; }
`;