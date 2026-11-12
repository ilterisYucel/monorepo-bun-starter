import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { COMPACT } from "../../../typography";
import type { RackTone } from "./ElectricalSingleLine.types";

/** Satır: rack 94 + drop 28 = bar 122; iki satır 172 aralıkla. */
export const ROW_HEIGHT = 172;
export const RACK_STRIP_LEFT = 53;
export const RACK_W = 68;
export const RACK_GAP = 6;
export const RACK_STRIP_WIDTH = 8 * RACK_W + 7 * RACK_GAP;
export const RIGHT_WIDTH = 360;
export const SIDE_WIDTH = 170;
export const BUS_TOP = 122;

const TEXT_TOKEN: Record<RackTone, "textSecondary" | "warningText" | "criticalText" | "textTertiary"> = {
  normal: "textSecondary",
  warning: "warningText",
  alarm: "criticalText",
  offline: "textTertiary",
};

const BORDER_TOKEN: Record<RackTone, "border" | "warning" | "critical" | "borderStrong"> = {
  normal: "border",
  warning: "warning",
  alarm: "critical",
  offline: "borderStrong",
};

export const Card = styled.section`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border-radius: ${RADIUS.xl}px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const Title = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.heading.fontSize}px;
  line-height: ${COMPACT.heading.lineHeight}px;
  font-weight: 600;
`;

export const InfoIcon = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.info};
`;

export const Diagram = styled.div`
  display: flex;
  gap: 0;
  overflow-x: auto;
`;

export const Rows = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: ${RACK_STRIP_LEFT + RACK_STRIP_WIDTH + RIGHT_WIDTH}px;
`;

export const BscRow = styled.div`
  position: relative;
  height: ${ROW_HEIGHT}px;
`;

// ---- BSC etiketi ----

export const BscLabel = styled.div`
  position: absolute;
  top: 3px;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 45px;
`;

export const BscName = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.heading.fontSize}px;
  line-height: ${COMPACT.heading.lineHeight}px;
  font-weight: 600;
`;

export const BscSub = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
`;

// ---- Rack kartı (68×94) ----

export const RackStrip = styled.div`
  position: absolute;
  top: 0;
  left: ${RACK_STRIP_LEFT}px;
  display: flex;
  gap: ${RACK_GAP}px;
  width: ${RACK_STRIP_WIDTH}px;
`;

export const Rack = styled.div<{ $tone: RackTone; $selected: boolean }>`
  box-sizing: border-box;
  display: flex;
  gap: 4px;
  width: ${RACK_W}px;
  height: 94px;
  padding: 5px;
  border-radius: 4px;
  border: ${({ $tone, $selected }) =>
    $tone === "normal"
      ? $selected
        ? "1.3px solid"
        : "1px solid"
      : $tone === "offline"
        ? "1.3px dashed"
        : "1.5px solid"};
  border-color: ${({ theme, $tone, $selected }) =>
    $selected ? theme.colors.info : theme.colors[BORDER_TOKEN[$tone]]};
  background: ${({ theme, $tone, $selected }) =>
    $tone === "offline"
      ? theme.colors.bgPage
      : $selected
        ? theme.colors.infoTint
        : theme.colors.surface};

  &[role="button"] {
    cursor: pointer;
  }
`;

export const RackBars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 6px;
  flex: none;
  padding-top: 2px;
`;

export const RackBar = styled.span<{ $tone: "base" | "alarm" | "minCell" | "selected" }>`
  width: 6px;
  height: 4px;
  border-radius: 1px;
  background: ${({ theme, $tone }) =>
    $tone === "alarm"
      ? `${theme.colors.critical}8C`
      : $tone === "minCell"
        ? `${theme.colors.info}80`
        : $tone === "selected"
          ? theme.colors.diagramMuted
          : theme.colors.border};
`;

export const RackText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
`;

export const RackId = styled.span<{ $tone: RackTone }>`
  color: ${({ theme, $tone }) => theme.colors[TEXT_TOKEN[$tone]]};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
  white-space: nowrap;
`;

export const RackSoc = styled.span<{ $tone: RackTone }>`
  color: ${({ theme, $tone }) =>
    $tone === "offline" ? theme.colors.textTertiary : theme.colors.textPrimary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
  white-space: nowrap;
`;

export const RackStat = styled.span<{ $tone: RackTone; $warn?: boolean }>`
  color: ${({ theme, $tone, $warn }) =>
    $tone === "offline"
      ? theme.colors.textTertiary
      : $warn
        ? theme.colors.warningText
        : theme.colors.textPrimary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 500;
  white-space: nowrap;
`;

