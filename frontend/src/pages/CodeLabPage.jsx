import { Panel, Tag } from '../components/ui/primitives';
import CodeLab from '../components/topic/CodeLab';
import { usePage } from '../context/PageContext';
import { TrackerProvider } from '../hooks/useStudyTracker';

/** Code lab: BFS in Python on graph A–F, run or stepped line by line (traced by the Python server). */
export default function CodeLabPage() {
  usePage('Code lab', 'Code lab. Run breadth-first search in Python on graph A to F, or step through it one line at a time.');
  return (
    <TrackerProvider key="code">
      <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 28 }}>
        <Tag>Code lab · Python</Tag>
        <h1>BFS in Python</h1>
        <p className="muted" style={{ maxWidth: '62ch' }}>
          Pick a start vertex, then press Run, or Step to go one line at a time while the queue and the found set change beside the code. The same code is explained in Module 3, section 05.
        </p>
      </Panel>
      <CodeLab section={{ kind: 'codelab', title: 'BFS in Python' }} number="Code lab" />
    </TrackerProvider>
  );
}
