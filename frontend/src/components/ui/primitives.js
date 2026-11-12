import styled, { css } from 'styled-components';

// Small building blocks reused on every screen (from .panel, .btn, .chip, .tag, .pill in shared.py).

export const Panel = styled.section`
  background: var(--panel);
  border: 1px solid var(--edge);
  border-radius: 20px;
  padding: 20px;
  min-width: 0;
`;

export const Tag = styled.p`
  color: var(--amber);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const buttonBase = css`
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid var(--edge2);
  background: var(--soft);
  color: var(--fg);
  font-size: 0.94rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  transition: border-color 0.2s, transform 0.1s, background 0.2s;
  &:hover { border-color: var(--mint); }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }

  ${({ $variant }) =>
    $variant === 'primary' &&
    css`
      background: var(--mint);
      color: var(--ink);
      border-color: transparent;
    `}
  ${({ $on }) =>
    $on &&
    css`
      background: var(--mint);
      color: var(--ink);
      border-color: var(--mint);
    `}
  ${({ $icon }) =>
    $icon &&
    css`
      width: 44px;
      padding: 0;
      position: relative;
    `}
`;

/** <Button $variant="primary" | $on | $icon> */
export const Button = styled.button.attrs((p) => ({ type: p.type || 'button' }))`
  ${buttonBase}
`;

/** Same look as Button, for router links: <ButtonLink as={Link} to="/..."> */
export const ButtonLink = styled.a`
  ${buttonBase}
  color: ${({ $variant }) => ($variant === 'primary' ? 'var(--ink)' : 'var(--fg)')};
`;

export const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  min-height: 36px;
  border-radius: 30px;
  border: 1px solid var(--edge2);
  font-size: 0.82rem;
  background: var(--soft);
`;

export const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.76rem;
  font-weight: 700;
  ${({ $tone }) =>
    ({
      ok: 'background: var(--mintbg); color: var(--mint);',
      warn: 'background: var(--amberbg); color: var(--amber);',
      lilac: 'background: var(--lilacbg); color: var(--lilac);',
      none: 'background: var(--soft); color: var(--muted);',
    })[$tone || 'ok']}
`;

/** Feedback box: <Feedback $ok> for right, <Feedback> for "Not yet", <Feedback $tone="soft"> for hints. */
export const Feedback = styled.div`
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 0.94rem;
  border: 1px solid ${({ $ok, $tone }) => ($tone === 'soft' ? 'var(--edge2)' : $ok ? 'var(--mint)' : 'var(--amber)')};
  background: ${({ $ok, $tone }) => ($tone === 'soft' ? 'var(--soft)' : $ok ? 'var(--mintbg)' : 'var(--amberbg)')};
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

/** Text input / textarea in the app style. */
export const Field = styled.input`
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--edge2);
  background: var(--soft);
  resize: vertical;
`;

/** Group of toggle buttons (aria-pressed), e.g. confidence or speed. */
export const Choices = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  & > button { min-height: 40px; padding: 4px 12px; font-size: 0.88rem; }
`;

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: stretch;
`;