// ---- Kablolar: drop + DC CB + junction + bar ----

export const Drops = styled.div`
  position: absolute;
  top: 94px;
  left: ${RACK_STRIP_LEFT}px;
  display: flex;
  gap: ${RACK_GAP}px;
  width: ${RACK_STRIP_WIDTH}px;
  height: 28px;
`;

export const DropColumn = styled.div`
  position: relative;
  width: ${RACK_W}px;
  height: 28px;
`;

export const DropLine = styled.span<{ $offline: boolean }>`
  position: absolute;
  left: 50%;
  top: 0;
  width: 1.5px;
  height: 100%;
  transform: translateX(-50%);
  background: ${({ theme, $offline }) =>
    $offline ? theme.colors.diagramMutedStrong : theme.colors.lineDiagram};
`;

export const DcCb = styled.span<{ $offline: boolean }>`
  position: absolute;
  left: 50%;
  top: 6px;
  width: 8px;
  height: 12px;
  box-sizing: border-box;
  transform: translateX(-50%);
  border-radius: 1.5px;
  border: 1.3px ${({ $offline }) => ($offline ? "dashed" : "solid")}
    ${({ theme, $offline }) =>
      $offline ? theme.colors.diagramMutedStrong : theme.colors.lineDiagram};
  background: ${({ theme, $offline }) =>
    $offline ? "transparent" : theme.colors.surface};
`;

export const Junction = styled.span<{ $offline: boolean }>`
  position: absolute;
  left: 50%;
  bottom: -3px;
  width: 6px;
  height: 6px;
  box-sizing: border-box;
  transform: translateX(-50%);
  border-radius: 999px;
  background: ${({ theme, $offline }) =>
    $offline ? theme.colors.borderStrong : theme.colors.lineDiagram};
`;

export const BusBar = styled.div<{ $left?: number }>`
  position: absolute;
  top: ${BUS_TOP}px;
  left: ${({ $left }) => $left ?? RACK_STRIP_LEFT}px;
  right: 0;
  height: 3px;
`;

export const BusBase = styled.span`
  position: absolute;
  inset: 0;
  height: 2px;
  top: 0.5px;
  background: ${({ theme }) => theme.colors.lineDiagram};
`;

export const BusActive = styled.span<{ $energized: boolean }>`
  position: absolute;
  inset: 0;
  background: ${({ theme, $energized }) =>
    $energized ? theme.colors.warning : "transparent"};
`;

export const BusLabel = styled.span`
  position: absolute;
  top: 128px;
  left: ${RACK_STRIP_LEFT + 33}px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.micro.fontSize}px;
  line-height: ${COMPACT.micro.lineHeight}px;
  font-weight: 600;
  white-space: nowrap;
`;

// ---- Sağ segment: CBM, PCS dairesi, yeşil CB, düğüm ----

export const RightSegment = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: ${RIGHT_WIDTH}px;
  height: ${ROW_HEIGHT}px;
`;

export const CbmBox = styled.div`
  position: absolute;
  left: 10px;
  top: 43px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  width: 96px;
  height: 62px;
  padding: 4px 5px;
  border-radius: 4px;
  border: 1.3px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

export const CbmTitle = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
  white-space: nowrap;
`;

export const CbmState = styled.span`
  color: ${({ theme }) => theme.colors.successText};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;

export const CbmValue = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 500;
  white-space: nowrap;
`;

/** IMD chip — DC CB kutusunun ÜZERİNDE (içinde değil). */
export const ImdChip = styled.span`
  position: absolute;
  left: 20px;
  top: 19px;
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: ${RADIUS.pill}px;
  background: ${({ theme }) => theme.colors.successTint};
  color: ${({ theme }) => theme.colors.successText};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
  white-space: nowrap;
`;

/** Kutu altından baraya dikey bağlantı. */
export const BoxConnector = styled.span`
  position: absolute;
  left: 30px;
  top: 105px;
  width: 2px;
  height: 17px;
  background: ${({ theme }) => theme.colors.lineDiagram};
`;

export const WireState = styled.span`
  position: absolute;
  left: 143px;
  top: 91px;
  color: ${({ theme }) => theme.colors.successText};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
`;

// ---- Satır başına AC BRK / CT ----

export const CbSquare = styled.span`
  position: absolute;
  top: 116px;
  width: 5px;
  height: 6px;
  border-radius: 1px;
  background: ${({ theme }) => theme.colors.lineDiagram};
`;

export const CtBox = styled.span`
  position: absolute;
  left: 303px;
  top: 114px;
  box-sizing: border-box;
  width: 12px;
  height: 13px;
  border-radius: 1.5px;
  border: 1.3px solid ${({ theme }) => theme.colors.lineDiagram};
  background: ${({ theme }) => theme.colors.surface};
