import { Graphics, FillGradient } from "pixi.js";
import type { BreakerBusLayout } from "../../types";
import { COLOR } from "../../../colors";

let _breakerBodyGrad: FillGradient | null = null;

function breakerBodyGrad(): FillGradient {
  _breakerBodyGrad ??= new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: COLOR.gradMid },
      { offset: 1, color: COLOR.gradBodyBot },
    ],
    textureSpace: "local",
  });
  return _breakerBodyGrad;
}

function statusColor(
  breakerStatus: "online" | "offline",
  breakerPosition: "open" | "close",
): { fill: number; stroke: number } {
  if (breakerStatus === "online") {
    return breakerPosition === "close"
      ? { fill: COLOR.success, stroke: COLOR.successGlow }
      : { fill: COLOR.warning, stroke: COLOR.warningGlow };
  }
  return { fill: COLOR.error, stroke: COLOR.errorStroke };
}

export function drawBreakerBody(
  g: Graphics,
  cfg: { step: number },
  pos: BreakerBusLayout,
  breakerStatus: "online" | "offline",
  breakerPosition: "open" | "close",
): void {
  const { step } = cfg;
  const { circuitBreaker: cb, convergence: cv, topBusY, bottomBusY } = pos;

  const centerY = (topBusY + bottomBusY) / 2;
  const lineStartX = cv.x + step * 0.2;
  const strokeW = Math.max(3, step * 0.14);
  const actualMidX = (lineStartX + cb.endX) / 2;
  const gap = cb.gapSize * 1.8;
  const { fill: sc, stroke: gc } = statusColor(breakerStatus, breakerPosition);

  const bw = cb.endX - lineStartX;
  const bx = lineStartX;
  const by = centerY - step * 0.35;
  const bh = step * 0.7;
  const br = step * 0.08;

  g.roundRect(bx - step * 0.1, by, bw + step * 0.2, bh, br);
  g.fill(breakerBodyGrad());
  g.stroke({ width: Math.max(1, step * 0.03), color: COLOR.borderStroke });

  g.setStrokeStyle({ width: strokeW, color: sc });

  if (breakerPosition === "close") {
    g.moveTo(lineStartX, centerY);
    g.lineTo(actualMidX - gap, centerY);
    g.stroke();

    g.moveTo(actualMidX - gap, centerY - gap * 0.5);
    g.lineTo(actualMidX + gap, centerY + gap * 0.5);
    g.stroke();

    g.moveTo(actualMidX + gap, centerY);
    g.lineTo(cb.endX, centerY);
    g.stroke();

    g.moveTo(cb.endX, centerY);
    g.lineTo(cb.endX + step * 0.15, centerY);
    g.stroke();
  } else {
    g.moveTo(lineStartX, centerY);
    g.lineTo(actualMidX - gap, centerY);
    g.stroke();

    g.moveTo(actualMidX, centerY - gap * 0.85);
    g.lineTo(actualMidX, centerY + gap * 0.85);
    g.stroke();

    g.moveTo(actualMidX + gap, centerY);
    g.lineTo(cb.endX, centerY);
    g.stroke();

    g.moveTo(cb.endX, centerY);
    g.lineTo(cb.endX + step * 0.15, centerY);
    g.stroke();
  }
}

export function drawBreakerPulse(
  g: Graphics,
  cfg: { step: number },
  pos: BreakerBusLayout,
  breakerStatus: "online" | "offline",
  breakerPosition: "open" | "close",
  time: number,
): void {
  const { step } = cfg;
  const { convergence: cv, topBusY, bottomBusY } = pos;

  const centerY = (topBusY + bottomBusY) / 2;
  const lineStartX = cv.x + step * 0.2;
  const actualMidX = (lineStartX + pos.circuitBreaker.endX) / 2;

  if (breakerStatus !== "online") return;

  const { fill: sc } = statusColor(breakerStatus, breakerPosition);
  const pulse = 1 + Math.sin(time * 4.0) * 0.3;
  const dotR = step * 0.1 * pulse;

  g.circle(actualMidX, centerY, dotR);
  g.fill(sc);

  g.circle(actualMidX, centerY, dotR + step * 0.06);
  g.stroke({ width: step * 0.03, color: sc, alpha: 0.25 });
}
