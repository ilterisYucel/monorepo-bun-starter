import type { RectPosition, HvacData } from "../../types";

export interface HvacUnitProps {
  hvac: HvacData;
  pos: RectPosition;
  config: { step: number };
}
