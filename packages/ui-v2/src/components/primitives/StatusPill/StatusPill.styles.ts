import styled from "@emotion/styled";
import { ELEVATION, RADIUS } from "../../../system";
import { TYPE } from "../../../typography";
import type { StatusTone } from "./StatusPill.types";

const DOT_TOKEN: Record<StatusTone, "success" | "warning" | "critical" | "info" | "textTertiary"> = {
  success: "success",
  warning: "warning",
  critical: "critical",
  info: "info",
  neutral: "textTertiary",
};

export const Pill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border-radius: ${RADIUS.pill}px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${ELEVATION.small};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${TYPE.body.fontSize}px;
  line-height: ${TYPE.body.lineHeight}px;
  font-weight: ${TYPE.body.fontWeight};
  white-space: nowrap;
`;

export const Dot = styled.span<{ $tone: StatusTone }>`
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: ${({ theme, $tone }) => theme.colors[DOT_TOKEN[$tone]]};
`;
