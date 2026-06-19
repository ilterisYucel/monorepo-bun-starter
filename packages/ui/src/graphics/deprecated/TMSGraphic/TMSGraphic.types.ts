export interface HvacData {
  status: "online" | "offline";
  mode: "cooling" | "warming" | "idle";
}

export interface RoomData {
  temp: number;
  hvacs: [HvacData, HvacData];
}

export interface TMSGraphicProps {
  rooms: RoomData[];
  panel_temp: number;
  status?: "online" | "offline";
  width?: number | string;
  bordered?: boolean;
  showRefresh?: boolean;
}

export interface StepConfig {
  step: number;
  panelWidth: number;
  roomWidth: number;
  roomHeight: number;
  startX: number;
  startY: number;
}

export interface RectPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoomPosition {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hvac1: RectPosition;
  hvac2: RectPosition;
}

export interface TMSLayout {
  step: number;
  panel: RectPosition;
  rooms: RoomPosition[];
}
