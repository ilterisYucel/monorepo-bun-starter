import { Graphics, FillGradient } from "pixi.js";
import type { OutputPosition } from "../../types";
import { COLOR } from "../../../colors";

export function drawOutputBody(
  g: Graphics,
  cfg: { step: number },
  output: OutputPosition,
  isActive: boolean,
): void {
  const { step } = cfg;
  const color = isActive ? COLOR.info : COLOR.idle;

  const bg = new FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.5,
    colorStops: [
      { offset: 0, color: isActive ? COLOR.dcActiveCenter : COLOR.dcIdleCenter },
      { offset: 1, color: isActive ? COLOR.dcActiveEdge : COLOR.dcIdleEdge },
    ],
    textureSpace: "local",
  });

  const or = output.radius;
  g.circle(output.x, output.y, or);
  g.fill(bg);
  g.stroke({ width: Math.max(1, step * 0.04), color: COLOR.borderStroke });

  g.circle(output.x, output.y, or * 0.7);
  g.fill({ color, alpha: 0.3 });

  const bs = Math.max(5, step * 0.24);
  g.moveTo(output.x - bs, output.y + bs * 0.6);
  g.lineTo(output.x - bs * 0.4, output.y - bs * 0.4);
  g.lineTo(output.x - bs * 0.1, output.y + bs * 0.5);
  g.lineTo(output.x + bs * 0.2, output.y - bs * 0.5);
  g.lineTo(output.x + bs * 0.5, output.y + bs * 0.3);
  g.lineTo(output.x + bs, output.y - bs * 0.6);
  g.stroke({ width: Math.max(2, step * 0.06), color: COLOR.textWhite });

  const dotR = Math.max(1.5, step * 0.05);
  g.circle(output.x, output.y - or + dotR * 2, dotR);
  g.fill(isActive ? COLOR.info : COLOR.idle);
}

export function drawOutputGlow(
  g: Graphics,
  cfg: { step: number },
  output: OutputPosition,
  isActive: boolean,
  time: number,
): void {
  if (!isActive) return;

  const { step } = cfg;
  const pulse = 1 + Math.sin(time * 5.0) * 0.5;
  const or = output.radius;

  g.circle(output.x, output.y, or + step * 0.12 * pulse);
  g.fill({ color: COLOR.info, alpha: 0.12 });

  g.circle(output.x, output.y, or + step * 0.06 * pulse);
  g.stroke({ width: step * 0.04 * pulse, color: COLOR.info, alpha: 0.2 });
}
