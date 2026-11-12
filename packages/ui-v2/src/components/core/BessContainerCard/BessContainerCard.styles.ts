import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { COMPACT } from "../../../typography";
import type { BessStatus } from "./BessContainerCard.types";

export const BORDER_TOKEN = {
  normal: "border",
  warning: "warning",
  alarm: "critical",
  maint: "maint",
} as const;

export const TEXT_TOKEN = {
  normal: "successText",
  warning: "warningText",
  alarm: "criticalText",
  maint: "maintText",
} as const;

export const CardShell = styled.div<{ $status: BessStatus; $width: number; $pad: string }>`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: ${({ $width }) => $width}px;
  gap: 4px;
  padding: ${({ $pad }) => $pad};
  border-radius: ${RADIUS.lg}px;
  background: ${({ theme }) => theme.colors.surface};
  border: ${({ theme, $status }) =>
    $status === "normal"
      ? `1px solid ${theme.colors.border}`
      : `1.5px solid ${theme.colors[BORDER_TOKEN[$status]]}`};
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const UnitId = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.heading.fontSize}px;
  line-height: ${COMPACT.heading.lineHeight}px;
  font-weight: ${COMPACT.heading.fontWeight};
`;

export const StateLabel = styled.span<{ $status: BessStatus }>`
  color: ${({ theme, $status }) => theme.colors[TEXT_TOKEN[$status]]};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: ${COMPACT.label.fontWeight};
  letter-spacing: 0.36px;
  text-transform: uppercase;
`;

export const Spacer = styled.span`
  flex: 1;
`;

export const PcsLabel = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.small.fontSize}px;
  line-height: ${COMPACT.small.lineHeight}px;
  font-weight: 500;
`;

export const BankRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 4px 8px;
  box-sizing: border-box;
  border-radius: 7px;
  background: ${({ theme }) => theme.colors.bgPage};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const BankLetter = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.title.fontSize}px;
  line-height: ${COMPACT.title.lineHeight}px;
  font-weight: 600;
`;

export const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const Reading = styled.span`
  color: ${({ theme }) => theme.colors.batteryValue};
  font-size: ${COMPACT.value.fontSize}px;
  line-height: ${COMPACT.value.lineHeight}px;
  font-weight: 700;
`;

export const Unit = styled.span`
  color: ${({ theme }) => theme.colors.batteryGlyph};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: ${COMPACT.label.fontWeight};
`;

export const BatteryGlyph = styled.span<{ $charging: boolean }>`
  position: relative;
  display: inline-block;
  width: 17px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid ${({ theme }) => theme.colors.batteryGlyph};
  background: ${({ theme }) => theme.colors.surface};
  margin-right: 4px;

  &::after {
    content: "";
    position: absolute;
    inset: 1.5px;
    border-radius: 2px;
    background: ${({ theme, $charging }) =>
      $charging ? theme.colors.batteryCharge : "transparent"};
  }
`;

export const BarTrack = styled.span`
  display: inline-block;
  width: 54px;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

export const BarFill = styled.span<{ $pct: number }>`
  display: block;
  height: 100%;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  background: ${({ theme }) => theme.colors.batteryCharge};
`;

// ---- V2 ----

export const V2Shell = styled(CardShell)`
  gap: 7px;
  padding: 8px 10px;
  border-radius: 10px;
`;

export const V2Header = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
`;

export const V2Dot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.batteryCharge};
`;

export const V2Banks = styled.div`
  display: flex;
  gap: 8px;
`;

export const V2Tile = styled.div`
  box-sizing: border-box;
  width: 140px;
  padding: 7px 9px;
  border-radius: 7px;
  background: ${({ theme }) => theme.colors.bgPage};
`;

export const V2TileHead = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.tiny.fontSize}px;
  line-height: ${COMPACT.tiny.lineHeight}px;
  font-weight: 500;
`;

export const V2SoC = styled.div`
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin: 4px 0;
`;

export const V2Value = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.reading.fontSize}px;
  line-height: ${COMPACT.reading.lineHeight}px;
  font-weight: 600;
`;

export const V2Foot = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.batteryValue};
  font-size: ${COMPACT.small.fontSize}px;
  line-height: ${COMPACT.small.lineHeight}px;
  font-weight: 500;
`;

// ---- V3 ----

export const V3Body = styled.div`
  display: flex;
  gap: 10px;
`;

export const V3Mini = styled.div`
  box-sizing: border-box;
  width: 89px;
  padding: 4px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.lineDiagram};
  background: ${({ theme }) => theme.colors.bgPage};
`;

export const V3MiniRow = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 3px;

  &:last-of-type {
    margin-bottom: 0;
  }
`;

export const V3Letter = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.tiny.fontSize}px;
  line-height: ${COMPACT.tiny.lineHeight}px;
  font-weight: 600;
  width: 8px;
`;

export const V3Cell = styled.span<{ $on: boolean }>`
  width: 7px;
  height: 11px;
  border-radius: 1.5px;
  background: ${({ theme, $on }) =>
    $on ? theme.colors.batteryCharge : theme.colors.diagramMuted};
  opacity: ${({ $on }) => ($on ? 0.55 : 1)};
`;

export const V3Footer = styled.div`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.tiny.fontSize}px;
  line-height: ${COMPACT.tiny.lineHeight}px;
  font-weight: 500;
  margin-top: 4px;
`;

export const OpenLink = styled.button`
  padding: 0;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.infoText};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
  cursor: pointer;
`;
