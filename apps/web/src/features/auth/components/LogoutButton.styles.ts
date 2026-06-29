import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const LogoutBtn = styled.button<{ collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: ${COLORS.errorAlpha12};
  border: 1px solid ${COLORS.errorAlpha25};
  color: ${COLORS.error};
  padding: ${({ collapsed }) => (collapsed ? "9px 0" : "8px")};
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${COLORS.errorAlpha19};
    border-color: ${COLORS.errorAlpha50};
  }
`;

export const LogoutText = styled.span`
  font-size: 13px;
  font-weight: 500;
`;
