import { ICONS } from './icons';

/**
 * Decorative stroke icon. Always aria-hidden: the button or link around it
 * must carry the accessible name (visible text or aria-label).
 * The path strings are our own static design assets, never user input.
 */
export default function Icon({ name, size = 20, className = '', style }) {
  const paths = ICONS[name];
  if (!paths) return null;
  return (
    <svg
      className={`ic ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none', ...style }}
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}
