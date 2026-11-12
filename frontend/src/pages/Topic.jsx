import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../components/ui/Icon';
import ReadAloud from '../components/ui/ReadAloud';
import { ButtonLink, Panel, Pill, Tag } from '../components/ui/primitives';
import VideoSection from '../components/topic/VideoSection';
import { NotesSection, WordsSection, ExamplesSection, LinksSection } from '../components/topic/ReadSections';
import { CodeSection, CodeCompareSection } from '../components/topic/CodeSections';
import QueueGame from '../components/topic/QueueGame';
import QuizSection from '../components/topic/QuizSection';
import CodeLab from '../components/topic/CodeLab';
import { BareContext } from '../components/topic/LessonSection';
import { Exercises, Note, Part, QuickCheck, Stepper, TableBlock } from '../components/topic/ModuleParts';
import { usePage } from '../context/PageContext';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../context/SpeechContext';
import { TrackerProvider } from '../hooks/useStudyTracker';
import useApi from '../api/useApi';
import { markTopicDone, topicsStore } from '../data/stores';

/*
 * A module page: one page per module, numbered sections (01, 02 ...) with a
 * Learning guide, drawn from the content the Python server sends
 * (/api/topics/:id). Each section: explanation, then its blocks (animation,
 * table, code, quick check ...). Ends with Previous / Next module.
 */
export default function Topic() {
  const { id } = useParams();
  const { data: topic, loading, error } = useApi(`/api/topics/${encodeURIComponent(id)}`);
  usePage(topic ? `Module ${topic.id}: ${topic.title}` : 'Module', topic ? `Module ${topic.id}: ${topic.title}. ${topic.goal}` : '');

  if (error) {
    return (
      <Panel role="alert">
        <h1>Module not found</h1>
        <p className="muted">
          There’s no module {id}. <Link to="/course?tab=content">See all modules</Link>.
        </p>
      </Panel>
    );
  }
  if (loading || !topic) return <Panel role="status">Loading module {id}…</Panel>;
  return (
    <TrackerProvider key={topic.id}>
      <ModuleBody topic={topic} />
    </TrackerProvider>
  );
}

/** Splits the flat section list into numbered parts, each with the blocks that follow it. */
function groupParts(sections) {
  const out = [];
  sections.forEach((s, i) => {
    if (s.kind === 'part') out.push({ part: s, blocks: [] });
    else if (out.length) out.at(-1).blocks.push({ s, i });
  });
  return out;
}

function Block({ s, i, topic }) {
  const common = { section: s, topic, index: i, number: '' };
  switch (s.kind) {
    case 'video':
      return <VideoSection {...common} topicId={topic.id} />;
    case 'compare':
      return <TableBlock section={s} />;
    case 'quickcheck':
      return <QuickCheck section={s} />;
    case 'exercises':
      return <Exercises section={s} />;
    case 'note':
      return <Note section={s} />;
    case 'stepper':
      return <Stepper section={s} />;
    case 'code':
      return <CodeSection {...common} />;
    case 'codecompare':
      return <CodeCompareSection {...common} />;
    case 'codelab':
      return <CodeLab {...common} />;
    case 'queuegame':
      return <QueueGame {...common} />;
    case 'quiz':
      return <QuizSection {...common} onComplete={() => {}} />;
    case 'notes':
      return <NotesSection {...common} sid={`${topic.id}-${i}`} />;
    case 'words':
      return <WordsSection {...common} sid={`${topic.id}-${i}`} />;
    case 'examples':
      return <ExamplesSection {...common} />;
    case 'links':
      return <LinksSection {...common} />;
    default:
      return null;
  }
}

