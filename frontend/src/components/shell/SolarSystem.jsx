import styled from 'styled-components';

/*
 * Decorative solar system in the top-right of every page (user's SolarSystem
 * component, resized as in shared.py). aria-hidden, no pointer events.
 * Hidden by Settings > Solar system background; frozen by Reduce motion
 * (handled globally in GlobalStyle).
 */
const STARS = [
  [12, 20, 2, 0],
  [80, 30, 3, 0.5],
  [30, 85, 2.5, 0.7],
  [70, 72, 2.7, 0.3],
  [50, 4, 2.3, 0.8],
  [4, 60, 2.9, 0.2],
];

export default function SolarSystem() {
  return (
    <Wrap aria-hidden="true">
      <div className="sun">
        <div className="corona" />
      </div>
      <div className="orbit o1">
        <div className="planet mercury" />
      </div>
      <div className="orbit o2">
        <div className="planet venus" />
      </div>
      <div className="orbit o3">
        <div className="planet earth">
          <div className="moon" />
        </div>
        <div className="iss">
          <div className="panels" />
        </div>
      </div>
      <div className="orbit o4">
        <div className="planet mars" />
      </div>
      {STARS.map(([top, left, dur, delay], i) => (
        <span
          key={i}
          className="star"
          style={{ top: `${top}%`, left: `${left}%`, animation: `ping ${dur}s ease-in-out infinite ${delay}s` }}
        />
      ))}
    </Wrap>
  );
}

const Wrap = styled.div`
  position: absolute;
  top: -30px;
  right: -110px;
  width: 560px;
  height: 560px;
  z-index: -1;
  opacity: 0.8;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;

  :root[data-theme='light'] & { opacity: 0.45; }
  :root[data-theme='contrast'] & { opacity: 0.35; }

  .sun {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(to bottom right, #f59e0b, #ea580c, #dc2626);
    animation: pulse 2s ease-in-out infinite;
    box-shadow: 0 0 90px #ffa50080;
    z-index: 4;
  }
  .corona {
    position: absolute;
    inset: -22px;
    border-radius: 50%;
    background: linear-gradient(to bottom right, #f59e0b33, #dc262633);
    filter: blur(10px);
    animation: pulse 2s ease-in-out infinite;
  }
  .orbit {
    position: absolute;
    border-radius: 50%;
    border: 1px solid #ffffff1f;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  :root[data-theme='light'] & .orbit { border-color: #0000001f; }
  .o1 { width: 200px; height: 200px; }
  .o2 { width: 280px; height: 280px; }
  .o3 { width: 370px; height: 370px; z-index: 2; }
  .o4 { width: 470px; height: 470px; }

  .planet { position: absolute; border-radius: 50%; z-index: 3; }
  .mercury { width: 14px; height: 14px; background: linear-gradient(to bottom right, #d1d5db, #9ca3af); --ow: 200px; animation: orbit 4s linear infinite; }
  .venus { width: 20px; height: 20px; background: linear-gradient(to bottom right, #fef3c7, #fcd34d); box-shadow: 0 0 15px #fcd34d80; --ow: 280px; animation: orbit 6s linear infinite; }
  .earth { width: 26px; height: 26px; background: linear-gradient(to bottom right, #60a5fa, #34d399); box-shadow: 0 0 15px #60a5fa80; --ow: 370px; animation: orbit 8s linear infinite; }
  .moon { position: absolute; left: 50%; top: 50%; width: 9px; height: 9px; border-radius: 50%; background: #d1d5db; --ow: 44px; animation: orbit 2s linear infinite; }
  .mars { width: 20px; height: 20px; background: linear-gradient(to bottom right, #f87171, #dc2626); box-shadow: 0 0 15px #dc262680; --ow: 470px; animation: orbit 10s linear infinite; }

  .iss { position: absolute; width: 10px; height: 5px; background: #e5e7eb; border-radius: 2px; box-shadow: 0 0 10px #fff8; z-index: 3; --io: 200px; animation: issorb 5s linear infinite; }
  .iss .panels { position: absolute; left: 50%; top: 50%; width: 20px; height: 2px; background: linear-gradient(to right, #60a5fa, #93c5fd); transform: translate(-50%, -50%); }

  .star { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #fff; }
  :root[data-theme='light'] & .star { background: #7a7f8c; }

  @keyframes orbit {
    from { transform: rotate(0) translateX(calc(var(--ow) / 2)) rotate(0); }
    to { transform: rotate(360deg) translateX(calc(var(--ow) / 2)) rotate(-360deg); }
  }
  @keyframes issorb {
    from { transform: rotate(0) translateX(var(--io)) rotate(0); }
    to { transform: rotate(360deg) translateX(var(--io)) rotate(-360deg); }
  }

  @media (max-width: 760px) {
    width: 380px;
    height: 380px;
    right: -160px;
  }
`;
