import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import SectionTitle from '../ui/SectionTitle';
import { ButtonLink, Panel } from '../ui/primitives';
import useProgress, { topicPath } from '../../hooks/useProgress';

/** Section stepper for the module the student is in (up to 4 sections from the next one), with an amber line joining the steps. */
export default function TopicStepper() {
  const { currentModule: m, next } = useProgress();
  const at = Math.max(0, m.topics.findIndex((t) => t.id === next?.id));
  const from = Math.min(at, Math.max(0, m.topics.length - 4));
  const shown = m.topics.slice(from, from + 4);
  const more = m.topics.length - shown.length;

  return (
    <Wrap aria-labelledby="mod-h">
      <SectionTitle
        id="mod-h"
        as="h2"
        sub={`Module ${m.num}`}
        right={
          <div className="prog">
            <div
              className="track"
              role="progressbar"
              aria-label={`Module ${m.num} progress`}
              aria-valuemin={0}
              aria-valuemax={m.total}
              aria-valuenow={m.count}
              aria-valuetext={`${m.count} of ${m.total} sections done`}
            >
              <span style={{ width: `${(m.count / m.total) * 100}%` }} />
            </div>
            <strong aria-hidden="true">
              {m.count} / {m.total}
            </strong>
          </div>
        }
      >
        {m.title}
      </SectionTitle>

      <ol className="steps">
        {shown.map((t) => {
          const current = next?.id === t.id;
          return (
            <li key={t.id} className="step" aria-current={current ? 'step' : undefined}>
              <span className={`box${current ? ' cur' : ''}`} aria-hidden="true">
                <span className="n">{t.num}</span>
                {t.done && (
                  <span className="done">
                    <Icon name="check" size={12} />
                  </span>
                )}
              </span>
              <div className="text">
                <div style={{ flex: '1 1 200px' }}>
                  <Link to={topicPath(t.id)} className="name">
                    <span className="sr-only">{t.num} </span>
                    {t.title}
                  </Link>
                  <p className="small muted">{t.done ? 'Done' : current ? 'Up next' : 'Not started'}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {more > 0 && (
        <p className="small muted" style={{ margin: '4px 0 8px' }}>
          {more} more section{more === 1 ? '' : 's'} in this module.
        </p>
      )}
      <ButtonLink as={Link} to={next ? topicPath(next.id) : `/module/${m.num}`} $variant="primary" style={{ marginTop: 8 }}>
        Open Module {m.num}: {m.title} <Icon name="arrow" size={18} />
      </ButtonLink>
    </Wrap>
  );
}

const Wrap = styled(Panel)`

  .prog { flex: 0 1 240px; display: flex; align-items: center; gap: 10px; }
  .track { flex: 1; height: 10px; border-radius: 10px; background: var(--soft); overflow: hidden; }
  .track > span { display: block; height: 100%; background: var(--mint); border-radius: 10px; }

  .steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .step { display: flex; gap: 16px; align-items: flex-start; padding: 10px 0; position: relative; }
  .step:not(:last-child)::before { content: ''; position: absolute; left: 23px; top: 58px; bottom: -10px; width: 2px; background: var(--amber); }
  .box { width: 48px; height: 48px; border-radius: 12px; border: 2px solid var(--fg); display: grid; place-items: center; position: relative; flex: none; background: var(--panel); }
  .box.cur { background: var(--fg); color: var(--bg); }
  .box .n { font-weight: 700; font-family: var(--font-head); }
  .done { position: absolute; bottom: -8px; left: 12px; width: 22px; height: 22px; border-radius: 50%; background: var(--amber); color: #1a1205; display: grid; place-items: center; border: 2px solid var(--bg); }
  .text { flex: 1; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; }
  .name { font-weight: 700; color: var(--fg); text-decoration: none; }
  .name:hover { text-decoration: underline; }
`;
