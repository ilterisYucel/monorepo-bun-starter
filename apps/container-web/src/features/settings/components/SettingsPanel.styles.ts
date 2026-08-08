import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const Panel = styled.div`
  width: 440px;
  max-height: 80vh;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 12px;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const Title = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${COLORS.textPrimary};
  margin: 0;
`;

export const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${COLORS.textMuted};
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textPrimary};
  }
`;

export const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const SectionLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${COLORS.textMuted};
`;

export const ToggleGroup = styled.div`
  display: flex;
  gap: 6px;
`;

export const ToggleBtn = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid
    ${({ active }) => (active ? COLORS.accentLight : COLORS.borderDefault)};
  background: ${({ active }) =>
    active ? COLORS.accentLight : "transparent"};
  color: ${({ active }) => (active ? COLORS.textWhite : COLORS.textPrimary)};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover {
    border-color: ${COLORS.accentLight};
    opacity: ${({ active }) => (active ? 1 : 0.8)};
  }
`;

export const ComingSoon = styled.span`
  font-size: 10px;
  color: ${COLORS.textDisabled};
  font-style: italic;
`;
