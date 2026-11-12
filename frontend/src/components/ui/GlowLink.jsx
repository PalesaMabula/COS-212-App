import { Link } from 'react-router-dom';
import styled from 'styled-components';

/** The glowing "Continue" button (user's glow button). Renders a router link. */
const GlowLink = styled(Link)`
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  border-radius: 16px;
  border: 3px solid var(--mint);
  background: var(--glowBg);
  color: var(--mint);
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 0 0.8em 0.15em #8debc566, 0 0 2.6em 0.6em #2db48840, inset 0 0 0.6em 0.2em #8debc544;
  text-shadow: 0 0 0.5em #8debc599;
  transition: all 0.3s;

  &:hover {
    background: var(--mint);
    color: var(--ink);
    text-shadow: none;
  }

  :root[data-theme='light'] & {
    background: #086647;
    color: #fff;
    border-color: #086647;
    box-shadow: 0 6px 20px #08664740;
    text-shadow: none;
  }
  :root[data-theme='contrast'] & {
    background: #000;
    box-shadow: none;
    text-shadow: none;
  }
  :root[data-theme='contrast'] &:hover { background: var(--mint); color: #000; }
`;

export default GlowLink;
