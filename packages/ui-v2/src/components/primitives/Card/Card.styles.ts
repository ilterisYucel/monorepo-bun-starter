import styled from "@emotion/styled";
import { ELEVATION, RADIUS } from "../../../system";
import type { CardStatus, CardVariant } from "./Card.types";

const STATUS_TOKEN = {
  normal: "border",
  warning: "warning",
  critical: "critical",
  maint: "maint",
} as const;

export const CardBox = styled.div<{
  $variant: CardVariant;
  $status: CardStatus;
  $padding: number;
}>`
  box-sizing: border-box;
  padding: ${({ $padding }) => $padding}px;
  border-radius: ${({ $variant }) => ($variant === "top" ? RADIUS.xl : RADIUS.lg)}px;
  background: ${({ theme }) => theme.colors.surface};
  border: ${({ theme, $variant, $status }) =>
    $status !== "normal"
      ? `1.5px solid ${theme.colors[STATUS_TOKEN[$status]]}`
      : $variant === "nested"
        ? `1px solid ${theme.colors.border}`
        : "none"};
  box-shadow: ${({ $variant, $status }) =>
    $variant === "top" && $status === "normal" ? ELEVATION.card : "none"};
`;

export const CardTitle = styled.div`
  margin-bottom: 16px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
`;
