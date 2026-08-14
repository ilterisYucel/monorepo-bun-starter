import type { BSCUnit } from "../../deprecated/BSCGraphic/BSCGraphic.types";
import type { RoomData } from "../../types";
import type { ChargeStatus } from "@gd-monorepo/shared-types";

export interface DashboardSCADAProps {
  bscUnits: BSCUnit[];
  flowDirection: ChargeStatus;
  hvacRooms: RoomData[];
  panelTemp: number;
  panelHumidity?: number;
  energyFrequency?: number;
  energyTotalPower?: number;
  energyDelivered?: number;
  fireAlarmActive?: boolean;
  fireFaultActive?: boolean;
  width?: number | string;
}

export interface SCADAStepConfig {
  step: number;
  rackWidth: number;
  rackHeight: number;
  rackGap: number;
  outputRadius: number;
  bscStartX: number;
  bscStartY: number;
  cbLength: number;
  summaryHeight: number;
  roomWidth: number;
  roomHeight: number;
  hvacStartY: number;
  panelWidth: number;
  panelGap: number;
  terminalStartY: number;
  terminalHeight: number;
  totalHeight: number;
}
