import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const TabsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid ${COLORS.borderDefault};
  margin: 0 -24px;
  padding: 0 24px;
`;

export const TabButton = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  border: none;
  background: none;
  color: ${({ active }) => (active ? COLORS.textPrimary : COLORS.textMuted)};
  font-size: 13px;
  font-weight: ${({ active }) => (active ? 600 : 500)};
  cursor: pointer;
  border-bottom: 2px solid
    ${({ active }) => (active ? COLORS.accentLight : "transparent")};
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: ${COLORS.textPrimary};
  }
`;

export const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;
