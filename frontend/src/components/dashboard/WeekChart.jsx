import { Link } from 'react-router-dom';
import styled from 'styled-components';
import SectionTitle from '../ui/SectionTitle';
import { Panel, Pill } from '../ui/primitives';
import { trackStore, weekSummary } from '../../data/stores';

/*
 * Minutes studied each day this week, from the student's own tracked time.
 * Nothing is made up: an empty week shows zeros and a short prompt to start.
 * The chart has a full text alternative (aria-label) and visible numbers.
 */
export default function WeekChart() {
  const track = trackStore.use();
  const w = weekSummary(track);
  const max = Math.max(...w.bars.map((b) => b.mins), 1);
  const peak = w.bars.findIndex((b) => b.mins === max);
  const described = w.bars.map((b) => `${b.long} ${b.mins}`).join(', ');

  return (
    <Wrap aria-labelledby="week-h">
      <SectionTitle
        id="week-h"
        icon="chart"
        right={
          <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {w.isEmpty && <Pill $tone="warn">Nothing tracked yet</Pill>}
            <Link to="/analysis" className="small">
              Full analysis
            </Link>
          </span>
        }
      >
        This week
      </SectionTitle>

      <div className="bars" role="img" aria-label={`Minutes studied this week: ${described}`}>
        {w.bars.map((b, i) => (
          <div key={b.short} className={`bar${i === peak && b.mins > 0 ? ' hi' : ''}`} aria-hidden="true">
            <span className="small">{b.mins}</span>
            <span className="b" style={{ height: `${Math.max(4, Math.round((b.mins / max) * 100))}px` }} />
            <span className="small muted">{b.short}</span>
          </div>
        ))}
      </div>

      {w.isEmpty ? (
        <p className="small muted">
          No study time this week yet. <Link to="/module/1">Start with Module 1</Link>, or jump into any module.
        </p>
      ) : (
        <p className="small">
          <strong>{w.total} minutes</strong> this week.
          {w.topMode && (
            <>
              {' '}
              You spent the most time <strong>{w.topMode.toLowerCase()}</strong>
              {w.topMode === 'Listening' ? ' to notes' : ''}.
            </>
          )}
        </p>
      )}
    </Wrap>
  );
}

const Wrap = styled(Panel)`
  display: flex;
  flex-direction: column;
  gap: 12px;

  .bars { display: flex; align-items: flex-end; gap: 10px; height: 150px; }
  .bar {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    height: 100%;
    justify-content: flex-end;
  }
  .b { width: 100%; max-width: 34px; border-radius: 8px 8px 4px 4px; background: var(--edge2); }
  .bar.hi .b { background: var(--mint); }
`;
