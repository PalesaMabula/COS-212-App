import { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import SectionTitle from '../ui/SectionTitle';
import { Button, Panel, Pill } from '../ui/primitives';
import { dateKey, planStore, profileStore } from '../../data/stores';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KINDS = { done: ['Done', 'ok'], plan: ['Study', 'lilac'], class: ['Lecture', 'warn'] };

/*
 * Study calendar for this month (today's real date). The lecture day, if the
 * student has set it, is marked. Keyboard: Tab to the selected day,
 * arrow keys move by day/week, Home/End jump to the start/end of the week.
 * Plans are saved in the browser (planStore).
 */
export default function StudyCalendar() {
  const plans = planStore.use();
  const { lecture } = profileStore.use();
  const now = new Date();
  const PLAN_YEAR = now.getFullYear();
  const PLAN_MONTH = now.getMonth();
  const today = now.getDate();
  const daysInMonth = new Date(PLAN_YEAR, PLAN_MONTH + 1, 0).getDate();
  const offset = new Date(PLAN_YEAR, PLAN_MONTH, 1).getDay(); // blanks before day 1
  const monthName = new Date(PLAN_YEAR, PLAN_MONTH, 1).toLocaleString('en-ZA', { month: 'long' });

  const [sel, setSel] = useState(today || 1);
  const grid = useRef(null);

  const keyFor = (d) => dateKey(new Date(PLAN_YEAR, PLAN_MONTH, d));
  const eventsOn = (d) => [...(plans[keyFor(d)] || []), ...(lecture === keyFor(d) ? [{ id: 'lecture', text: 'COS212 graphs lecture', kind: 'class' }] : [])];
  const dayName = (d) => DAY_NAMES[new Date(PLAN_YEAR, PLAN_MONTH, d).getDay()];

  const upcoming = useMemo(
    () =>
      Object.entries(plans)
        .filter(([k]) => k >= dateKey(today ? now : new Date(PLAN_YEAR, PLAN_MONTH, 1)))
        .reduce((n, [, list]) => n + list.length, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans, today]
  );

  const focusDay = (d) => {
    setSel(d);
    requestAnimationFrame(() => grid.current?.querySelector(`[data-day="${d}"]`)?.focus());
  };

  const onKeyDown = (e) => {
    const weekday = (offset + sel - 1) % 7;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
    if (!(e.key in moves)) return;
    e.preventDefault();
    focusDay(Math.min(daysInMonth, Math.max(1, sel + moves[e.key])));
  };

  const addSession = () =>
    planStore.set((p) => ({
      ...p,
      [keyFor(sel)]: [...(p[keyFor(sel)] || []), { id: `s${Date.now()}`, text: 'Study session, 20 minutes', kind: 'plan', mine: true }],
    }));

  const removeSession = (id) =>
    planStore.set((p) => {
      const list = (p[keyFor(sel)] || []).filter((e) => e.id !== id);
      const next = { ...p, [keyFor(sel)]: list };
      if (!list.length) delete next[keyFor(sel)];
      return next;
    });

  const selEvents = eventsOn(sel);
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <Wrap aria-labelledby="cal-h">
      <SectionTitle id="cal-h" icon="calendar" right={<Pill $tone="lilac">{upcoming} plans ahead</Pill>}>
        {monthName} {PLAN_YEAR}
      </SectionTitle>

      <div className="cal" ref={grid} onKeyDown={onKeyDown} role="group" aria-label={`${monthName} ${PLAN_YEAR}. Use arrow keys to move between days.`}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
          <div key={i} className="calh" aria-hidden="true">
            {w}
          </div>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <span key={`b${i}`} />
          ) : (
            <button
              key={d}
              type="button"
              data-day={d}
              tabIndex={d === sel ? 0 : -1}
              className={`day${d === today ? ' today' : ''}${d === sel ? ' sel' : ''}`}
              aria-pressed={d === sel}
              aria-label={`${dayName(d)} ${d} ${monthName}${d === today ? ', today' : ''}, ${
                eventsOn(d).length ? `${eventsOn(d).length} plan${eventsOn(d).length > 1 ? 's' : ''}` : 'nothing planned'
              }`}
              onClick={() => setSel(d)}
            >
              {d}
              {eventsOn(d).length > 0 && <span className="dot" aria-hidden="true" />}
            </button>
          )
        )}
      </div>

      <div className="detail" aria-live="polite">
        <p style={{ fontWeight: 700 }}>
          {dayName(sel)} {sel} {monthName}
          {sel === today ? ' (today)' : ''}
        </p>
        {selEvents.map((e) => (
          <div key={e.id} className="event">
            <span>{e.text}</span>
            <span className="end">
              <Pill $tone={KINDS[e.kind][1]}>{KINDS[e.kind][0]}</Pill>
              {e.mine && (
                <Button $icon aria-label={`Remove ${e.text}`} onClick={() => removeSession(e.id)} style={{ minHeight: 36, width: 36 }}>
                  <Icon name="x" size={16} />
                </Button>
              )}
            </span>
          </div>
        ))}
        {selEvents.length === 0 && <p className="small muted">Nothing planned. A short session helps more than a long one later.</p>}
        <Button onClick={addSession}>
          <Icon name="plus" size={18} />
          Add a 20-minute study session
        </Button>
      </div>
    </Wrap>
  );
}

const Wrap = styled(Panel)`
  .cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; text-align: center; }
  .calh { font-size: 0.76rem; font-weight: 700; color: var(--muted); padding: 4px 0; }
  .day {
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    position: relative;
    font-size: 0.88rem;
    padding: 0;
  }
  .day:hover { border-color: var(--edge2); }
  .day.today { border-color: var(--amber); color: var(--amber); font-weight: 700; }
  .day.sel { background: var(--mint); color: var(--ink); font-weight: 700; }
  .dot {
    position: absolute;
    bottom: 5px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--lilac);
  }
  .day.sel .dot { background: var(--ink); }

  .detail { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
  .event {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--soft);
  }
  .end { display: flex; gap: 6px; align-items: center; flex: none; }
`;
