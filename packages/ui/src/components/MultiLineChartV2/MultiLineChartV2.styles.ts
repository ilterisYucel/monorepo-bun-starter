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

export const uPlotContainerStyle: React.CSSProperties = {
  width: "100%",
  position: "relative",
};

export const tooltipStyle: React.CSSProperties = {
  position: "absolute",
  background: COLORS.bgCard,
  border: `1px solid ${COLORS.borderDefault}`,
  borderRadius: "10px",
  padding: "10px 14px",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
  minWidth: "160px",
  zIndex: 20,
  pointerEvents: "none",
  fontSize: "12px",
};
