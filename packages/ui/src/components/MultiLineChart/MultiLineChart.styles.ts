import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { COLORS } from "../../colors";

const pulse = keyframes`
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.45; }
`;

export const Container = styled.div`
  background: ${COLORS.bgPopup};
  padding: 16px;
`;

export const Skeleton = styled.div`
  animation: ${pulse} 1.8s ease-in-out infinite;
  background: ${COLORS.bgSkeleton};
  border-radius: 12px;
`;

export const Title = styled.h4`
  margin: 0 0 4px 0;
  color: ${COLORS.textPrimary};
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
`;

export const Subtitle = styled.p`
  margin: 0 0 12px 0;
  color: ${COLORS.textDisabled};
  font-size: 12px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
`;

export const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${COLORS.bgPopup};
  border-radius: 12px;
  color: ${COLORS.textDisabled};
`;

export const cartesianGrid = { stroke: COLORS.bgSkeleton, strokeDasharray: "4 4" };
export const xAxis = { stroke: COLORS.dcIdleEdge, fontSize: 11, fill: COLORS.textMuted };
export const yAxis = { stroke: COLORS.dcIdleEdge, fontSize: 11, fill: COLORS.textMuted };

export const DEFAULT_COLORS = [
  COLORS.info, COLORS.error, COLORS.success, COLORS.warning, COLORS.chart5, COLORS.chart6,
  COLORS.chart7, COLORS.chart8, COLORS.chart9, COLORS.chart10, COLORS.chart11, COLORS.chart12,
  COLORS.chart13, COLORS.chart14, COLORS.chart15, COLORS.chart16,
];

// Legend table
export const LegendTable = styled.div`
  width: 100%;
  margin-top: 8px;
  font-size: 11px;
  color: ${COLORS.textMuted};
`;

export const LegendHeader = styled.div`
  display: flex;
  border-bottom: 1px solid ${COLORS.borderDefault};
  padding-bottom: 5px;
  margin-bottom: 4px;
  color: ${COLORS.textDisabled};
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const LegendRow = styled.div`
  display: flex;
  padding: 1px 0;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

export const LegendCell = styled.div<{ flex?: number; align?: string }>`
  flex: ${(p) => p.flex ?? 1};
  text-align: ${(p) => p.align ?? "left"};
  font-variant-numeric: tabular-nums;
  padding: 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  ${(p) => p.align === "right" && "justify-content: flex-end;"}
`;

export const LegendColor = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-right: 6px;
`;

// Tooltip
export const TooltipWrapper = styled.div`
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 10px;
  padding: 10px 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  min-width: 160px;
`;

export const TooltipTimestamp = styled.div`
  color: ${COLORS.textNearWhite};
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
`;

export const TooltipDivider = styled.div`
  height: 1px;
  background: ${COLORS.borderDefault};
  margin: 0 0 6px 0;
`;

export const TooltipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
`;

export const TooltipColorDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
`;

export const TooltipName = styled.span`
  color: ${COLORS.textLight};
  font-size: 12px;
  flex: 1;
`;

export const TooltipValue = styled.span`
  color: ${COLORS.textNearWhite};
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

export const TooltipEvent = styled.div<{ color: string }>`
  color: ${(p) => p.color};
  font-size: 11px;
  padding: 2px 0;
  max-width: 220px;
  word-wrap: break-word;
  white-space: normal;
  cursor: default;
`;
