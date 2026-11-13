import { useCallback, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import { Button, Chip } from '../ui/primitives';
import ThemeSwitch from './ThemeSwitch';
import useDismiss from '../../hooks/useDismiss';
import { useSpeech } from '../../context/SpeechContext';
import { usePageText } from '../../context/PageContext';
import { load, save } from '../../hooks/storage';
import { NOTIFICATIONS, SEARCH_PAGES } from '../../data/shell';
import { useCourse } from '../../context/CourseContext';
import { useServerStatus } from '../../api/client';
import { profileStore, setLecture } from '../../data/stores';

/* ---------- Python server status ---------- */
function ServerStatus() {
  const status = useServerStatus();
  const text = {
    checking: 'Connecting…',
    online: 'Saved',
    offline: 'Saving in this browser',
  }[status];
  const help = {
    checking: 'Checking for the Python server.',
    online: 'The Python server is running. Your progress is saved there and in this browser.',
    offline: 'The Python server is not running. Your progress is saved in this browser and will be sent when the server is back.',
  }[status];
  return (
    <Chip role="status" title={help} aria-label={help} className="server">
      <span className={`dot ${status}`} aria-hidden="true" />
      {text}
    </Chip>
  );
}

/* ---------- Search (combobox with a results list) ---------- */
function Search() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef(null);
  const navigate = useNavigate();
  const listId = useId();

  const course = useCourse();
  const SEARCH_TOPICS = [
    ...course.topics.map((t) => ({ t: `Module ${t.id}: ${t.title}`, to: `/module/${t.id}` })),
    ...course.topics.flatMap((t) => t.parts.map((p) => ({ t: `Module ${t.id} · ${p.num} ${p.title}`, to: `/module/${t.id}?go=${p.id}` }))),
    ...course.glossary.map((g) => ({ t: `Word: ${g.term}`, to: `/module/${g.topic}` })),
    ...SEARCH_PAGES,
  ];
  const term = q.trim().toLowerCase();
  const results = term ? SEARCH_TOPICS.filter((t) => t.t.toLowerCase().includes(term)).slice(0, 6) : [];
  const show = open && !!term;

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);
  useDismiss(wrap, show, close);

  const go = (r) => {
    navigate(r.to);
    setQ('');
    close();
  };

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[Math.max(active, 0)]);
    }
  };

  return (
    <SearchWrap ref={wrap} role="search">
      <Icon name="search" className="lead" />
      <label className="sr-only" htmlFor="site-search">
        Search the course
      </label>
      <input
        id="site-search"
        type="search"
        placeholder="Search modules"
        autoComplete="off"
        value={q}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {show && (
        <Dropdown as="ul" id={listId} role="listbox" aria-label="Search results">
          {results.map((r, i) => (
            <li key={r.t} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <Link className={`dd-item${i === active ? ' active' : ''}`} to={r.to} tabIndex={-1} onClick={() => go(r)}>
                <Icon name="arrow" size={16} />
                {r.t}
              </Link>
            </li>
          ))}
          {results.length === 0 && (
            <li className="muted small" style={{ padding: '8px 12px' }} role="option" aria-selected="false" aria-disabled="true">
              No matches. Try “queue” or “animation”.
            </li>
          )}
        </Dropdown>
      )}
      <p className="sr-only" aria-live="polite">
        {show ? `${results.length} result${results.length === 1 ? '' : 's'}` : ''}
      </p>
    </SearchWrap>
  );
}

/* ---------- Notifications bell ---------- */
const READ_KEY = 'cos212-notifs-read';

