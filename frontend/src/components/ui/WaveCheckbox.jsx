import styled from 'styled-components';

/** Wave checkbox (user's component): a real <input type="checkbox"> inside a <label>. */
export default function WaveCheckbox({ checked, onChange, children }) {
  return (
    <Label>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="box" aria-hidden="true">
        <svg viewBox="0 0 12 10" width="12" height="10">
          <polyline points="1.5 6 4.5 9 10.5 1" />
        </svg>
      </span>
      <span className="ctext">{children}</span>
    </Label>
  );
}

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  cursor: pointer;
  user-select: none;
  flex: 1;
  min-width: 0;

  input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .box {
    position: relative;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 2px solid #9098a9;
    flex: none;
    transition: all 0.2s;
  }
  .box svg {
    position: absolute;
    top: 4px;
    left: 3px;
    fill: none;
    stroke: #fff;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 16px;
    stroke-dashoffset: 16px;
    transition: all 0.3s 0.1s;
  }
  .box::before {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #506eec;
    transform: scale(0);
  }
  input:checked + .box { background: #506eec; border-color: #506eec; animation: wave 0.4s ease; }
  input:checked + .box svg { stroke-dashoffset: 0; }
  input:checked + .box::before { transform: scale(3.5); opacity: 0; transition: all 0.6s; }
  input:focus-visible + .box { outline: 3px solid var(--mint); outline-offset: 3px; }
  input:checked ~ .ctext { text-decoration: line-through; color: var(--muted); }
  .ctext { overflow-wrap: anywhere; }
  @keyframes wave { 50% { transform: scale(0.9); } }
`;
