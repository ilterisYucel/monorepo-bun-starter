import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Bar = styled.div`
  display: flex;
  align-items: center;
  padding: 4px 14px;
  background: ${COLORS.bgSystemBar};
  border-bottom: 1px solid ${COLORS.borderDefault};
  flex-shrink: 0;
  min-height: 40px;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  width: 100%;

  @media (max-width: 900px) {
    display: none;
  }
`;

export const Box = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Label = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${COLORS.textLight};
`;

export const Mono = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${COLORS.textPrimary};
  font-variant-numeric: tabular-nums;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
`;

export const Hamburger = styled.div`
  display: none;
  position: relative;
  margin-left: auto;

  @media (max-width: 900px) {
    display: flex;
  }
`;

export const HamburgerBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 6px;
  background: ${COLORS.bgCard};
  color: ${COLORS.textMuted};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textPrimary};
  }
`;

export const Popup = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 100;
  min-width: 220px;
`;