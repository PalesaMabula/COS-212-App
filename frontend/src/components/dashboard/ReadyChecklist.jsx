import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import { ButtonLink, Tag } from '../ui/primitives';
import useProgress from '../../hooks/useProgress';

/*
 * Lecture-ready checklist in the user's keys card (slow rotating border).
 * Ticks come from what the student actually did (progressStore). The tick is
 * an icon plus screen-reader text, never colour alone.
 */
export default function ReadyChecklist() {
  const { checklist, readyDone: done } = useProgress();

  return (
    <Card aria-labelledby="keys-h">
      <Tag>Before the lecture</Tag>
      <h3 id="keys-h">Lecture-ready checklist</h3>
      <p className="small muted">
        {done} of {checklist.length} done
      </p>
      <ul>
        {checklist.map((s) => {
          const ok = s.done;
          return (
            <li key={s.id}>
              <span className={`chk${ok ? '' : ' no'}`} aria-hidden="true">
                {ok && <Icon name="check" size={14} />}
              </span>
              <Link to={`/module/${s.topic}`} className="item">
                {s.text}
              </Link>
              <span className="sr-only">{ok ? ', done' : ', not done yet'}</span>
            </li>
          );
        })}
      </ul>
      <ButtonLink as={Link} to="/analysis" style={{ alignSelf: 'flex-start' }}>
        See my readiness <Icon name="arrow" size={18} />
      </ButtonLink>
    </Card>
  );
}

const Card = styled.section`
  position: relative;
  border-radius: 20px;
  padding: 20px;
  overflow: hidden;
  z-index: 0;
  color: var(--fg);
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::before {
    content: '';
    position: absolute;
    z-index: -2;
    inset: -50%;
    background: conic-gradient(from 0deg, var(--edge) 0 72%, var(--mint) 82%, var(--edge) 92%);
    animation: spin 12s linear infinite;
  }
  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    inset: 1px;
    border-radius: 19px;
    background-color: var(--bg);
    background-image: linear-gradient(var(--panel), var(--panel));
  }

  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  li { display: flex; gap: 10px; align-items: center; }
  .item { color: var(--fg); text-decoration: none; min-height: 32px; display: flex; align-items: center; }
  .item:hover { text-decoration: underline; }
  .chk {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    flex: none;
    background: var(--mint);
    color: var(--ink);
  }
  .chk.no { background: transparent; border: 2px solid var(--edge2); color: var(--muted); }
`;
