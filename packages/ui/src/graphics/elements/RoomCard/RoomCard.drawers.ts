import { Graphics, FillGradient } from "pixi.js";
import type { RoomCardPosition } from "../../types";
import { COLOR } from "../../../colors";

let _roomBodyGrad: FillGradient | null = null;
const _roomTempGrads = new Map<number, FillGradient>();

function roomBodyGrad(): FillGradient {
  _roomBodyGrad ??= new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: COLOR.gradMid2 },
      { offset: 1, color: COLOR.gradLow },
    ],
    textureSpace: "local",
  });
  return _roomBodyGrad;
}

function roomTempGrad(color: number): FillGradient {
  if (!_roomTempGrads.has(color)) {
    _roomTempGrads.set(color, new FillGradient({
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
  return _roomTempGrads.get(color)!;
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

export function drawRoomBody(
  g: Graphics,
  pos: RoomCardPosition,
  cfg: { step: number },
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const r = step * 0.3;

  g.roundRect(x + step * 0.06, y + step * 0.1, w, h, r);
  g.fill({ color: COLOR.shadow, alpha: 0.2 });

  g.roundRect(x, y, w, h, r);
  g.fill(roomBodyGrad());
  g.stroke({ width: Math.max(1, step * 0.04), color: COLOR.info });

  const slotPad = step * 0.2;
  g.roundRect(x + slotPad, y + h - step * 1.8, w - slotPad * 2, step * 1.6, step * 0.15);
  g.fill({ color: COLOR.gradScreen, alpha: 0.5 });
  g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.borderStroke, alpha: 0.5 });
}

export function drawRoomTemp(
  g: Graphics,
  pos: RoomCardPosition,
  temp: number,
  cfg: { step: number },
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const r = step * 0.3;

  const color = tempColor(temp);

  const barW = step * 0.35;
  const tNorm = Math.min(1, Math.max(0, temp / 50));
  const barH = (h - step * 2.9) * tNorm;
  const barY = y + h - step * 2.8 - barH;

  g.roundRect(x + step * 0.08, barY, barW, Math.max(barH, step * 0.3), step * 0.1);
  g.fill(roomTempGrad(color));
}

export function drawRoomTempBorder(
  g: Graphics,
  pos: RoomCardPosition,
  cfg: { step: number },
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;

  g.roundRect(x + step * 0.06, y + step * 0.1, step * 0.45, h - step * 2.9, step * 0.1);
  g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.borderStroke, alpha: 0.5 });
}
