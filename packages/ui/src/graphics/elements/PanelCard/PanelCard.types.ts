import type { RectPosition } from "../../types";

export interface PanelSlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelCardProps {
  pos: RectPosition;
  panelTemp: number;
  panelHumidity?: number;
  config: { step: number };
  minimal?: boolean;
}
