// Colour tokens, lifted from design-generator/shared.py (.app and .app.light).
// Every component reads these as CSS variables (var(--mint) etc.), so switching
// theme is just swapping this object.

export const themes = {
  dark: {
    bg: '#0e0e10',
    fg: '#f5f4f0',
    muted: '#b4b8b2',
    edge: '#303833',
    edge2: '#3f4a44',
    panel: '#171b19e6',
    soft: '#222a26',
    mint: '#8debc5', // primary, "served / done"
    ink: '#0e0e10', // text on mint
    mintbg: '#1d3a30',
    amber: '#f9cb80', // "waiting in queue"
    amberbg: '#3a2a12',
    lilac: '#c9b6ff',
    lilacbg: '#2c2342',
    sky: '#9fd3ff',
    shadow: '#0008',
    glowBg: '#0f3a2c',
  },
  light: {
    bg: '#faf9f6',
    fg: '#111214',
    muted: '#4f534e',
    edge: '#dcded8',
    edge2: '#c9ccc4',
    panel: '#ffffffe8',
    soft: '#eef1ec',
    mint: '#086647',
    ink: '#ffffff',
    mintbg: '#e1f1e8',
    amber: '#7a4e06',
    amberbg: '#fcefd9',
    lilac: '#5b3fb0',
    lilacbg: '#ece6ff',
    sky: '#155e8f',
    shadow: '#0002',
    glowBg: '#086647',
  },
  // High contrast: from the Settings live-preview palette in Options.dc.html.
  contrast: {
    bg: '#000000',
    fg: '#ffffff',
    muted: '#e8e8e8',
    edge: '#ffffff',
    edge2: '#ffffff',
    panel: '#000000',
    soft: '#141414',
    mint: '#ffff00',
    ink: '#000000',
    mintbg: '#2a2a00',
    amber: '#00ffff',
    amberbg: '#002a2a',
    lilac: '#ff9cff',
    lilacbg: '#2a002a',
    sky: '#9fd3ff',
    shadow: '#000',
    glowBg: '#000000',
  },
};

// Text size options from Settings (body text in px).
export const textSizes = [15, 17, 20, 23];

export const fontStacks = {
  work: "'Work Sans', system-ui, sans-serif",
  lexend: 'Lexend, system-ui, sans-serif',
  atkinson: "'Atkinson Hyperlegible', system-ui, sans-serif",
};

export const headingFont = "'Playfair Display', Georgia, serif";
export const monoFont = "ui-monospace, Menlo, Consolas, 'Courier New', monospace";
