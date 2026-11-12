import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { SpeechProvider } from './context/SpeechContext';
import { PageProvider } from './context/PageContext';
import GlobalStyle from './theme/GlobalStyle';
import AppShell from './components/shell/AppShell';
import { CourseProvider } from './context/CourseContext';
import { Analysis, CodeLabPage, Course, Dashboard, FullQuiz, Practice, Settings, Topic } from './pages';

/** Old links like #/topic/3.2 go to the module page. */
function OldTopic() {
  const { id } = useParams();
  return <Navigate to={`/module/${String(id).split('.')[0]}`} replace />;
}

function Themed() {
  const { settings } = useSettings();
  return <GlobalStyle $s={settings} />;
}

// HashRouter: the server only needs to serve index.html; routes live after the #.
export default function App() {
  return (
    <SettingsProvider>
      <Themed />
      <SpeechProvider>
        <PageProvider>
          <CourseProvider>
          <HashRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Dashboard />} />
                <Route path="module/:id" element={<Topic />} />
                <Route path="topic/:id" element={<OldTopic />} />
                <Route path="lesson" element={<Navigate to="/module/3" replace />} />
                <Route path="practice" element={<Practice />} />
                <Route path="quiz" element={<FullQuiz />} />
                <Route path="code" element={<CodeLabPage />} />
                <Route path="course" element={<Course />} />
                <Route path="analysis" element={<Analysis />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </HashRouter>
          </CourseProvider>
        </PageProvider>
      </SpeechProvider>
    </SettingsProvider>
  );
}
