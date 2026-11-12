import styled from 'styled-components';
import { useSettings } from '../../context/SettingsContext';

/*
 * Sun/moon theme switch (user's ThemeSwitch, simplified in shared.py).
 * A real <button role="switch">: Space/Enter toggle, aria-checked = dark mode on.
 */
export default function ThemeSwitch() {
  const { settings, toggleTheme } = useSettings();
  const dark = settings.theme !== 'light';
  return (
    <Switch type="button" role="switch" aria-checked={dark} aria-label="Dark mode" onClick={toggleTheme} title={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
      <span className="cloud" />
      <span className="star" style={{ top: 8, left: 12 }} />
      <span className="star" style={{ top: 24, left: 22, animationDelay: '.4s' }} />
      <span className="star" style={{ top: 12, left: 30, animationDelay: '.8s' }} />
      <span className="sun" />
    </Switch>
  );
}

const Switch = styled.button`
  width: 76px;
  height: 44px;
  border-radius: 12px;
  border: 0;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  padding: 0;
  flex: none;
  background: linear-gradient(#5caad4, #4a92bd);
  box-shadow: 0 0 0 2px #1a1a1a, 3px 4px 0 2px #1a1a1a38;
  transform: rotate(-0.7deg);
  transition: background 0.5s;

  &[aria-checked='true'] { background: linear-gradient(#1b1e36, #252a4a); }

  .sun {
    position: absolute;
    top: 9px;
    left: 7px;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: #f5c518;
    box-shadow: inset 1px 1px 1px #fffde0, 0 0 0 6px #ffffff22, 0 0 0 12px #ffffff14;
    transition: left 0.45s cubic-bezier(0.3, 1.3, 0.5, 1), background 0.3s;
  }
  &[aria-checked='true'] .sun {
    left: 43px;
    background: #d8d4c0;
    box-shadow: inset -6px -3px 0 #b9b4a0, inset 4px 6px 0 -3px #9b9787;
  }
  .cloud {
    position: absolute;
    bottom: -8px;
    left: 22px;
    width: 18px;
    height: 18px;
    border-radius: 9px;
    background: #f4f4f4;
    box-shadow: 14px 4px 0 #f4f4f4, 30px -2px 0 #f4f4f4, 42px 6px 0 #bacfe0;
    transition: bottom 0.5s;
  }
  &[aria-checked='true'] .cloud { bottom: -40px; }
  .star {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #fff8e1;
    opacity: 0;
    transition: opacity 0.4s;
  }
  &[aria-checked='true'] .star { opacity: 1; animation: twinkle 1.4s infinite ease-in-out; }
  @keyframes twinkle { 50% { opacity: 0.3; transform: scale(1.3); } }
`;
