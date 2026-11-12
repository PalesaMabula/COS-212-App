import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Icon from '../ui/Icon';

const MODULE_STATUS = {
  done: { label: 'Done', icon: 'check' },
  open: { label: 'In progress', icon: 'play' },
  later: { label: 'Up later', icon: 'clock' },
};

/** Go-corner module card (user's GoCornerCard): a dark circle grows from the corner on hover. */
export default function ModuleCard({ module: m }) {
  const status = MODULE_STATUS[m.status];
  return (
    <Card to={`/module/${m.num}`} style={{ background: m.colour }}>
      <span className="corner" aria-hidden="true">
        <Icon name="arrow" size={16} />
      </span>
      <span className="num">
        <span className="sr-only">Module </span>0{m.num}
      </span>
      <span className="title">{m.title}</span>
      <span className="status">
        <Icon name={status.icon} size={14} />
        {status.label} · {m.count}/{m.total}
        <span className="sr-only"> sections done</span>
      </span>
      <span className="art">
        <Icon name={m.art} size={56} />
      </span>
    </Card>
  );
}

const Card = styled(Link)`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 190px;
  padding: 18px;
  border-radius: 18px;
  overflow: hidden;
  text-decoration: none;
  color: #121412;
  z-index: 0;
  transition: color 0.35s;

  &::before {
    content: '';
    position: absolute;
    z-index: -1;
    top: -16px;
    right: -16px;
    width: 32px;
    height: 32px;
    border-radius: 32px;
    background: #0e0e10;
    transform: scale(1);
    transition: transform 0.35s ease-out;
  }
  &:hover::before,
  &:focus-visible::before {
    transform: scale(28);
  }
  &:hover,
  &:focus-visible {
    color: #f5f4f0;
  }

  .corner {
    position: absolute;
    top: 0;
    right: 0;
    width: 36px;
    height: 36px;
    border-radius: 0 18px 0 36px;
    background: #0e0e10;
    color: #f5f4f0;
    display: grid;
    place-items: center;
  }
  .num {
    font-weight: 700;
    font-size: 0.88rem;
  }
  .title {
    font-family: var(--font-head);
    font-weight: 700;
    font-size: 1.35rem;
    line-height: 1.1;
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.76rem;
    font-weight: 700;
    background: #0e0e1022;
  }
  &:hover .status,
  &:focus-visible .status {
    background: #ffffff22;
  }
  .art {
    margin-top: auto;
    align-self: flex-end;
    opacity: 0.9;
  }
`;
