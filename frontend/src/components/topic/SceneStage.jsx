import { useCourse } from '../../context/CourseContext';

/*
 * Draws one chapter of a code-drawn video from the scene description in the
 * course content (see backend/app/content/models.py, Scene). `p` is progress
 * through the chapter, 0 → 1, used for simple animations. Decorative: the
 * player supplies captions, a live caption announcement and a transcript.
 */
const W = 640;
const H = 360;
const MAP_H = 270;
const SHUFFLED = { A: [20, 30], B: [50, 75], C: [30, 70], D: [75, 30], E: [55, 25], F: [88, 75] };
// Balls and strings: the graph lifted by A, each vertex hanging at its level. F lies on the table.
const HANG = { A: [50, 14], B: [34, 52], C: [62, 52], D: [44, 92], E: [76, 92], F: [92, 106] };
const clamp = (x) => Math.max(0, Math.min(1, x));

export default function SceneStage({ scene = {}, p = 1, labelOf = (x) => x }) {
  const { pos, edges, places } = useCourse().graph;
  const s = { style: 'graph', edges: true, highlight: [], waiting: [], edgeHighlight: [], path: [], trail: [], parents: {}, rings: {}, stack: [], queueStrip: [], ask: [], dashed: [], chips: [], book: [], ...scene };
  const hasStrip = s.line || s.queueStrip.length || s.chips.length;

  const at = (place) => {
    const a = s.hang === 'on' ? HANG[place] : pos[place];
    const b = s.shuffle ? SHUFFLED[place] : s.hang === 'move' ? HANG[place] : a;
    const t = s.shuffle || s.hang === 'move' ? clamp(p * 1.5) : 0;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    return [(x / 100) * W, 20 + (y / 100) * (MAP_H - 40)];
  };

  const ringR = s.ripple ? p * 520 : 0;
  const lit = (place) => {
    if (s.highlight.includes(place)) return true;
    if (s.ripple && place in s.rings) return s.rings[place] * 170 <= ringR + 20;
    return false;
  };
  const graphOpacity = s.dim ? 0.3 : s.title ? 1 - clamp(p * 2.5) * 0.8 : 1;
  const buildingsOpacity = s.style === 'buildings' ? 1 : s.morph ? clamp(1 - p * 1.6) : 0;
  const dotsOpacity = s.style === 'buildings' ? 0 : s.morph ? clamp(p * 1.6) : 1;
  const edgeDraw = s.drawEdges ? clamp(p * 1.4) : 1;
  const onEdge = (a, b) => s.edgeHighlight.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const segs = (list) => list.slice(1).map((b, i) => [list[i], b]);
  const pathDraw = clamp(p * 1.4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
      <g opacity={graphOpacity}>
        {/* edges */}
        {(s.edges || s.drawEdges) &&
          edges.map(([a, b]) => {
            const [x1, y1] = at(a);
            const [x2, y2] = at(b);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const hi = onEdge(a, b);
            return (
              <line
                key={`${a}-${b}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={hi ? '#8debc5' : s.style === 'buildings' ? '#b9a77f' : '#7f93b3'}
                strokeWidth={hi ? 8 : s.style === 'buildings' ? 10 : 5}
                strokeLinecap="round"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - edgeDraw)}
              />
            );
          })}

        {/* route drawn progressively (fewest stops) */}
        {s.path.length > 1 &&
          segs(s.path).map(([a, b], i, all) => {
            const [x1, y1] = at(a);
            const [x2, y2] = at(b);
            const share = clamp(pathDraw * all.length - i);
            return <line key={`p${i}`} x1={x1} y1={y1} x2={x1 + (x2 - x1) * share} y2={y1 + (y2 - y1) * share} stroke="#8debc5" strokeWidth="10" strokeLinecap="round" />;
          })}

        {/* walking back along parents */}
        {s.trail.length > 1 &&
          segs(s.trail).map(([a, b], i, all) => {
            const [x1, y1] = at(a);
            const [x2, y2] = at(b);
            const share = clamp(pathDraw * all.length - i);
            return (
              <line key={`t${i}`} x1={x1} y1={y1} x2={x1 + (x2 - x1) * share} y2={y1 + (y2 - y1) * share} stroke="#c9b6ff" strokeWidth="7" strokeDasharray="14 8" strokeLinecap="round" />
            );
          })}

        {/* ripple rings */}
        {s.ripple && (
          <g fill="none" stroke="#8debc5" opacity={clamp(1.2 - p)}>
            <circle cx={at(s.ripple)[0]} cy={at(s.ripple)[1]} r={ringR} strokeWidth="4" />
            <circle cx={at(s.ripple)[0]} cy={at(s.ripple)[1]} r={Math.max(0, ringR - 120)} strokeWidth="3" />
          </g>
        )}

        {/* buildings */}
        <g opacity={buildingsOpacity}>
          {places.map((pl) => {
            const [x, y] = at(pl);
            return (
              <g key={pl}>
                <rect x={x - 46} y={y - 24} width="92" height="48" rx="6" fill="#e8dcc2" />
                <text x={x} y={y + 6} textAnchor="middle" fontSize="16" fontWeight="700" fill="#3b2f17">
                  {labelOf(pl)}
                </text>
              </g>
            );
          })}
        </g>

        {/* vertices */}
        <g opacity={dotsOpacity}>
          {places.map((pl) => {
            const [x, y] = at(pl);
            const on = lit(pl);
            const wait = s.waiting.includes(pl);
            return (
              <g key={pl}>
                {s.focus === pl && <circle cx={x} cy={y} r={44} fill="none" stroke="#f9cb80" strokeWidth="4" opacity={0.5 + 0.5 * Math.sin(p * Math.PI * 4) ** 2} />}
                <circle
                  cx={x}
                  cy={y}
                  r="32"
                  fill={on ? '#8debc5' : wait ? '#3a2a12' : '#0f1b2e'}
                  stroke={wait ? '#f9cb80' : '#f5f4f0'}
                  strokeWidth={wait ? 4 : 3}
                  strokeDasharray={wait || s.dashed.includes(pl) ? '8 5' : undefined}
                  opacity={s.dashed.includes(pl) ? 0.6 : 1}
                />
                {s.ask.includes(pl) && (
                  <text x={x} y={y - 42} textAnchor="middle" fontSize="26" fontWeight="700" fill="#f9cb80" opacity={clamp(p * 3)}>
                    ?
                  </text>
                )}
                <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={on ? '#0e0e10' : wait ? '#f9cb80' : '#f5f4f0'}>
                  {labelOf(pl)}
                </text>
                {s.parents[pl] && (
                  <text x={x} y={y + 52} textAnchor="middle" fontSize="13" fontWeight="700" fill="#c9b6ff">
                    found by {labelOf(s.parents[pl])}
                  </text>
                )}
                {s.ripple && pl in s.rings && on && (
                  <text x={x} y={y + 52} textAnchor="middle" fontSize="13" fontWeight="700" fill="#b4b8b2">
                    level {s.rings[pl]}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </g>

      {/* café line */}
      {s.line && <CafeLine line={s.line} p={p} />}

      {/* BFS queue strip */}
      {s.queueStrip.length > 0 && (
        <g>
          <rect x="0" y={H - 62} width={W} height="62" fill="#070d18" />
          {s.serving && (
            <g>
              <rect x="10" y={H - 50} width="110" height="38" rx="8" fill="#0f3a2c" stroke="#8debc5" strokeWidth="3" />
              <text x="65" y={H - 25} textAnchor="middle" fontSize="14" fontWeight="700" fill="#8debc5">
                Serve: {labelOf(s.serving)}
              </text>
            </g>
          )}
          <text x={s.serving ? 134 : 18} y={H - 25} fontSize="13" fontWeight="700" fill="#b4b8b2">
            QUEUE
          </text>
          {s.queueStrip.map((q, i) => (
            <g key={`${q}-${i}`} opacity={clamp(p * 3 - i * 0.5)}>
              <rect x={(s.serving ? 196 : 90) + i * 74} y={H - 50} width="62" height="38" rx="8" fill="#3a2a12" stroke="#f9cb80" strokeWidth="3" />
              <text x={(s.serving ? 227 : 121) + i * 74} y={H - 25} textAnchor="middle" fontSize="16" fontWeight="700" fill="#f9cb80">
                {labelOf(q)}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* summary chips along the bottom */}
      {s.chips.length > 0 && (
        <g opacity={clamp(p * 3)}>
          <rect x="0" y={H - 62} width={W} height="62" fill="#070d18" />
          {s.chips.map((c, i) => (
            <g key={c}>
              <rect x={14 + i * 206} y={H - 48} width="196" height="36" rx="18" fill="#2c2342" stroke="#c9b6ff" strokeWidth="2" />
              <text x={112 + i * 206} y={H - 24} textAnchor="middle" fontSize="15" fontWeight="700" fill="#c9b6ff">
                {c}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* the found set as a guestbook */}
      {s.book.length > 0 && (
        <g>
          <rect x={W - 150} y="56" width="136" height="214" rx="12" fill="#1b1508" stroke="#f9cb80" strokeWidth="2" />
          <text x={W - 82} y="80" textAnchor="middle" fontSize="13" fontWeight="700" fill="#f9cb80">
            {s.bookTitle || 'FOUND (guestbook)'}
          </text>
          {s.book.map((v, i) => (
            <text key={v} x={W - 82} y={108 + i * 30} textAnchor="middle" fontSize="18" fontWeight="700" fill="#f5f4f0">
              ✓ {labelOf(v)}
            </text>
          ))}
        </g>
      )}

      {/* balls and strings: level numbers beside each row */}
      {s.rowLabels &&
        [0, 1, 2].map((lv) => {
          const y = 20 + ([14, 52, 92][lv] / 100) * (MAP_H - 40);
          return (
            <text key={lv} x="24" y={y + 6} fontSize="15" fontWeight="700" fill="#9fd3ff">
              level {lv}
            </text>
          );
        })}

      {/* stack of plates */}
      {s.stack.length > 0 && <Plates items={s.stack} p={p} />}

      {/* small label, e.g. "vertex", "FIFO" */}
      {s.tag && (
        <g opacity={clamp(p * 3)}>
          <rect x={W - 20 - (s.tag.length * 9 + 24)} y={hasStrip ? 14 : 14} width={s.tag.length * 9 + 24} height="34" rx="17" fill="#c9b6ff" />
          <text x={W - 20 - (s.tag.length * 9 + 24) / 2} y="37" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0e0e10">
            {s.tag}
          </text>
        </g>
      )}

      {/* title card */}
      {s.title && (
        <g opacity={clamp(p * 2.5)}>
          <rect x="0" y="0" width={W} height={H} fill="#0e0e10" opacity="0.92" />
          <text x={W / 2} y="160" textAnchor="middle" fontSize="30" fontWeight="700" fill="#f5f4f0">
            {s.title}
          </text>
          {s.subtitle && (
            <text x={W / 2} y="204" textAnchor="middle" fontSize="18" fill="#b4b8b2">
              {s.subtitle}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}

function CafeLine({ line, p }) {
  const people = line.people || [];
  const servedName = line.serve;
  const out = servedName ? clamp((p - 0.4) * 3) : 0;
  return (
    <g>
      <rect x="0" y={H - 82} width={W} height="82" fill="#070d18" />
      <text x="18" y={H - 36} fontSize="14" fontWeight="700" fill="#b4b8b2">
        FRONT
      </text>
      <text x={W - 18} y={H - 36} textAnchor="end" fontSize="14" fontWeight="700" fill="#b4b8b2">
        BACK · join here
      </text>
      {/* cashier */}
      <rect x="20" y={H - 150} width="70" height="50" rx="8" fill="#c9b6ff" />
      <text x="55" y={H - 120} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0e0e10">
        Serve
      </text>
      {people.map((name, i) => {
        const appear = line.arrive ? clamp(p * 4 - i) : 1;
        const isServed = name === servedName;
        const x = 90 + i * 120 - (isServed ? out * 80 : 0);
        const y = H - 66 - (isServed ? out * 70 : 0);
        return (
          <g key={name} opacity={appear}>
            <rect x={x} y={y} width="104" height="42" rx="10" fill="#3a2a12" stroke="#f9cb80" strokeWidth={i === 0 ? 4 : 3} />
            <text x={x + 52} y={y + 27} textAnchor="middle" fontSize="16" fontWeight="700" fill="#f9cb80">
              {name}
            </text>
            {isServed && out > 0.5 && (
              <text x={x + 52} y={y - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill="#8debc5">
                served ✓
              </text>
            )}
          </g>
        );
      })}
      {(line.served || []).length > 0 && (
        <text x={W - 18} y={H - 120} textAnchor="end" fontSize="14" fontWeight="700" fill="#8debc5">
          Served: {line.served.join(', ')}
        </text>
      )}
      {people.length === 0 && (
        <text x={W / 2} y={H - 36} textAnchor="middle" fontSize="15" fill="#b4b8b2">
          The line is empty…
        </text>
      )}
    </g>
  );
}

function Plates({ items, p }) {
  const off = clamp((p - 0.45) * 3);
  return (
    <g>
      <rect x="380" y="40" width="240" height="250" rx="16" fill="#0b1424" />
      <text x="500" y="70" textAnchor="middle" fontSize="15" fontWeight="700" fill="#b4b8b2">
        STACK · last in, first out
      </text>
      {items.map((label, i) => {
        const top = i === items.length - 1;
        const y = 250 - i * 46 - (top ? off * 70 : 0);
        const x = 420 + (top ? off * 120 : 0);
        return (
          <g key={label} opacity={top ? 1 - off * 0.3 : 1}>
            <rect x={x} y={y} width="160" height="34" rx="17" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="3" />
            <text x={x + 80} y={y + 23} textAnchor="middle" fontSize="15" fontWeight="700" fill="#15171c">
              {label}
            </text>
          </g>
        );
      })}
      {off > 0.6 && (
        <text x="500" y="300" textAnchor="middle" fontSize="14" fontWeight="700" fill="#f9cb80">
          The top plate comes off first
        </text>
      )}
    </g>
  );
}
