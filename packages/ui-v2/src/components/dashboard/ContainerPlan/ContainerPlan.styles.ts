import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { COMPACT } from "../../../typography";
import type { PlanDotTone } from "./ContainerPlan.types";

const DOT_TOKEN: Record<PlanDotTone, "success" | "warning" | "critical" | "borderStrong"> = {
  success: "success",
  warning: "warning",
  critical: "critical",
  neutral: "borderStrong",
};

export const PlanCard = styled.section`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border-radius: ${RADIUS.xl}px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const Head = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.heading.fontSize}px;
  line-height: ${COMPACT.heading.lineHeight}px;
  font-weight: 600;
`;

export const Body = styled.div`
  display: flex;
  gap: 10px;
`;

export const PanelCard = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 190px;
  padding: 8px;
  border-radius: ${RADIUS.lg}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgPage};
`;

export const PanelTitle = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.heading.fontSize}px;
  line-height: ${COMPACT.heading.lineHeight}px;
  font-weight: 600;
`;

export const PanelSub = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
`;

export const TempLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

export const Temp = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 26px;
  line-height: 31.2px;
  font-weight: 600;
`;

export const Unit = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const Scale = styled.div`
  position: relative;
  height: 14px;
  width: 100%;
`;

export const ScaleTrack = styled.span`
  position: absolute;
  top: 4.3px;
  left: 0;
  right: 0;
  height: 5px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.border};
`;

export const ScaleFill = styled.span<{ $pct: number }>`
  position: absolute;
  top: 4px;
  left: 0;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.success};
  opacity: 0.78;
`;

export const ScaleMark = styled.span<{ $pct: number }>`
  position: absolute;
  top: 0;
  left: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  width: 2.5px;
  height: 14px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.inverse};
`;

export const PanelFoot = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 500;
`;

export const Rooms = styled.div`
  box-sizing: border-box;
  display: flex;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 8px;
  border-radius: ${RADIUS.lg}px;
`;

export const RoomCard = styled.div<{ $overTemp: boolean }>`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 8px;
  border-radius: ${RADIUS.lg}px;
  background: ${({ theme }) => theme.colors.surface};
  border: ${({ theme, $overTemp }) =>
    $overTemp ? `1.5px solid ${theme.colors.warning}` : `1px solid ${theme.colors.border}`};
`;

export const RoomHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const RoomName = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;

export const RoomRange = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
`;

export const Dots = styled.span`
  display: inline-flex;
  gap: 4px;
  margin-left: auto;
`;

export const Dot = styled.span<{ $tone: PlanDotTone }>`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: ${({ theme, $tone }) => theme.colors[DOT_TOKEN[$tone]]};
`;

export const Readings = styled.div`
  display: flex;
  gap: 10px;
`;

export const Reading = styled.span<{ $tone: "info" | "critical" }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 500;

  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 2px;
    background: ${({ theme, $tone }) => theme.colors[$tone]};
  }
`;

export const ChipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
`;

export const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 20px;
  padding: 0 8px;
  border-radius: ${RADIUS.pill}px;
  background: ${({ theme }) => theme.colors.infoTint};
  color: ${({ theme }) => theme.colors.infoText};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
  white-space: nowrap;

  &::before {
    content: "";
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.info};
  }
`;

export const Humidity = styled.span`
  margin-left: auto;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 500;
`;

export const OverTemp = styled.span`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: ${RADIUS.pill}px;
  background: ${({ theme }) => theme.colors.warningTint};
  color: ${({ theme }) => theme.colors.warningText};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
  letter-spacing: 0.4px;
`;
