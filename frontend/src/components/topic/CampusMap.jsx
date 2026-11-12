import styled, { css } from 'styled-components';
import Icon from '../ui/Icon';
import { useCourse } from '../../context/CourseContext';

/** Vertices are named by letter (A–F) everywhere, so the label is the name. */
// eslint-disable-next-line no-unused-vars
export function useLabel(mode) {
  return (vertex) => vertex;
}

/*
 * Draws the campus graph for one BFS frame.
 *   variant="video": fixed dark "film" colours, decorative (the video has its own text alternative)
 *   variant="map":   theme colours, each place is a button that describes itself
 *
 * States never rely on colour alone:
 *   served  = filled mint + tick badge
 *   waiting = dashed amber border + clock badge
 *   not yet = plain outline
 * The place being served now gets a ring.
 */
export default function CampusMap({ frame, variant = 'map', progress = 1, labels = 'places', onPick, hideHops = false, picked = [] }) {
  const { edges: EDGES, pos: POS, places: PLACES } = useCourse().graph;
  const labelOf = useLabel(labels);
  const video = variant === 'video';
  const served = frame.order.at(-1);
  // In the video, places that join this chapter fade in after a short beat.
  const joinedYet = (p) => !video || !frame.added.includes(p) || progress > 0.35;
  const isWaiting = (p) => frame.q.includes(p) && joinedYet(p);
  const isServed = (p) => frame.order.includes(p);
  const isFound = (p) => isServed(p) || isWaiting(p);
  const ring = video ? Math.round(4 + 10 * Math.max(0, 1 - progress * 1.5)) : 0;

  return (
    <Box $video={video} aria-hidden={video ? 'true' : undefined}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {EDGES.map(([a, b]) => {
          // A found-by link can run either way along the edge (e.g. B found A).
          const tree = (frame.parent[b] === a && isFound(b)) || (frame.parent[a] === b && isFound(a));
          return (
            <line
              key={`${a}-${b}`}
              x1={POS[a][0]}
              y1={POS[a][1]}
              x2={POS[b][0]}
              y2={POS[b][1]}
              className={tree ? 'edge tree' : 'edge'}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {PLACES.map((p) => {
        const state = isServed(p) ? 'served' : isWaiting(p) ? 'waiting' : 'new';
        const words = { served: 'served', waiting: 'waiting in the queue', new: 'not found yet' }[state];
        const hop = hideHops ? '' : isFound(p) ? `level ${frame.hop[p]}` : p === 'F' ? 'no edges' : '';
        const isPicked = picked.includes(p);
        const Tag = video || !onPick ? 'span' : 'button';
        const now = p === served;
        return (
          <div key={p} className="place" style={{ left: `${POS[p][0]}%`, top: `${POS[p][1]}%` }}>
            <Tag
              type={Tag === 'button' ? 'button' : undefined}
              className={`node ${state}${now ? ' now' : ''}${isPicked ? ' picked' : ''}`}
              aria-pressed={Tag === 'button' && picked.length ? isPicked : undefined}
              style={now && video ? { boxShadow: `0 0 0 ${ring}px #f9cb8099` } : undefined}
              aria-label={Tag === 'button' ? `${p}, ${words}${now ? ', just served' : ''}` : undefined}
              onClick={Tag === 'button' ? () => onPick(p, words) : undefined}
            >
              {labelOf(p)}
              {isPicked && (
                <span className="badge pick" aria-hidden="true">
                  <Icon name="check" size={12} />
                </span>
              )}
              {state !== 'new' && !isPicked && (
                <span className="badge" aria-hidden="true">
                  <Icon name={state === 'served' ? 'check' : 'clock'} size={12} />
                </span>
              )}
            </Tag>
            <span className="hop" aria-hidden="true">
              {hop}
            </span>
          </div>
        );
      })}
    </Box>
  );
}

/** The queue strip, front on the left. */
export function QueueStrip({ queue, labels = 'places', variant = 'map', progress = 1, added = [] }) {
  const labelOf = useLabel(labels);
  const video = variant === 'video';
  return (
    <Strip $video={video} aria-hidden={video ? 'true' : undefined}>
      <span className="end">FRONT</span>
      {queue.length ? (
        <ol aria-label={video ? undefined : 'Queue from front to back'}>
          {queue.map((p, i) => (
            <li
              key={p}
              className={i === 0 ? 'first' : ''}
              style={{ opacity: video && added.includes(p) ? Math.min(1, Math.max(0, (progress - 0.25) * 3)) : 1 }}
            >
              {labelOf(p)}
              {i === 0 && <span className="next"> · next</span>}
            </li>
          ))}
        </ol>
      ) : (
        <span className="empty">{video ? 'Queue empty: search finished' : 'Empty'}</span>
      )}
      <span className="end back">BACK</span>
    </Strip>
  );
}

const Box = styled.div`
  position: absolute;
  inset: 0;
  container-type: inline-size;
  --node: min(${({ $video }) => ($video ? 64 : 70)}px, 13cqi);

  svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .edge { stroke: ${({ $video }) => ($video ? '#3f4f6a' : 'var(--edge2)')}; stroke-width: 3; }
  .edge.tree { stroke: #8debc5; stroke-width: 5; }
  :root[data-theme='light'] & .edge.tree { stroke: ${({ $video }) => ($video ? '#8debc5' : 'var(--mint)')}; }

  .place { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; }
  .node {
    position: relative;
    width: var(--node);
    height: var(--node);
    border-radius: 50%;
    padding: 0;
    font: inherit;
    font-size: clamp(10px, 2.6cqi, 14px);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    line-height: 1.05;
    letter-spacing: normal;
    transition: background-color 0.4s, border-color 0.4s, box-shadow 0.4s;
    ${({ $video }) =>
      $video
        ? css`
            background: #0f1b2e;
            color: #f5f4f0;
            border: 2px solid #b4b8b2;
          `
        : css`
            background: var(--panel);
            color: var(--fg);
            border: 2px solid var(--muted);
            cursor: pointer;
          `}
  }
  .node.served { background: #8debc5; color: #0e0e10; border: 3px solid #8debc5; }
  .node.waiting { background: #3a2a12; color: #f9cb80; border: 4px dashed #f9cb80; }
  :root[data-theme='light'] & .node.served { background: ${({ $video }) => ($video ? '#8debc5' : 'var(--mint)')}; color: ${({ $video }) => ($video ? '#0e0e10' : '#fff')}; border-color: ${({ $video }) => ($video ? '#8debc5' : 'var(--mint)')}; }
  :root[data-theme='light'] & .node.waiting { background: ${({ $video }) => ($video ? '#3a2a12' : 'var(--amberbg)')}; color: ${({ $video }) => ($video ? '#f9cb80' : 'var(--amber)')}; border-color: ${({ $video }) => ($video ? '#f9cb80' : 'var(--amber)')}; }
  :root[data-theme='contrast'] & .node.served { background: #ffff00; border-color: #ffff00; color: #000; }
  :root[data-theme='contrast'] & .node.waiting { background: #000; border-color: #00ffff; color: #00ffff; }
  ${({ $video }) => !$video && css`.node.now { box-shadow: 0 0 0 4px var(--bg), 0 0 0 7px var(--fg); }`}
  .node.picked { background: var(--lilacbg); color: var(--lilac); border: 4px solid var(--lilac); }
  .badge.pick { background: var(--lilac); color: #0e0e10; border-color: var(--lilac); }

  .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #0e0e10;
    color: #f5f4f0;
    border: 2px solid currentColor;
  }
  .hop {
    margin-top: 4px;
    font-size: clamp(10px, 2.4cqi, 0.76rem);
    font-weight: 700;
    white-space: nowrap;
    min-height: 1.2em;
    color: ${({ $video }) => ($video ? '#b4b8b2' : 'var(--muted)')};
  }
`;

const Strip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  ${({ $video }) =>
    $video &&
    css`
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 26%;
      background: #070d18;
      padding: 0 16px;
      flex-wrap: nowrap;
      overflow: hidden;
    `}

  .end { font-size: 0.76rem; font-weight: 700; color: ${({ $video }) => ($video ? '#b4b8b2' : 'var(--fg)')}; }
  .back { margin-left: ${({ $video }) => ($video ? 'auto' : '0')}; }
  ol { list-style: none; margin: 0; padding: 0; display: flex; gap: 8px; flex-wrap: wrap; }
  li {
    padding: 6px 14px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.94rem;
    background: #3a2a12;
    color: #f9cb80;
    border: 2px dashed #f9cb80;
    transition: opacity 0.3s;
  }
  li.first { border-style: solid; border-width: 3px; }
  :root[data-theme='light'] & li { ${({ $video }) => !$video && 'background: var(--amberbg); color: var(--amber); border-color: var(--amber);'} }
  :root[data-theme='contrast'] & li { background: #000; color: #00ffff; border-color: #00ffff; }
  .empty { color: ${({ $video }) => ($video ? '#b4b8b2' : 'var(--muted)')}; font-size: 0.88rem; }
`;
