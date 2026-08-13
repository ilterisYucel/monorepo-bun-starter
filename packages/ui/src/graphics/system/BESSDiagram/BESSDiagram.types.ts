import type { RoomData } from "../../types";
import type { ChargeStatus } from "@gd-monorepo/shared-types";
import type { EnergyAnalyzerData } from "../../elements/EnergyAnalyzerGraphic/EnergyAnalyzerGraphic.types";
import type { FirePanelData } from "../../elements/FirePanel/FirePanel.types";

export interface BSCUnitWithSummary {
  deviceId: string;
  racks: any[];
  breakerStatus?: "online" | "offline";
  breakerPosition?: "open" | "close";
  dcOutput?: {
    status: "online" | "offline";
    voltage: number;
    current: number;
  };
  systemSummary?: {
    avgSoC: number;
    avgSoH: number;
    avgVoltage: number;
    avgCurrent: number;
    avgPower: number;
    onlineRackCount: number;
    totalRackCount: number;
  };
}

export interface BESSDiagramProps {
  bscUnits: BSCUnitWithSummary[];
  flowDirection: ChargeStatus;
  hvacRooms: RoomData[];
  panelTemp: number;
  panelHumidity?: number;
  energyAnalyzer: EnergyAnalyzerData;
  firePanel: FirePanelData;
  width?: number | string;
  height?: number;
}

export interface BESSConfig {
  step: number;
  hStep: number;
  summaryBarHeight: number;
  topCardFlowW: number;
  topCardEaW: number;
  topCardFireW: number;
  rightBusX: number;
  eaStartX: number;
  eaY: number;
  eaWidth: number;
  eaHeight: number;
  gridStartX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  bscStartX: number;
  bscStartY: number;
  rackWidth: number;
  rackHeight: number;
  rackGap: number;
  cbLength: number;
  dcRadius: number;
  hvacStartY: number;
  roomWidth: number;
  roomHeight: number;
  fireStartX: number;
  fireY: number;
  fireWidth: number;
  fireHeight: number;
  panelWidth: number;
  panelGap: number;
  totalHeight: number;
}

export interface BSCLayout {
  startX: number;
  startY: number;
  totalWidth: number;
}
