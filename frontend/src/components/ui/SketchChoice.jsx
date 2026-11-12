import { useId } from 'react';
import styled from 'styled-components';
import Icon from './Icon';

/*
 * Hand-drawn answer choices (user's checkbox design) for multiple-choice answers.
 * Each option is a real radio input in a fieldset, so the keyboard (Tab, then the
 * arrow keys) and screen readers work as normal. The input sits invisibly over
 * the drawn box, which takes the text colour so it matches the font in every
 * theme. Choosing an option draws a tick; once checked, the option also says
 * "Right" or "Not yet" with an icon and words, not just colour.
 *
 *   <SketchChoice legend="Answers" options={['A','B']} value={i} answer={1} onChange={setI} />
 *   answer = index of the right option (omit to show no marking)
 */
export default function SketchChoice({ legend, legendVisible = false, options, value, answer, onChange, disabled = false }) {
  const name = useId();
  return (
    <Fieldset>
      <legend className={legendVisible ? 'q' : 'sr-only'}>{legend}</legend>
      <div className="opts">
        {options.map((label, i) => {
          const chosen = value === i;
          const marked = chosen && answer !== undefined;
          const right = marked && i === answer;
          return (
            <label key={`${i}-${label}`} className={`opt${marked ? (right ? ' right' : ' wrong') : ''}`}>
              <span className="box">
                <input type="radio" name={name} checked={chosen} disabled={disabled && !chosen} onChange={() => onChange(i)} />
                <svg viewBox="0 0 95 95" aria-hidden="true" focusable="false">
                  <rect x={30} y={20} width={50} height={50} rx={3} />
                  <g transform="translate(0,-952.36222)">
                    <path className="tick" d="m 56,963 c -102,122 6,9 7,9 17,-5 -66,69 -38,52 122,-77 -7,14 18,4 29,-11 45,-43 23,-4" />
                  </g>
                </svg>
              </span>
              <span className="text">{label}</span>
              {marked && (
                <span className="mark">
                  <Icon name={right ? 'check' : 'x'} size={16} />
                  {right ? 'Right' : 'Not yet'}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </Fieldset>
  );
}

const Fieldset = styled.fieldset`
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;

  .q { font-weight: 700; font-size: 1.12rem; margin-bottom: 8px; padding: 0; }
  .opts { display: flex; flex-direction: column; gap: 6px; }
  .opt {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    color: var(--fg);
    min-height: 48px;
    padding: 2px 12px 2px 4px;
    border-radius: 10px;
    border: 1px solid transparent;
  }
  .opt:hover { background: var(--soft); }
  .opt.right { background: var(--mintbg); border-color: var(--mint); }
  .opt.wrong { background: var(--amberbg); border-color: var(--amber); }
  .text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .mark { display: inline-flex; align-items: center; gap: 4px; font-size: 0.82rem; flex: none; }

  /* The drawn box. The real input covers it (invisible), so clicks and focus land on it. */
  .box { position: relative; flex: none; width: 44px; height: 44px; }
  .box input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
  .box svg { width: 100%; height: 100%; display: block; pointer-events: none; overflow: visible; }
  rect { fill: none; stroke: currentColor; stroke-width: 3.5; opacity: 0.75; transition: opacity 0.2s; }
  .opt:hover rect { opacity: 1; }
  .tick {
    fill: none;
    stroke: currentColor;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 400;
    stroke-dashoffset: 400;
    opacity: 0;
    transition: stroke-dashoffset 0.5s, opacity 0.2s;
  }
  input:checked + svg .tick { stroke-dashoffset: 0; opacity: 1; }
  input:checked + svg rect { opacity: 1; }
  input:focus-visible + svg rect { stroke: var(--focus, var(--fg)); stroke-width: 6; opacity: 1; }
  .box:has(input:focus-visible) { outline: 2px dashed var(--fg); outline-offset: 2px; border-radius: 8px; }
  input:disabled { cursor: not-allowed; }
  .opt:has(input:disabled:not(:checked)) { opacity: 0.55; cursor: not-allowed; }
`;
