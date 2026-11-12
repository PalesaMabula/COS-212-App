import styled from 'styled-components';
import { usePage } from '../context/PageContext';
import { Row } from '../components/ui/primitives';
import WelcomeHero from '../components/dashboard/WelcomeHero';
import TopicStepper from '../components/dashboard/TopicStepper';
import StudyCalendar from '../components/dashboard/StudyCalendar';
import TodoList from '../components/dashboard/TodoList';
import FocusTimer from '../components/dashboard/FocusTimer';
import ReadyChecklist from '../components/dashboard/ReadyChecklist';
import WeekChart from '../components/dashboard/WeekChart';
import useProgress from '../hooks/useProgress';
import { heroText } from '../components/dashboard/WelcomeHero';

export default function Dashboard() {
  const p = useProgress();
  const m = p.currentModule;
  usePage(
    'Dashboard',
    `Dashboard. ${heroText(p.next, p.doneCount, p.topics.length)} Module ${m.num}, ${m.title}: ` +
      m.topics.map((t) => `${t.id} ${t.title}, ${t.done ? 'done' : 'not done yet'}`).join('. ') +
      '. Below are your study calendar, to-do list, focus timer, lecture-ready checklist and this week’s study time.'
  );
  // Two columns that fill evenly: module steps with the timer and checklist under
  // them; calendar, to-do and this week on the right. On narrow screens they stack.
  return (
    <>
      <WelcomeHero />
      <Row id="plan">
        <Main>
          <TopicStepper />
          <Pair>
            <FocusTimer />
            <ReadyChecklist />
          </Pair>
        </Main>
        <Side>
          <StudyCalendar />
          <TodoList />
          <WeekChart />
        </Side>
      </Row>
    </>
  );
}

const Main = styled.div`
  flex: 999 1 440px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 20px;
  align-items: start;
`;

const Side = styled.div`
  flex: 1 1 340px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;
