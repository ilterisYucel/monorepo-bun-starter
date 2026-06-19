import { Graphics } from "pixi.js";
import type { Point2D } from "../../types";
import type { CableBusConfig, CableBusPositions, FlowDirection } from "./CableBus.types";
import { drawCableBody, drawCableArrows, getCableColor } from "../Cable/Cable.drawers";

export function drawCables(
  g: Graphics,
  cfg: CableBusConfig,
  pos: CableBusPositions,
  flowDirection: FlowDirection,
  time: number,
): void {
  const { rackWidth, rackHeight, step } = cfg;
  const { racks, topBusY, bottomBusY, convergenceX, cbLeftMid } = pos;

  const firstRack = racks[0]!;
  const busLeftX = firstRack.x;
  const busRightX = convergenceX;
  const arrowSize = Math.max(4, step * 0.12);
  const thickness = Math.max(2.5, step * 0.1);
  const color = getCableColor();

  function cablePath(from: Point2D, to: Point2D): Point2D[] {
    return [from, to];
  }

  function lPath(cornerX: number, cornerY: number, from: Point2D, to: Point2D): Point2D[] {
    return [from, { x: cornerX, y: cornerY }, to];
  }

  // Top bus bar
  drawCableBody(g, cablePath({ x: busLeftX, y: topBusY }, { x: busRightX, y: topBusY }), color, thickness);
  // Bottom bus bar
  drawCableBody(g, cablePath({ x: busLeftX, y: bottomBusY }, { x: busRightX, y: bottomBusY }), color, thickness);

  // Convergence diagonal to CB
  const centerY = (topBusY + bottomBusY) / 2;
  drawCableBody(g, lPath(convergenceX, centerY, { x: convergenceX, y: topBusY }, cbLeftMid), color, thickness);
  drawCableBody(g, lPath(convergenceX, centerY, { x: convergenceX, y: bottomBusY }, cbLeftMid), color, thickness);

  // Vertical feeders
  for (const rack of racks) {
    const cx = rack.x + rackWidth / 2;
    drawCableBody(g, cablePath({ x: cx, y: rack.y }, { x: cx, y: topBusY }), color, thickness);
    drawCableBody(g, cablePath({ x: cx, y: rack.y + rackHeight }, { x: cx, y: bottomBusY }), color, thickness);
  }

  if (flowDirection === "idle") return;

  // Arrows on all segments
  drawCableArrows(g, cablePath({ x: busRightX, y: topBusY }, { x: busLeftX, y: topBusY }), flowDirection, time, arrowSize);
  drawCableArrows(g, cablePath({ x: busLeftX, y: bottomBusY }, { x: busRightX, y: bottomBusY }), flowDirection, time, arrowSize);
  drawCableArrows(g, lPath(convergenceX, centerY, { x: convergenceX, y: topBusY }, cbLeftMid), flowDirection, time, arrowSize);
  drawCableArrows(g, lPath(convergenceX, centerY, { x: convergenceX, y: bottomBusY }, cbLeftMid), flowDirection, time, arrowSize);

  for (const rack of racks) {
    const cx = rack.x + rackWidth / 2;
    drawCableArrows(g, cablePath({ x: cx, y: rack.y }, { x: cx, y: topBusY }), flowDirection, time, arrowSize);
    drawCableArrows(g, cablePath({ x: cx, y: rack.y + rackHeight }, { x: cx, y: bottomBusY }), flowDirection, time, arrowSize);
  }
}
