import type { FlowDirection, Point2D } from "../../types";

export interface CableProps {
  path: Point2D[];
  flowDirection: FlowDirection;
  step: number;
  color?: number;
}
