import { useState } from 'react';
import styled from 'styled-components';
import Icon from '../ui/Icon';
import SectionTitle from '../ui/SectionTitle';
import WaveCheckbox from '../ui/WaveCheckbox';
import Astronaut from '../ui/Astronaut';
import { Button, Panel } from '../ui/primitives';
import { todoStore } from '../../data/stores';

/** To-do list with wave checkboxes. The astronaut floats in when everything is done. */
export default function TodoList() {
  const todos = todoStore.use();
  const [text, setText] = useState('');
  const left = todos.filter((t) => !t.done).length;
  const allDone = todos.length > 0 && left === 0;

  const toggle = (id) => todoStore.set((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id) => todoStore.set((list) => list.filter((t) => t.id !== id));
  const add = () => {
    const v = text.trim();
    if (!v) return;
    todoStore.set((list) => [...list, { id: Date.now(), text: v, done: false }]);
    setText('');
  };

  return (
    <Wrap aria-labelledby="todo-h">
      <SectionTitle id="todo-h" icon="list" right={<span className="small muted" aria-live="polite">{left} left</span>}>
        To-do
      </SectionTitle>

      {allDone && (
        <div className="yay">
          <Astronaut />
          <p>Everything's done. Take a breather before the lecture.</p>
        </div>
      )}

      <ul className="list">
        {todos.map((t) => (
          <li key={t.id}>
            <WaveCheckbox checked={t.done} onChange={() => toggle(t.id)}>
              {t.text}
            </WaveCheckbox>
            <Button $icon className="del" aria-label={`Delete task: ${t.text}`} onClick={() => remove(t.id)}>
              <Icon name="x" size={16} />
            </Button>
          </li>
        ))}
      </ul>

      <form
        className="add"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label className="sr-only" htmlFor="newtask">
          New task
        </label>
        <input id="newtask" className="field" placeholder="Type here" value={text} onChange={(e) => setText(e.target.value)} />
        <Button $icon type="submit" aria-label="Add task">
          <Icon name="plus" />
        </Button>
      </form>
    </Wrap>
  );
}

const Wrap = styled(Panel)`
  .yay { display: flex; align-items: center; gap: 10px; }
  .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .list li { display: flex; align-items: center; gap: 8px; }
  .del { background: transparent; border-color: transparent; color: var(--muted); }
  .del:hover { color: var(--fg); border-color: var(--edge2); }
  .add { display: flex; gap: 8px; margin-top: 10px; }
  .field {
    flex: 1;
    min-width: 0;
    min-height: 48px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid var(--edge2);
    background: var(--soft);
  }
`;
