import { Graphics, FillGradient } from "pixi.js";
import { COLOR } from "../../../colors";
import type { RectPosition, HvacData } from "../../types";

export function drawHvacBody(
  g: Graphics,
  pos: RectPosition,
  hvac: HvacData,
  cfg: { step: number },
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const r = step * 0.15;

  const isOnline = hvac.status === "online";
  const borderColor = isOnline ? COLOR.success : COLOR.error;

  let fillColor: number;
  if (isOnline) {
    fillColor = hvac.mode === "cooling" ? COLOR.info : hvac.mode === "warming" ? COLOR.warning : COLOR.idle;
  } else {
    fillColor = COLOR.idle;
  }

  const bg = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: COLOR.gradMid },
      { offset: 1, color: COLOR.gradBodyBot },
    ],
    textureSpace: "local",
  });

  g.roundRect(x, y, w, h, r);
  g.fill(bg);
  g.stroke({ width: Math.max(1, step * 0.04), color: borderColor });

  g.roundRect(x + step * 0.08, y + step * 0.08, w - step * 0.16, h - step * 0.16, r * 0.5);
  g.fill({ color: fillColor, alpha: 0.25 });

  const dotR = Math.max(2, step * 0.06);
  g.circle(x + w - dotR * 2, y + dotR * 2, dotR);
  g.fill(isOnline ? COLOR.success : COLOR.error);
}

export function drawHvacAnim(
  g: Graphics,
  pos: RectPosition,
  hvac: HvacData,
  cfg: { step: number },
  time: number,
): void {
  if (hvac.status !== "online" || hvac.mode === "idle") return;

  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const isCooling = hvac.mode === "cooling";
  const color = isCooling ? COLOR.info : COLOR.warning;

  const glowAlpha = 0.1 + Math.sin(time * 4.0) * 0.08;
  const glowW = step * 0.05 * (1 + Math.sin(time * 4.0) * 0.4);
  g.roundRect(x - glowW, y - glowW, w + glowW * 2, h + glowW * 2, step * 0.2);
  g.stroke({ width: glowW, color, alpha: glowAlpha });

  const arrowSize = Math.max(4, step * 0.1);
  const cx = x + w / 2;
  const arrowAreaTop = y - step * 0.5;
  const arrowAreaBot = y;
  const areaH = arrowAreaBot - arrowAreaTop;
  const progress = (time % 2.5) / 2.5;

  for (let i = 0; i < 3; i++) {
    const phase = i * 0.33;
    const raw = (progress + phase) % 1;
    const offset = isCooling ? 1 - raw : raw;
    const ay = arrowAreaTop + areaH * offset;

    g.moveTo(cx, ay + (isCooling ? arrowSize : -arrowSize));
    g.lineTo(cx - arrowSize * 0.6, ay);
    g.lineTo(cx + arrowSize * 0.6, ay);
    g.closePath();
    g.fill({ color, alpha: 0.4 + raw * 0.4 });
  }
}
