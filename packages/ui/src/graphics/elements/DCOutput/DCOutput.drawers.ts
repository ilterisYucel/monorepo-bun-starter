import { Graphics, FillGradient } from "pixi.js";
import type { OutputPosition } from "../../types";

const COLOR_OUTPUT = 0x3b82f6;
const COLOR_IDLE = 0x6b7280;
const COLOR_BORDER = 0x3d3d5e;

export function drawOutputBody(
  g: Graphics,
  cfg: { step: number },
  output: OutputPosition,
  isActive: boolean,
): void {
  const { step } = cfg;
  const color = isActive ? COLOR_OUTPUT : COLOR_IDLE;

  const bg = new FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.5,
    colorStops: [
      { offset: 0, color: isActive ? 0x4a8af7 : 0x7a8696 },
      { offset: 1, color: isActive ? 0x1d4ed8 : 0x4b5563 },
    ],
    textureSpace: "local",
  });

  const or = output.radius;
  g.circle(output.x, output.y, or);
  g.fill(bg);
  g.stroke({ width: Math.max(1, step * 0.04), color: COLOR_BORDER });

  g.circle(output.x, output.y, or * 0.7);
  g.fill({ color, alpha: 0.3 });

  const bs = Math.max(5, step * 0.24);
  g.moveTo(output.x - bs, output.y + bs * 0.6);
  g.lineTo(output.x - bs * 0.4, output.y - bs * 0.4);
  g.lineTo(output.x - bs * 0.1, output.y + bs * 0.5);
  g.lineTo(output.x + bs * 0.2, output.y - bs * 0.5);
  g.lineTo(output.x + bs * 0.5, output.y + bs * 0.3);
  g.lineTo(output.x + bs, output.y - bs * 0.6);
  g.stroke({ width: Math.max(2, step * 0.06), color: 0xffffff });

  const dotR = Math.max(1.5, step * 0.05);
  g.circle(output.x, output.y - or + dotR * 2, dotR);
  g.fill(isActive ? COLOR_OUTPUT : COLOR_IDLE);
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
  g.fill({ color: COLOR_OUTPUT, alpha: 0.12 });

  g.circle(output.x, output.y, or + step * 0.06 * pulse);
  g.stroke({ width: step * 0.04 * pulse, color: COLOR_OUTPUT, alpha: 0.2 });
}
