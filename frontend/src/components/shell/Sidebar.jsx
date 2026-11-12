import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import { Button, Panel } from '../ui/primitives';
import { NAV } from '../../data/shell';
import useProgress from '../../hooks/useProgress';
import { useCourse } from '../../context/CourseContext';

const SHORT = { 3: 'BFS' };
import { initials, profileStore, setName } from '../../data/stores';

// Which sidebar item is "current".
function activeKey(pathname, search) {
  const go = new URLSearchParams(search).get('go');
  if (pathname.startsWith('/module/')) return 'lesson';
  if (pathname === '/') return go === 'plan' ? 'cal' : 'dash';
  return NAV.find((n) => n.to === pathname)?.key;
}

export function BrandMark({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <line x1="9" y1="20" x2="30" y2="9" stroke="var(--mint)" strokeWidth="3" />
      <line x1="9" y1="20" x2="30" y2="31" stroke="var(--mint)" strokeWidth="3" />
      <circle cx="9" cy="20" r="6" fill="var(--mint)" />
      <circle cx="30" cy="9" r="6" fill="var(--bg)" stroke="var(--amber)" strokeWidth="3" />
      <circle cx="30" cy="31" r="6" fill="var(--bg)" stroke="var(--amber)" strokeWidth="3" />
    </svg>
  );
}

