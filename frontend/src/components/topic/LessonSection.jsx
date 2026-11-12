import { createContext, useContext, useId } from 'react';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import { Panel } from '../ui/primitives';

/*
 * Frame for each block of a lesson.
 * On a module page the block sits inside a numbered section that already has a
 * title, so it is drawn "bare": no panel and no icon/label line. A block keeps
 * a small heading only when its title adds something (e.g. "Run both and compare").
 */
export const BareContext = createContext(false);

export default function LessonSection({ id, icon, label, title, right, minor = false, children }) {
  const bare = useContext(BareContext);
  const hid = useId();
  if (bare) {
    const showTitle = title && !minor;
    return (
      <Bare aria-labelledby={showTitle ? hid : undefined} role={showTitle ? 'group' : undefined}>
        {(showTitle || right) && (
          <div className="bh">
            {showTitle ? <h3 id={hid}>{title}</h3> : <span />}
            {right}
          </div>
        )}
        {children}
      </Bare>
    );
  }
  return (
    <Panel id={id} aria-labelledby={`${id}-h`} style={{ scrollMarginTop: 16 }}>
      <Head>
        <div className="left">
          <span className="ico">
            <Icon name={icon} />
          </span>
          <div>
            <p className="small muted">{label}</p>
            <h2 id={`${id}-h`}>{title}</h2>
          </div>
        </div>
        {right}
      </Head>
      {children}
    </Panel>
  );
}

const Bare = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  .bh { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; }
  .bh h3 { font-size: 1.1rem; }
`;

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  .left { display: flex; gap: 12px; align-items: center; }
  .ico {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: var(--mintbg);
    color: var(--mint);
    flex: none;
  }
`;
