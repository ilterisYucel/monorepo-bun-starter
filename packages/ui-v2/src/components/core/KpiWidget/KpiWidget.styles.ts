import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { COMPACT } from "../../../typography";
import type { StatusTone } from "../../primitives/StatusPill";

const DOT_TOKEN: Record<StatusTone, "success" | "warning" | "critical" | "info" | "textTertiary"> = {
  success: "success",
  warning: "warning",
  critical: "critical",
  info: "info",
  neutral: "textTertiary",
};

export const KpiCard = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 160px;
  min-height: 141px;
  padding: 14px;
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const LabelDot = styled.span<{ $tone: StatusTone }>`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex: none;
  background: ${({ theme, $tone }) => theme.colors[DOT_TOKEN[$tone]]};
`;

export const Label = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: ${COMPACT.label.fontWeight};
`;

export const ValueRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Value = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 24px;
  line-height: 25.2px;
  font-weight: 600;
  white-space: nowrap;
`;

export const UnitText = styled.span`
  color: ${({ theme }) => theme.colors.diagramMutedStrong};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: ${COMPACT.label.fontWeight};
`;

export const MinMax = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.diagramMutedStrong};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 400;
`;

export const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
`;

export const DetailLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 400;
`;

export const DetailValue = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-weight: 600;
`;

export const Track = styled.div`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

export const Fill = styled.span<{ $pct: number }>`
  display: block;
  height: 100%;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  background: ${({ theme }) => theme.colors.success};
`;

export const RadialWrap = styled.div<{ $tone: StatusTone }>`
  flex: none;
  width: 40px;
  height: 40px;
  color: ${({ theme, $tone }) => theme.colors[DOT_TOKEN[$tone]]};
`;
