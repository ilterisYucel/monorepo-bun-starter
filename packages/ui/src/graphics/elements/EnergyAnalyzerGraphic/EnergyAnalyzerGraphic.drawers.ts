import { Graphics, FillGradient } from "pixi.js";
import { COLOR } from "../../../colors";
import type { EnergyAnalyzerData, EnergyAnalyzerGraphicConfig } from "./EnergyAnalyzerGraphic.types";

let _eaBodyGrad: FillGradient | null = null;

function eaBodyGrad(): FillGradient {
  _eaBodyGrad ??= new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: COLOR.gradPanelTop },
      { offset: 1, color: COLOR.gradBodyBot },
    ],
    textureSpace: "local",
  });
  return _eaBodyGrad;
}

export function drawEABody(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  cfg: EnergyAnalyzerGraphicConfig,
): void {
  const { step } = cfg;
  const r = step * 0.2;

  g.roundRect(x, y, w, h, r);
  g.fill(eaBodyGrad());
  g.stroke({ width: Math.max(1, step * 0.05), color: COLOR.borderStroke, alpha: 0.5 });

  g.roundRect(x + step * 0.06, y + step * 0.06, w - step * 0.12, h - step * 0.12, r * 0.8);
  g.fill({ color: COLOR.gradScreen, alpha: 0.3 });
}

export function drawLCDScreen(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  step: number,
): void {
  const r = step * 0.08;

  g.roundRect(x, y, w, h, r);
  g.fill({ color: COLOR.gradScreen, alpha: 0.95 });
  g.stroke({ width: Math.max(0.5, step * 0.025), color: COLOR.borderStroke, alpha: 0.5 });

  const scanlineCount = Math.floor(h / (step * 0.08));
  for (let i = 0; i < scanlineCount; i++) {
    const sy = y + i * step * 0.08;
    g.rect(x + step * 0.05, sy, w - step * 0.1, step * 0.02);
    g.fill({ color: COLOR.textWhite, alpha: 0.02 });
  }
}

export function drawLabelBox(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor: number,
  borderAlpha: number,
  step: number,
): void {
  const r = step * 0.05;
  g.roundRect(x, y, w, h, r);
  g.fill({ color: COLOR.gradScreen, alpha: 0.85 });
  g.stroke({ width: Math.max(0.3, step * 0.012), color: borderColor, alpha: borderAlpha });
}

const ROW_LABELS = [
  { label: "V", unit: "V" },
  { label: "I", unit: "A" },
  { label: "P", unit: "kW" },
  { label: "E", unit: "kWh" },
] as const;

export { ROW_LABELS };
