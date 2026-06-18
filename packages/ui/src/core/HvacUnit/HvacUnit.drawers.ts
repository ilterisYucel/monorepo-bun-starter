import { Graphics, FillGradient } from "pixi.js";
import type { HvacData, RectPosition, StepConfig } from "../../components/TMSGraphic/TMSGraphic.types";

export function drawHvacBody(
  g: Graphics,
  pos: RectPosition,
  hvac: HvacData,
  cfg: StepConfig,
): void {
  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const r = step * 0.15;

  const isOnline = hvac.status === "online";
  const borderColor = isOnline ? 0x10b981 : 0xef4444;

  let fillColor: number;
  if (isOnline) {
    fillColor = hvac.mode === "cooling" ? 0x3b82f6 : hvac.mode === "warming" ? 0xf59e0b : 0x6b7280;
  } else {
    fillColor = 0x6b7280;
  }

  const bg = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: 0x252545 },
      { offset: 1, color: 0x16162e },
    ],
    textureSpace: "local",
  });

  g.roundRect(x, y, w, h, r);
  g.fill(bg);
  g.stroke({ width: Math.max(1, step * 0.04), color: borderColor });

  // Mode indicator fill
  g.roundRect(x + step * 0.08, y + step * 0.08, w - step * 0.16, h - step * 0.16, r * 0.5);
  g.fill({ color: fillColor, alpha: 0.25 });

  // Status dot
  const dotR = Math.max(2, step * 0.06);
  g.circle(x + w - dotR * 2, y + dotR * 2, dotR);
  g.fill(isOnline ? 0x10b981 : 0xef4444);
}

export function drawHvacAnim(
  g: Graphics,
  pos: RectPosition,
  hvac: HvacData,
  cfg: StepConfig,
  timestampRef: { current: number },
): void {
  if (hvac.status !== "online" || hvac.mode === "idle") return;

  const { step } = cfg;
  const { x, y, width: w, height: h } = pos;
  const isCooling = hvac.mode === "cooling";
  const color = isCooling ? 0x3b82f6 : 0xf59e0b;

  // Pulsing glow border
  const glowAlpha = 0.1 + Math.sin(timestampRef.current * 0.004) * 0.08;
  const glowW = step * 0.05 * (1 + Math.sin(timestampRef.current * 0.004) * 0.4);
  g.roundRect(x - glowW, y - glowW, w + glowW * 2, h + glowW * 2, step * 0.2);
  g.stroke({ width: glowW, color, alpha: glowAlpha });

  // Flow arrows
  const arrowSize = Math.max(4, step * 0.1);
  const cx = x + w / 2;
  const arrowAreaTop = y - step * 0.5;
  const arrowAreaBot = y;
  const areaH = arrowAreaBot - arrowAreaTop;
  const progress = (timestampRef.current % 2500) / 2500;

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