function Bell() {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(() => load(READ_KEY, []));
  const wrap = useRef(null);
  const btn = useRef(null);
  const unread = NOTIFICATIONS.filter((n) => !read.includes(n.id)).length;

  const close = useCallback((viaKey) => {
    setOpen(false);
    if (viaKey) btn.current?.focus();
  }, []);
  useDismiss(wrap, open, close);

  const markAll = () => {
    const all = NOTIFICATIONS.map((n) => n.id);
    setRead(all);
    save(READ_KEY, all);
  };

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <Button
        ref={btn}
        $icon
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        aria-controls="notif-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="bell" />
        {unread > 0 && <Badge aria-hidden="true">{unread}</Badge>}
      </Button>
      {open && (
        <Dropdown id="notif-panel" role="region" aria-label="Notifications" className="notifs">
          <div className="nhead">
            <strong>Notifications</strong>
            <Button style={{ minHeight: 36, padding: '4px 10px', fontSize: '0.82rem' }} onClick={markAll} disabled={unread === 0}>
              Mark all read
            </Button>
          </div>
          <ul>
            {NOTIFICATIONS.map((n) => {
              const isUnread = !read.includes(n.id);
              return (
                <li key={n.id} className={`notif${isUnread ? ' unread' : ''}`}>
                  <span className="nico">
                    <Icon name={n.kind} size={18} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <p className="small">
                      {isUnread && <span className="sr-only">Unread: </span>}
                      {n.text}
                    </p>
                    <p className="small muted">{n.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Dropdown>
      )}
    </div>
  );
}

/* ---------- Top bar ---------- */
/** Lecture date: set by the student; counts down from today's real date. */
function LectureChip() {
  const { lecture } = profileStore.use();
  const [editing, setEditing] = useState(false);
  const btn = useRef(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let text = 'Set lecture date';
  if (lecture) {
    const L = new Date(`${lecture}T00:00:00`);
    const days = Math.round((L - today) / 86400000);
    const nice = L.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
    text = days === 0 ? `Lecture today · ${nice}` : days === 1 ? `Lecture tomorrow · ${nice}` : days > 1 ? `Lecture in ${days} days · ${nice}` : `Lecture was ${nice}`;
  }
  const close = () => {
    setEditing(false);
    requestAnimationFrame(() => btn.current?.focus());
  };
  if (editing) {
    return (
      <Chip as="div" className="lec">
        <label htmlFor="lec-date">Lecture date</label>
        <input
          id="lec-date"
          type="date"
          min={iso(today)}
          value={lecture}
          onChange={(e) => setLecture(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && close()}
        />
        <Button style={{ minHeight: 36, padding: '2px 10px' }} onClick={close}>
          Done
        </Button>
        {lecture && (
          <Button
            style={{ minHeight: 36, padding: '2px 10px' }}
            onClick={() => {
              setLecture('');
              close();
            }}
          >
            Clear
          </Button>
        )}
      </Chip>
    );
  }
  return (
    <Chip as="button" type="button" ref={btn} className="lecbtn" onClick={() => setEditing(true)} aria-label={lecture ? `${text}. Change the lecture date` : 'Set lecture date'}>
      <Icon name="calendar" size={16} />
      {text}
    </Chip>
  );
}

export default function TopBar() {
  const { speak, isSpeaking, message } = useSpeech();
  const pageText = usePageText();
  const speaking = isSpeaking('page');

  return (
    <div>
      <Bar>
        <Search />
        <div className="actions">
          <ServerStatus />
          <LectureChip />
          <Button
            $icon
            $on={speaking}
            aria-pressed={speaking}
            aria-label={speaking ? 'Stop reading this page' : 'Read this page aloud'}
            onClick={() => speak('page', pageText)}
          >
            <Icon name={speaking ? 'mute' : 'speaker'} />
          </Button>
          <ThemeSwitch />
          <Bell />
        </div>
      </Bar>
      {/* Live region stays mounted (so announcements are heard) but takes no space when empty. */}
      <p role="status" className="small" style={{ color: 'var(--amber)', marginTop: message ? 8 : 0 }}>
        {message}
      </p>
    </div>
  );
}

const Bar = styled.header`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  .actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .server .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  /* Shape as well as colour: filled = online, ring = offline, half = checking. */
  .dot.online { background: var(--mint); }
  .dot.offline { border: 2px solid var(--amber); }
  .dot.checking { background: linear-gradient(90deg, var(--muted) 50%, transparent 50%); border: 1px solid var(--muted); }
  .lecbtn { cursor: pointer; color: var(--fg); min-height: 44px; }
  .lecbtn:hover { border-color: var(--mint); }
  .lec { gap: 8px; flex-wrap: wrap; }
  .lec input { background: var(--bg); border: 1px solid var(--edge2); border-radius: 8px; padding: 4px 8px; min-height: 36px; color-scheme: light dark; }
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1 1 280px;
  max-width: 460px;
  .lead { position: absolute; left: 14px; top: 14px; color: var(--muted); pointer-events: none; }
  input {
    width: 100%;
    min-height: 48px;
    padding: 10px 14px 10px 44px;
    border-radius: 14px;
    border: 1px solid var(--edge2);
    background: var(--panel);
  }
`;

const Dropdown = styled.div`
  position: absolute;
  z-index: 20;
  top: 54px;
  left: 0;
  right: 0;
  margin: 0;
  list-style: none;
  background: var(--panel);
  border: 1px solid var(--edge2);
  border-radius: 14px;
  padding: 8px;
  box-shadow: 0 18px 40px var(--shadow);
  backdrop-filter: blur(8px);
  :root[data-theme='light'] & { background: #fff; }
  :root[data-theme='contrast'] & { background: #000; }

  .dd-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    min-height: 44px;
    border-radius: 10px;
    color: var(--fg);
    text-decoration: none;
  }
  .dd-item:hover, .dd-item.active { background: var(--soft); }
  .dd-item.active { outline: 2px solid var(--mint); }

  &.notifs { left: auto; right: 0; width: 340px; max-width: 86vw; }
  .nhead { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px 8px; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .notif { display: flex; gap: 12px; padding: 10px; border-radius: 12px; align-items: flex-start; }
  .notif.unread { background: var(--mintbg); }
  .nico { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--soft); flex: none; }
`;

const Badge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  background: #ff6b6b;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
  padding: 0 5px;
`;
