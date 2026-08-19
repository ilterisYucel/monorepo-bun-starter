import { Graphics, FillGradient } from "pixi.js";
import type { RectPosition } from "../../types";
import type { PanelSlotRect } from "./PanelCard.types";
import { COLOR } from "../../../colors";

let _panelTempGrads = new Map<number, FillGradient>();

function panelTempGrad(color: number): FillGradient {
  if (!_panelTempGrads.has(color)) {
    _panelTempGrads.set(color, new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color },
        { offset: 1, color: COLOR.tempCold },
      ],
      textureSpace: "local",
    }));
  }
  return _panelTempGrads.get(color)!;
}

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

  // PANELSIZ: yalnız ince çerçeve — sıcaklık barı yuvası kod tarafında.
  g.roundRect(x, y, w, h, r);
  g.stroke({ width: Math.max(1, step * 0.04), color: COLOR.borderStroke });
}

// Sıcaklık barı yuvası (nötr): çizim modunda ve Base story'de kullanılır.
// Termometre SOL ÜSTTE — oda kartındaki widget ile aynı geometri.
export function drawPanelBarSlot(
  g: Graphics,
  pos: RectPosition,
  cfg: { step: number },
  slotOverride?: PanelSlotRect,
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const slot = slotOverride ?? {
    x: x + step * 0.1,
    y: y + step * 0.12,
    width: step * 0.5,
    height: step * 1.6,
  };

  g.roundRect(slot.x, slot.y, slot.width, slot.height, step * 0.15);
  g.fill({ color: COLOR.gradScreen, alpha: 0.35 });
  g.stroke({ width: Math.max(1, step * 0.03), color: COLOR.borderStroke, alpha: 0.8 });
}

// Termometre yuva çerçevesi (sprite modu): sol üstte görünür tüp.
export function drawPanelTempBorder(
  g: Graphics,
  pos: RectPosition,
  cfg: { step: number },
): void {
  const { step } = cfg;
  const { x, y } = pos;

  g.roundRect(x + step * 0.1, y + step * 0.12, step * 0.5, step * 1.6, step * 0.15);
  g.fill({ color: COLOR.gradScreen, alpha: 0.35 });
  g.stroke({ width: Math.max(1, step * 0.03), color: COLOR.borderStroke, alpha: 0.8 });
}

export function drawPanelTemp(
  g: Graphics,
  pos: RectPosition,
  panelTemp: number,
  cfg: { step: number },
  slotOverride?: PanelSlotRect,
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const color = tempColor(panelTemp);

  const slot = slotOverride ?? {
    x: x + step * 0.1,
    y: y + step * 0.12,
    width: step * 0.5,
    height: step * 1.6,
  };
  const pad = slotOverride ? step * 0.06 : step * 0.1;
  const innerH = slot.height - pad * 2;
  const innerY = slot.y + pad;

  const tempNorm = Math.min(1, Math.max(0, panelTemp / 50));
  const fillH = innerH * tempNorm;
  const fillY = innerY + (innerH - fillH);

  g.roundRect(slot.x + pad, fillY, slot.width - pad * 2, Math.max(fillH, step * 0.3), step * 0.1);
  g.fill(panelTempGrad(color));
  g.stroke({ width: Math.max(0.5, step * 0.02), color, alpha: 0.4 });

  // Parlak üst kenar
  if (fillH > step * 0.4) {
    g.roundRect(slot.x + pad, fillY - step * 0.03, slot.width - pad * 2, step * 0.06, step * 0.03);
    g.fill({ color: color, alpha: 0.9 });
  }
}
