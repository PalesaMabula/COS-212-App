import styled from 'styled-components';
import Icon from './Icon';

/** Heading row used at the top of panels: icon + title on the left, extra content on the right. */
export default function SectionTitle({ id, icon, as: Tag = 'h3', children, right, sub }) {
  return (
    <Head>
      <div>
        {sub && <p className="small muted">{sub}</p>}
        <Tag id={id} className="title">
          {icon && <Icon name={icon} />}
          {children}
        </Tag>
      </div>
      {right}
    </Head>
  );
}

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  .title { display: flex; align-items: center; gap: 8px; }
`;
