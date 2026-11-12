import { createGlobalStyle } from 'styled-components';
import { themes, textSizes, fontStacks, headingFont } from './tokens';

// Turns a token object into CSS custom properties: { mint: '#..' } -> --mint: #..;
const vars = (t) =>
  Object.entries(t)
    .map(([k, v]) => `--${k}: ${v};`)
    .join('\n');

/*
 * Sizing rule for the whole app: the root font size IS the chosen body text
 * size (15/17/20/23px). Text inside components is written in rem, so "Text size"
 * in Settings scales every word on every page. Layout spacing stays in px.
 *   1rem = body text, 0.88rem ~ small text, 0.76rem ~ tags.
 */
const GlobalStyle = createGlobalStyle`
  :root {
    ${({ $s }) => vars(themes[$s.theme] || themes.dark)}
    --font-body: ${({ $s }) => fontStacks[$s.font] || fontStacks.work};
    --font-head: ${headingFont};
    color-scheme: ${({ $s }) => ($s.theme === 'light' ? 'light' : 'dark')};
  }

  html {
    font-size: ${({ $s }) => textSizes[$s.size] ?? 17}px;
    -webkit-text-size-adjust: 100%;
  }

  *, *::before, *::after { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: var(--font-body);
    font-size: 1rem;
    line-height: ${({ $s }) => ($s.spacing === 'wide' ? 2 : 1.6)};
    letter-spacing: ${({ $s }) => ($s.spacing === 'wide' ? '0.05em' : 'normal')};
    word-spacing: ${({ $s }) => ($s.spacing === 'wide' ? '0.12em' : 'normal')};
    transition: background-color .3s, color .3s;
  }

  h1, h2, h3 {
    font-family: var(--font-head);
    font-weight: 700;
    line-height: 1.15;
    margin: 0;
    letter-spacing: normal;
  }
  h1 { font-size: clamp(1.75rem, 3.4vw, 2.7rem); letter-spacing: -0.02em; }
  h2 { font-size: 1.53rem; }
  h3 { font-size: 1.18rem; }
  p { margin: 0; }
  a { color: var(--mint); }

  button, input, select, textarea { font: inherit; color: inherit; letter-spacing: inherit; }

  :focus-visible { outline: 3px solid var(--mint); outline-offset: 3px; }

  /* Shared helpers, kept as class names so ported markup stays close to the prototype. */
  .muted { color: var(--muted); }
  .small { font-size: 0.88rem; }
  .sr-only {
    position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }

  /* Read-aloud: the word being read turns green and is underlined (not colour alone). */
  code.inl { font-family: ui-monospace, 'Cascadia Code', Consolas, monospace; font-size: 0.9em; background: var(--soft); border: 1px solid var(--edge); border-radius: 6px; padding: 1px 6px; }
  .ra-on { color: var(--mint); text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; }
  .ra-part-on { color: var(--mint); }

  /* Expandable sections (transcripts, "the map in words"). */
  summary.sum { cursor: pointer; font-weight: 700; color: var(--mint); min-height: 44px; display: flex; align-items: center; }

  /* Shared keyframes used by several components. */
  @keyframes ping { 75%, 100% { transform: scale(1.6); opacity: 0; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 50% { opacity: .8; } }

  /* Reduced motion: honoured from the OS setting AND from Settings > Reduce motion. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  ${({ $s }) =>
    $s.still
      ? `*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }`
      : ''}
`;

export default GlobalStyle;
