import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const pulse = keyframes`
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.45; }
`;

export const Container = styled.div`
  background: #1f1f2e;
  padding: 16px;
`;

export const Skeleton = styled.div`
  animation: ${pulse} 1.8s ease-in-out infinite;
  background: #252535;
  border-radius: 12px;
`;

export const Title = styled.h4`
  margin: 0 0 4px 0;
  color: #e5e7eb;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
`;

export const Subtitle = styled.p`
  margin: 0 0 12px 0;
  color: #6b7280;
  font-size: 12px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
`;

export const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1f1f2e;
  border-radius: 12px;
  color: #6b7280;
`;

export const cartesianGrid = { stroke: "#252535", strokeDasharray: "4 4" };
export const xAxis = { stroke: "#4b5563", fontSize: 11, fill: "#9ca3af" };
export const yAxis = { stroke: "#4b5563", fontSize: 11, fill: "#9ca3af" };

export const DEFAULT_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899",
  "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#14b8a6", "#d946ef",
  "#0ea5e9", "#eab308", "#a855f7", "#22c55e",
];

// Legend table
export const LegendTable = styled.div`
  width: 100%;
  margin-top: 8px;
  font-size: 11px;
  color: #9ca3af;
`;

export const LegendHeader = styled.div`
  display: flex;
  border-bottom: 1px solid #2a2a3a;
  padding-bottom: 5px;
  margin-bottom: 4px;
  color: #6b7280;
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
  background: #1a1a2e;
  border: 1px solid #2a2a3a;
  border-radius: 10px;
  padding: 10px 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  min-width: 160px;
`;

export const TooltipTimestamp = styled.div`
  color: #f3f4f6;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
`;

export const TooltipDivider = styled.div`
  height: 1px;
  background: #2a2a3a;
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
  color: #d1d5db;
  font-size: 12px;
  flex: 1;
`;

export const TooltipValue = styled.span`
  color: #f3f4f6;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

export const TooltipEvent = styled.div<{ color: string }>`
  color: ${(p) => p.color};
  font-size: 11px;
  padding: 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
  cursor: default;
`;