function ModuleBody({ topic }) {
  const { settings } = useSettings();
  const { speak } = useSpeech();
  const [params] = useSearchParams();
  const doneMap = topicsStore.use();
  const go = params.get('go');
  const groups = groupParts(topic.sections);
  const doneCount = groups.filter((g) => doneMap[`${topic.id}/${g.part.id}`]).length;

  // Settings > Read each section aloud automatically: read the goal when the page opens.
  useEffect(() => {
    if (!settings.autoRead) return undefined;
    const t = setTimeout(() => speak(`auto-${topic.id}-${go || 'goal'}`, topic.goal), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, settings.autoRead, topic.id]);

  return (
    <>
      <Header topic={topic} done={doneCount} total={groups.length} finished={!!doneMap[topic.id]} />
      <Layout>
        <div className="content">
          <BareContext.Provider value>
            {groups.map(({ part, blocks }) => (
              <Part key={part.id} moduleId={topic.id} part={part}>
                {blocks.map(({ s, i }) => (
                  <Block key={`${s.kind}-${i}`} s={s} i={i} topic={topic} />
                ))}
              </Part>
            ))}
          </BareContext.Provider>
          <Recap topic={topic} />
        </div>
        <Guide topic={topic} groups={groups} doneMap={doneMap} />
      </Layout>
    </>
  );
}

function Header({ topic, done, total, finished }) {
  return (
    <HeaderPanel aria-labelledby="topic-h">
      <nav aria-label="Breadcrumb" className="small muted">
        <Link to="/course?tab=content">Course</Link> › Module {topic.id}
      </nav>
      <Tag>
        Module {topic.id} of 4 · about {topic.minutes} minutes
      </Tag>
      <h1 id="topic-h">{topic.title}</h1>
      <ReadAloud id={`goal-${topic.id}`} parts={[{ text: topic.goal }]} label="the goal" />
      <div className="prog">
        <div
          className="track"
          role="progressbar"
          aria-label={`Module ${topic.id} progress`}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-valuetext={`${done} of ${total} sections done`}
        >
          <span style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <span className="small" aria-hidden="true">
          {done} of {total} sections done
        </span>
        {finished && (
          <Pill $tone="ok">
            <Icon name="check" size={14} />
            Finished
          </Pill>
        )}
      </div>
    </HeaderPanel>
  );
}

function Guide({ topic, groups, doneMap }) {
  return (
    <GuidePanel as="aside" aria-labelledby="guide-h">
      <h2 id="guide-h">Learning guide</h2>
      <ol>
        {groups.map(({ part }) => {
          const done = doneMap[`${topic.id}/${part.id}`];
          return (
            <li key={part.id}>
              <Link to={`/module/${topic.id}?go=${part.id}`}>
                <span className="n">{part.num}</span>
                <span className="t">{part.short}</span>
                {done && (
                  <span className="ok">
                    <Icon name="check" size={16} />
                    <span className="sr-only">, done</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </GuidePanel>
  );
}

function Recap({ topic }) {
  return (
    <RecapPanel aria-labelledby="recap-h">
      <h2 id="recap-h" style={{ fontSize: '1.18rem' }}>
        Recap
      </h2>
      <ReadAloud id={`recap-${topic.id}`} parts={[{ text: topic.recap }, { lead: 'Next:', text: topic.next }]} muted={[1]} label="the recap" />
      <nav className="row" aria-label="Modules">
        {topic.prev ? (
          <ButtonLink as={Link} to={`/module/${topic.prev}`}>
            <Icon name="back" size={18} />
            Module {topic.prev}
          </ButtonLink>
        ) : (
          <span />
        )}
        {topic.nextId ? (
          <ButtonLink as={Link} to={`/module/${topic.nextId}`} $variant="primary" onClick={() => markTopicDone(topic.id)}>
            Finish and go to Module {topic.nextId} <Icon name="arrow" size={18} />
          </ButtonLink>
        ) : (
          <ButtonLink as={Link} to="/quiz" $variant="primary" onClick={() => markTopicDone(topic.id)}>
            Finish the course and take the Full quiz <Icon name="arrow" size={18} />
          </ButtonLink>
        )}
      </nav>
    </RecapPanel>
  );
}

const Layout = styled.div`
  display: flex;
  flex-wrap: wrap-reverse;
  gap: 20px;
  align-items: flex-start;
  .content { flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
`;

const GuidePanel = styled(Panel)`
  flex: 1 1 240px;
  max-width: 100%;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  h2 { font-size: 1.1rem; padding: 0 10px 6px; }
  ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
  a { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 6px 10px; border-radius: 10px; color: var(--fg); text-decoration: none; font-size: 0.94rem; }
  a:hover { background: var(--soft); }
  .n { font-weight: 700; color: var(--mint); min-width: 24px; }
  .t { flex: 1; }
  .ok { color: var(--mint); display: inline-flex; }
`;

const HeaderPanel = styled(Panel)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 28px;
  .prog { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; max-width: 560px; }
  .track { flex: 1 1 200px; height: 8px; border-radius: 8px; background: var(--soft); overflow: hidden; }
  .track > span { display: block; height: 100%; background: var(--mint); }
`;

const RecapPanel = styled(Panel)`
  border-color: var(--mint);
  display: flex;
  flex-direction: column;
  gap: 14px;
  .flush { padding: 0; }
  .flush > div { display: flex; flex-direction: column; gap: 6px; }
  .row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; }
`;
