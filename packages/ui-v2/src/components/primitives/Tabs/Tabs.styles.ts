import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { TYPE } from "../../../typography";
import type { TabCountTone, TabsVariant } from "./Tabs.types";

export const Track = styled.div<{ $variant: TabsVariant }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $variant }) => ($variant === "segmented" ? "2px" : "8px")};
  padding: ${({ $variant }) => ($variant === "segmented" ? "4px" : "0")};
  border-radius: ${RADIUS.lg}px;
  background: ${({ theme, $variant }) =>
    $variant === "segmented" ? theme.colors.surface : "transparent"};
`;

export const Item = styled.button<{ $active: boolean; $variant: TabsVariant }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: ${({ $variant }) => ($variant === "segmented" ? "32px" : "28px")};
  padding: 0 ${({ $variant }) => ($variant === "segmented" ? "16px" : "12px")};
  border: none;
  border-radius: ${({ $variant }) => ($variant === "segmented" ? `${RADIUS.md}px` : `${RADIUS.pill}px`)};
  background: ${({ $active, theme }) => ($active ? theme.colors.inverse : "transparent")};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.textOnDark : theme.colors.textSecondary};
  font-size: ${({ $variant }) =>
    $variant === "segmented" ? TYPE.heading.fontSize : TYPE.label.fontSize}px;
  line-height: ${({ $variant }) =>
    $variant === "segmented" ? TYPE.heading.lineHeight : TYPE.label.lineHeight}px;
  font-weight: ${TYPE.heading.fontWeight};
  cursor: pointer;
  white-space: nowrap;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.info};
    outline-offset: 2px;
  }
`;

const COUNT_BG = {
  critical: "critical",
  warning: "warning",
  neutral: "borderStrong",
} as const;

export const Count = styled.span<{ $tone: TabCountTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  min-width: 16px;
  padding: 0 5px;
  border-radius: ${RADIUS.pill}px;
  background: ${({ theme, $tone }) => theme.colors[COUNT_BG[$tone]]};
  color: ${({ $tone, theme }) =>
    $tone === "neutral" ? theme.colors.textPrimary : theme.colors.textOnSolid};
  font-size: ${TYPE.badge.fontSize}px;
  line-height: ${TYPE.badge.lineHeight}px;
  font-weight: ${TYPE.badge.fontWeight};
`;
