import { Graphics, FillGradient } from "pixi.js";
import type { RoomData, RoomPosition, StepConfig } from "../../components/TMSGraphic/TMSGraphic.types";

const GLASS_BG = 0x14142a;
const GLASS_BORDER = 0x3b82f6;

function tempColor(temp: number): number {
  if (temp < 0) return 0x1e40af;
  if (temp < 10) return 0x3b82f6;
  if (temp < 20) return 0x06b6d4;
  if (temp < 25) return 0x10b981;
  if (temp < 30) return 0xf59e0b;
  if (temp < 35) return 0xef4444;
  return 0xdc2626;
}

export function drawRoomBody(
  g: Graphics,
  pos: RoomPosition,
  cfg: StepConfig,
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const r = step * 0.3;

  // Shadow
  g.roundRect(x + step * 0.06, y + step * 0.1, w, h, r);
  g.fill({ color: 0x000000, alpha: 0.2 });

  // Glass card body
  const bg = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: 0x1a1a3a },
      { offset: 1, color: 0x10102a },
    ],
    textureSpace: "local",
  });

  g.roundRect(x, y, w, h, r);
  g.fill(bg);
  g.stroke({ width: Math.max(1, step * 0.04), color: GLASS_BORDER });

  // HVAC slots at bottom
  const slotPad = step * 0.2;
  g.roundRect(x + slotPad, y + h - step * 1.8, w - slotPad * 2, step * 1.6, step * 0.15);
  g.fill({ color: 0x0a0a1a, alpha: 0.5 });
  g.stroke({ width: Math.max(0.5, step * 0.02), color: 0x3d3d5e, alpha: 0.5 });
}

export function drawRoomTemp(
  g: Graphics,
  pos: RoomPosition,
  temp: number,
  cfg: StepConfig,
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const r = step * 0.3;

  const color = tempColor(temp);

  // Temperature bar (left edge)
  const barW = step * 0.35;
  const tNorm = Math.min(1, Math.max(0, temp / 50));
  const barH = (h - step * 2.4) * tNorm;
  const barY = y + h - step * 2.2 - barH;

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

  g.roundRect(x + step * 0.25, barY, barW, Math.max(barH, step * 0.3), step * 0.1);
  g.fill(grad);
}

export function drawRoomTempBorder(
  g: Graphics,
  pos: RoomPosition,
  cfg: StepConfig,
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;

  // Temp bar track
  g.roundRect(x + step * 0.2, y + step * 0.5, step * 0.45, h - step * 2.9, step * 0.1);
  g.stroke({ width: Math.max(0.5, step * 0.02), color: 0x3d3d5e, alpha: 0.5 });
}
