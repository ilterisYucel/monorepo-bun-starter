import { Graphics, FillGradient } from "pixi.js";
import type { RectPosition } from "../../types";
import { COLOR } from "../../../colors";

function tempColor(temp: number): number {
  if (temp < 0) return COLOR.tempCold;
  if (temp < 10) return COLOR.info;
  if (temp < 20) return COLOR.tempChilly;
  if (temp < 25) return COLOR.success;
  if (temp < 30) return COLOR.warning;
  if (temp < 35) return COLOR.error;
  return COLOR.tempHot;
}

export function drawPanelBody(
  g: Graphics,
  pos: RectPosition,
  cfg: { step: number },
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const r = step * 0.3;

  g.roundRect(x + step * 0.06, y + step * 0.1, w, h, r);
  g.fill({ color: COLOR.shadow, alpha: 0.2 });

  const bg = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: COLOR.gradPanelTop },
      { offset: 1, color: COLOR.bgPanel },
    ],
    textureSpace: "local",
  });

  g.roundRect(x, y, w, h, r);
  g.fill(bg);
  g.stroke({ width: Math.max(1, step * 0.04), color: COLOR.borderStroke });
}

export function drawPanelTemp(
  g: Graphics,
  pos: RectPosition,
  panelTemp: number,
  cfg: { step: number },
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const color = tempColor(panelTemp);

  const innerPad = step * 0.2;
  const innerH = h - step * 3.2;
  const innerY = y + step * 2.2;

  const tempNorm = Math.min(1, Math.max(0, panelTemp / 50));
  const fillH = innerH * tempNorm;
  const fillY = innerY + (innerH - fillH);

  const grad = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: color },
      { offset: 1, color: COLOR.tempCold },
    ],
    textureSpace: "local",
  });

  g.roundRect(x + innerPad, fillY, w - innerPad * 2, Math.max(fillH, step * 0.3), step * 0.15);
  g.fill(grad);
  g.stroke({ width: Math.max(0.5, step * 0.02), color, alpha: 0.4 });
}
