import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import SolarSystem from './SolarSystem';
import ErrorBoundary from './ErrorBoundary';
import { useSettings } from '../../context/SettingsContext';
import { useSpeech } from '../../context/SpeechContext';

/*
 * Layout used by every page: skip link, solar background, sidebar, top bar,
 * then the page itself (<Outlet />).
 * On navigation: stop any read-aloud, move focus to <main> so screen-reader
 * users hear the new page, and scroll to ?go=<section-id> if given.
 */
export default function AppShell() {
  const { settings } = useSettings();
  const { stop } = useSpeech();
  const { pathname, search } = useLocation();
  const main = useRef(null);
  const first = useRef(true);

  // Only a new page or a ?go= jump moves focus. Other query changes (e.g. ?tab= on
  // Course overview) are in-page and must leave focus where the student is.
  const go = new URLSearchParams(search).get('go');
  useEffect(() => {
    stop();
    const isFirst = first.current;
    first.current = false;
    const jump = (target) => {
      target.scrollIntoView({ block: 'start' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    if (!go) {
      const id = requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        if (!isFirst) main.current?.focus({ preventScroll: true });
      });
      return () => cancelAnimationFrame(id);
    }
    // Topic content arrives from the server a moment after the page opens, so
    // keep looking for the ?go= section for up to 3 seconds before giving up.
    let tries = 0;
    const id = setInterval(() => {
      const target = document.getElementById(go);
      if (target) {
        clearInterval(id);
        jump(target);
      } else if (++tries > 30) {
        clearInterval(id);
        window.scrollTo(0, 0);
        main.current?.focus({ preventScroll: true });
      }
    }, 100);
    return () => clearInterval(id);
  }, [pathname, go, stop]);

  return (
    <Root>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      {settings.solar && <SolarSystem />}
      <div className="shell">
        <Sidebar />
        <main id="main" ref={main} tabIndex={-1} className="content">
          <TopBar />
          <ErrorBoundary resetKey={pathname + search}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </Root>
  );
}

const Root = styled.div`
  min-height: 100vh;
  position: relative;
  isolation: isolate;
  overflow-x: clip;

  .skip {
    position: absolute;
    left: 12px;
    top: 12px;
    transform: translateY(calc(-100% - 24px));
    z-index: 100;
    padding: 10px 16px;
    border-radius: 10px;
    background: var(--mint);
    color: var(--ink);
    font-weight: 700;
    text-decoration: none;
  }
  .skip:focus { transform: none; }

  .shell {
    max-width: 1460px;
    margin: 0 auto;
    padding: 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: flex-start;
    position: relative;
  }
  .content {
    flex: 999 1 640px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .content:focus { outline: none; }

  @media (max-width: 760px) {
    .shell { padding: 12px; }
  }
`;
