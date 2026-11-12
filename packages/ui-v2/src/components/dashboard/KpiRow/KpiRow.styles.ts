import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { COMPACT } from "../../../typography";
import type { KpiBarTone, KpiValueSize } from "./KpiRow.types";

const TONE_TOKEN: Record<KpiBarTone, "success" | "warning" | "critical" | "info" | "textPrimary"> = {
  success: "success",
  warning: "warning",
  critical: "critical",
  info: "info",
  neutral: "textPrimary",
};

/** Değer rengi metin tonu kullanır (solid değil), bar dolgusu solid. */
const VALUE_TOKEN: Record<KpiBarTone, "successText" | "warningText" | "criticalText" | "infoText" | "textPrimary"> = {
  success: "successText",
  warning: "warningText",
  critical: "criticalText",
  info: "infoText",
  neutral: "textPrimary",
};

export const Row = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
`;

export const Card = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
  height: 119px;
  padding: 12px 14px;
  border-radius: ${RADIUS.xl}px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const Label = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ValueLine = styled.div<{ $tone?: KpiBarTone }>`
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: ${({ theme, $tone }) => theme.colors[VALUE_TOKEN[$tone ?? "neutral"]]};
`;

export const Value = styled.span<{ $size: KpiValueSize }>`
  font-size: ${({ $size }) => ($size === "compact" ? COMPACT.title.fontSize : COMPACT.kpiM.fontSize)}px;
  line-height: ${({ $size }) =>
    $size === "compact" ? COMPACT.title.lineHeight : COMPACT.kpiM.lineHeight}px;
  font-weight: 600;
  white-space: nowrap;
`;

export const Unit = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const Bars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: auto;
`;

export const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 16px;
`;

export const BarLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;

export const Track = styled.span`
  display: block;
  flex: 1;
  width: 100%;
  height: 6px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

export const Fill = styled.span<{ $pct: number; $tone: KpiBarTone }>`
  display: block;
  height: 100%;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  border-radius: 3px;
  background: ${({ theme, $tone }) => theme.colors[TONE_TOKEN[$tone]]};
`;

export const Kv = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
`;

export const KvRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 16px;
`;

export const KvLabel = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const KvValue = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;

export const TrackOnly = styled.div`
  margin-top: auto;
`;

export const Caption = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const Band = styled.div`
  position: relative;
  height: 14px;
  margin-top: auto;
`;

export const BandTrack = styled.span`
  position: absolute;
  top: 4px;
  left: 0;
  right: 0;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.border};
`;

export const BandSegment = styled.span<{ $start: number; $width: number }>`
  position: absolute;
  top: 4px;
  left: ${({ $start }) => `${Math.max(0, Math.min(100, $start))}%`};
  width: ${({ $width }) => `${Math.max(0, Math.min(100, $width))}%`};
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.success};
  opacity: 0.45;
`;

export const BandMarker = styled.span<{ $pct: number; $tone: "info" | "critical" }>`
  position: absolute;
  top: 2px;
  left: ${({ $pct }) => `${Math.max(0, Math.min(100, $pct))}%`};
  width: 9px;
  height: 8px;
  border-radius: 1.5px;
  border: 1.5px solid ${({ theme }) => theme.colors.surface};
  background: ${({ theme, $tone }) => theme.colors[$tone]};
`;