/** The learner card: click your name to change it. Saved with your progress (no login). */
function Me({ doneCount, total }) {
  const { name } = profileStore.use();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const field = useRef(null);
  const btn = useRef(null);

  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);

  const save = (e) => {
    e.preventDefault();
    setName(draft);
    setEditing(false);
    requestAnimationFrame(() => btn.current?.focus());
  };

  return (
    <div className="me">
      <span className="avatar" aria-hidden="true">
        {initials(name)}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        {editing ? (
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="learner-name" className="small">
              Your name (optional)
            </label>
            <input
              id="learner-name"
              ref={field}
              className="namefield"
              value={draft}
              maxLength={40}
              autoComplete="given-name"
              placeholder="Type here"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditing(false);
                  requestAnimationFrame(() => btn.current?.focus());
                }
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <Button type="submit" $variant="primary" style={{ minHeight: 40, padding: '4px 12px' }}>
                Save
              </Button>
              <Button
                style={{ minHeight: 40, padding: '4px 12px' }}
                onClick={() => {
                  setEditing(false);
                  requestAnimationFrame(() => btn.current?.focus());
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <button
            ref={btn}
            type="button"
            className="namebtn"
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
          >
            <span>{name || 'Learner'}</span>
            <Icon name="pen" size={14} />
            <span className="sr-only">, change your name</span>
          </button>
        )}
        <p className="small muted">
          Guest · {doneCount} of {total} sections done
        </p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { pathname, search } = useLocation();
  const current = activeKey(pathname, search);
  const { next, doneCount, topics } = useProgress();
  const course = useCourse();
  const modNow = pathname.startsWith('/module/') ? pathname.split('/')[2] : null;
  // On phones the menu folds away behind a button (CSS only applies this under 760px).
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname, search]);

  return (
    <Side aria-label="Main menu" data-open={open}>
      <Panel as="div" className="stack">
        <div className="brandrow">
          <Link to="/" className="brand">
            <BrandMark />
            <div>
              <b>COS212</b>
              <div className="small muted">
                <span className="sr-only"> </span>Data Structures<span className="sr-only">, Dashboard</span>
              </div>
            </div>
          </Link>
          <Button className="menubtn" aria-expanded={open} aria-controls="side-more" onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'x' : 'list'} size={18} />
            Menu
          </Button>
        </div>
        <div id="side-more" className="more">
          <Me doneCount={doneCount} total={topics.length} />

          <nav className="nav" aria-label="Pages">
            {NAV.map((n) => (
              <Fragment key={n.key}>
                <Link to={n.to ?? `/module/${next?.module || 4}`} aria-current={current === n.key && !(n.key === 'lesson' && modNow) ? 'page' : undefined}>
                  <span className="navico">
                    <Icon name={n.icon} size={18} />
                  </span>
                  {n.label}
                </Link>
                {n.key === 'lesson' && (
                  <ul className="subnav" aria-label="Modules">
                    {course.topics.map((t) => (
                      <li key={t.id}>
                        <Link to={`/module/${t.id}`} aria-current={modNow === t.id ? 'page' : undefined}>
                          Module {t.id} · {SHORT[t.id] || t.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Fragment>
            ))}
          </nav>
        </div>
      </Panel>

      <div className="promo">
        <span className="trophy">
          <Icon name="trophy" size={26} />
        </span>
        <h3>Lecture-ready check</h3>
        <p className="small">6 questions at the end of Module 4. Get your readiness report and compare with your warm-up.</p>
        <Link className="go" to="/module/4?go=s08">
          Take the check <Icon name="arrow" size={18} />
        </Link>
      </div>
    </Side>
  );
}

const Side = styled.aside`
  flex: 1 1 230px;
  max-width: 270px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;

  .stack,
  .more {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .brandrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .menubtn {
    display: none;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 6px 10px;
    color: var(--fg);
    text-decoration: none;
    border-radius: 12px;
  }
  .brand b {
    font-family: var(--font-head);
    font-size: 1.3rem;
  }

  .me {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 14px;
    background: var(--soft);
  }
  .namebtn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 2px 6px;
    margin-left: -6px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    font-weight: 700;
    cursor: pointer;
    max-width: 100%;
  }
  .namebtn span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .namebtn:hover { border-color: var(--edge2); }
  .namefield { width: 100%; min-height: 40px; padding: 6px 10px; border-radius: 10px; border: 1px solid var(--edge2); background: var(--panel); }
  .avatar {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 0.88rem;
    background: linear-gradient(135deg, #c9b6ff, #8debc5);
    color: #0e0e10;
    flex: none;
  }

  .nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .nav a {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 46px;
    padding: 8px 12px;
    border-radius: 12px;
    color: var(--fg);
    text-decoration: none;
    font-weight: 500;
    border: 1px solid transparent;
  }
  .subnav { list-style: none; margin: 0 0 4px; padding: 0; display: flex; flex-direction: column; gap: 2px; }
  .nav .subnav a { min-height: 40px; padding: 6px 12px 6px 56px; font-size: 0.9rem; font-weight: 500; }
  .nav a:hover {
    background: var(--soft);
  }
  .nav a[aria-current='page'] {
    background: var(--mintbg);
    border-color: var(--mint);
    color: var(--mint);
    font-weight: 700;
  }
  .navico {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background: var(--soft);
    flex: none;
  }
  .nav a[aria-current='page'] .navico {
    background: var(--mint);
    color: var(--ink);
  }

  /* Amber "Lecture-ready check" card */
  .promo {
    background: linear-gradient(140deg, #f9cb80, #f5a35c);
    color: #1a1205;
    border-radius: 20px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  :root[data-theme='contrast'] & .promo {
    background: #000;
    color: #fff;
    border: 2px solid var(--amber);
  }
  .promo h3 {
    font-size: 1.3rem;
  }
  .trophy {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #1a1205;
    color: #f9cb80;
  }
  .promo .go {
    min-height: 44px;
    padding: 8px 16px;
    border-radius: 12px;
    background: #fff8ec;
    color: #1a1205;
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .promo .go:hover {
    background: #fff;
  }
  .promo .go:focus-visible {
    outline-color: #1a1205;
  }

  @media (max-width: 760px) {
    max-width: none;
    .stack {
      padding: 12px 14px;
    }
    .brand {
      padding: 0;
    }
    .menubtn {
      display: inline-flex;
    }
    &[data-open='false'] .more,
    &[data-open='false'] .promo {
      display: none;
    }
  }
`;
