import { Graphics, FillGradient } from "pixi.js";
import type { RectPosition } from "../../types";

function tempColor(temp: number): number {
  if (temp < 0) return 0x1e40af;
  if (temp < 10) return 0x3b82f6;
  if (temp < 20) return 0x06b6d4;
  if (temp < 25) return 0x10b981;
  if (temp < 30) return 0xf59e0b;
  if (temp < 35) return 0xef4444;
  return 0xdc2626;
}

const PANEL_BG = 0x16162a;
const PANEL_BORDER = 0x3d3d5e;

export function drawPanelBody(
  g: Graphics,
  pos: RectPosition,
  cfg: { step: number },
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const r = step * 0.3;

  g.roundRect(x + step * 0.06, y + step * 0.1, w, h, r);
  g.fill({ color: 0x000000, alpha: 0.2 });

  const bg = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: 0x1a1a32 },
      { offset: 1, color: PANEL_BG },
    ],
    textureSpace: "local",
  });

  g.roundRect(x, y, w, h, r);
  g.fill(bg);
  g.stroke({ width: Math.max(1, step * 0.04), color: PANEL_BORDER });
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
      { offset: 1, color: 0x1e40af },
    ],
    textureSpace: "local",
  });

  g.roundRect(x + innerPad, fillY, w - innerPad * 2, Math.max(fillH, step * 0.3), step * 0.15);
  g.fill(grad);
  g.stroke({ width: Math.max(0.5, step * 0.02), color, alpha: 0.4 });
}
