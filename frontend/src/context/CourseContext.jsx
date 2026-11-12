import { createContext, useContext } from 'react';
import styled from 'styled-components';
import useApi from '../api/useApi';
import { Button } from '../components/ui/primitives';
import { BrandMark } from '../components/shell/Sidebar';

/*
 * Loads the course (modules, topics, objectives, glossary, checklist) and the
 * campus graph from the Python server once, at start-up. Every screen reads
 * them with useCourse(). The front end holds no course content of its own.
 */
const CourseContext = createContext(null);

export function CourseProvider({ children }) {
  const course = useApi('/api/course');
  const graph = useApi('/api/graph');

  if (course.error || graph.error) {
    return (
      <Splash role="alert">
        <BrandMark size={56} />
        <h1>Can’t reach the COS212 server</h1>
        <p className="muted">
          The course content comes from the Python server. Start it from the <code>backend</code> folder with{' '}
          <code>uvicorn app.main:app --port 8000</code>, then try again.
        </p>
        <Button
          $variant="primary"
          onClick={() => {
            course.reload();
            graph.reload();
          }}
        >
          Try again
        </Button>
      </Splash>
    );
  }

  if (!course.data || !graph.data) {
    return (
      <Splash aria-busy="true">
        <BrandMark size={56} />
        <p role="status">Loading the course…</p>
      </Splash>
    );
  }

  const value = { ...course.data, graph: graph.data };
  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error('useCourse must be used inside <CourseProvider>');
  return ctx;
}

const Splash = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
  p { max-width: 520px; }
  code { background: var(--soft); padding: 2px 6px; border-radius: 6px; }
`;
