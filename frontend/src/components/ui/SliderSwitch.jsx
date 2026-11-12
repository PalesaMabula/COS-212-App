import styled from 'styled-components';

/** Purple slider switch (user's component): a real checkbox with role="switch". */
export default function SliderSwitch({ checked, onChange, label, describedBy }) {
  return (
    <Wrap>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} aria-describedby={describedBy} />
      <span className="slider" aria-hidden="true" />
    </Wrap>
  );
}

const Wrap = styled.label`
  position: relative;
  display: inline-block;
  width: 64px;
  height: 36px;
  flex: none;
  cursor: pointer;

  input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; z-index: 1; }
  .slider {
    position: absolute;
    inset: 0;
    border-radius: 36px;
    background: #3a3a46;
    border: 2px solid #8b8b9e;
    transition: background 0.3s, border-color 0.3s;
  }
  .slider::before {
    content: '';
    position: absolute;
    width: 24px;
    height: 24px;
    left: 4px;
    top: 4px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.3s;
  }
  input:checked + .slider { background: #8a2be2; border-color: #c9b6ff; }
  input:checked + .slider::before { transform: translateX(28px); }
  input:focus-visible + .slider { outline: 3px solid var(--mint); outline-offset: 3px; }
`;