`;

export const AcSmallLabel = styled.span`
  position: absolute;
  top: 132px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.micro.fontSize}px;
  line-height: ${COMPACT.micro.lineHeight}px;
  font-weight: 600;
  letter-spacing: 0.4px;
  white-space: nowrap;
`;

export const PcsGroup = styled.div`
  position: absolute;
  left: 160px;
  top: 81px;
  width: 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const PcsName = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
  text-transform: uppercase;
`;
export const PcsCircle = styled.div`
  position: relative;
  box-sizing: border-box;
  width: 54px;
  height: 54px;
  margin-top: 2px;
  border-radius: 999px;
  border: 2px solid ${({ theme }) => theme.colors.warning};
  background: ${({ theme }) => theme.colors.surface};

  svg {
    display: block;
  }
`;

export const PcsState = styled.span<{ $tone: "success" | "warning" | "critical" }>`
  margin-top: 4px;
  color: ${({ theme, $tone }) => theme.colors[`${$tone}Text`]};
  font-size: ${COMPACT.micro.fontSize}px;
  line-height: ${COMPACT.micro.lineHeight}px;
  font-weight: 600;
  letter-spacing: 0.4px;
  white-space: nowrap;
`;

export const PcsPower = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
  white-space: nowrap;
`;

export const GreenCb = styled.span`
  position: absolute;
  left: 282px;
  top: 116px;
  width: 12px;
  height: 12px;
  border-radius: 1.5px;
  background: ${({ theme }) => theme.colors.success};
`;

export const NodeDot = styled.span`
  position: absolute;
  left: 326px;
  top: 116px;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid ${({ theme }) => theme.colors.warning};
  background: ${({ theme }) => theme.colors.surface};
`;

// ---- Sağ kolon: trunk, AC BRK/CT, RMU ----

export const Side = styled.div`
  position: relative;
  width: ${SIDE_WIDTH}px;
  height: ${ROW_HEIGHT * 2}px;
  margin-left: -20px;
  flex: none;
`;

export const TrunkStack = styled.div`
  position: absolute;
  left: 20px;
  top: ${BUS_TOP - 1}px;
  width: 3px;
  height: ${ROW_HEIGHT + 1}px;
`;

export const TrunkBase = styled.span`
  position: absolute;
  left: 0.5px;
  top: 0;
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.colors.lineDiagram};
`;

export const TrunkActive = styled.span<{ $energized: boolean }>`
  position: absolute;
  inset: 0;
  background: ${({ theme, $energized }) =>
    $energized ? theme.colors.warning : "transparent"};
`;

export const AcStub = styled.div`
  position: absolute;
  left: 0;
  top: 206.5px;
  width: 56px;
  height: 3px;
`;

export const AcStubBase = styled.span`
  position: absolute;
  left: 0;
  top: 0.5px;
  width: 100%;
  height: 2px;
  background: ${({ theme }) => theme.colors.lineDiagram};
`;

export const AcStubActive = styled.span<{ $energized: boolean }>`
  position: absolute;
  inset: 0;
  background: ${({ theme, $energized }) =>
    $energized ? theme.colors.warning : "transparent"};
`;

export const AcCircles = styled.span`
  position: absolute;
  left: 18px;
  top: -12.5px;
  display: flex;
`;

export const AcCircle = styled.span`
  box-sizing: border-box;
  width: 26px;
  height: 28px;
  border-radius: 13px;
  border: 1.8px solid ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.surface};

  & + & {
    margin-left: -9px;
  }
`;

export const AcLabel = styled.span`
  position: absolute;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 500;
  white-space: nowrap;
`;

export const Rmu = styled.div`
  position: absolute;
  left: 56px;
  top: 162px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 109px;
  padding: 7px 6px;
  border-radius: ${RADIUS.lg}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgPage};
`;

export const RmuState = styled.span`
  color: ${({ theme }) => theme.colors.successText};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;

export const RmuTitle = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
  text-align: center;
`;

export const JunctionDot = styled.span`
  position: absolute;
  left: 14px;
  top: 204.5px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.lineDiagram};
`;

/** Kavşak ortası trafo verileri — stub altı, trunk solunda. */
export const Trafo = styled.div`
  position: absolute;
  left: -110px;
  top: 187px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100px;
  text-align: right;
`;

export const TrafoTitle = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
  white-space: nowrap;
`;

export const TrafoLine = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 500;
  white-space: nowrap;
`;

export const RmuLines = styled.span`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 400;
`;
