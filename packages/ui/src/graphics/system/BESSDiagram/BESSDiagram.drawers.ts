import { Graphics } from "pixi.js";
import { COLOR } from "../../../colors";
import { drawCableBody, getCableColor } from "../../elements/Cable/Cable.drawers";
import type { Point2D } from "../../types";

export function drawBusBar(
  g: Graphics,
  x: number,
  y: number,
  width: number,
  thickness: number,
): void {
  g.rect(x, y - thickness / 2, width, thickness);
  g.fill({ color: COLOR.cable, alpha: 0.6 });
  g.stroke({ width: 1, color: COLOR.cable, alpha: 0.3 });
}

export function drawContainerFrame(
  g: Graphics,
  w: number,
  h: number,
  pad: number,
  step: number,
): void {
  g.rect(pad, pad, w - pad * 2, h - pad * 2);
  g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.borderStroke, alpha: 0.25 });
  g.rect(pad + 2, pad + 2, w - pad * 2 - 4, h - pad * 2 - 4);
  g.stroke({ width: Math.max(0.3, step * 0.01), color: COLOR.borderStroke, alpha: 0.15 });
}
