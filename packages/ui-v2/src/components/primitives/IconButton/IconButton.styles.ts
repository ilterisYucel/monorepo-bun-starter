import styled from "@emotion/styled";
import { RADIUS } from "../../../system";

export const StyledIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: ${RADIUS.md}px;
  background: ${({ theme }) => theme.colors.bgPage};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.info};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
