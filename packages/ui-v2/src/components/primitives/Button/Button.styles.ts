import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { TYPE } from "../../../typography";
import type { ButtonVariant } from "./Button.types";

export const StyledButton = styled.button<{ $variant: ButtonVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: ${({ $variant, theme }) =>
    $variant === "secondary" ? `1px solid ${theme.colors.border}` : "none"};
  border-radius: ${RADIUS.md}px;
  background: ${({ $variant, theme }) =>
    $variant === "primary"
      ? theme.colors.inverse
      : $variant === "critical"
        ? theme.colors.critical
        : theme.colors.surface};
  color: ${({ $variant, theme }) =>
    $variant === "primary"
      ? theme.colors.textOnDark
      : $variant === "critical"
        ? theme.colors.textOnSolid
        : theme.colors.textPrimary};
  font-size: ${TYPE.label.fontSize}px;
  line-height: ${TYPE.label.lineHeight}px;
  font-weight: ${TYPE.label.fontWeight};
  white-space: nowrap;
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
