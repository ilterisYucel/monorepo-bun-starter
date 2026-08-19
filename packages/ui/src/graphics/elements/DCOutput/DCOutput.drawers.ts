import { Graphics } from "pixi.js";
import type { OutputPosition } from "../../types";
import { COLOR } from "../../../colors";

// DC çıkış şema sembolü: PANELSIZ iç içe 2 ince daire çerçevesi (yalnız outline,
// içi tamamen transparent). +/− işaretleri ve V/A etiketleri kod tarafında.
export function drawOutputChassis(
  g: Graphics,
  cfg: { step: number },
  output: OutputPosition,
): void {
  const { step } = cfg;
  const or = output.radius;

  g.circle(output.x, output.y, or);
  g.stroke({ width: Math.max(1, step * 0.04), color: COLOR.borderStroke });

  g.circle(output.x, output.y, or * 0.68);
  g.stroke({ width: Math.max(0.8, step * 0.03), color: COLOR.borderStroke });
}

export function drawOutputBody(
  g: Graphics,
  cfg: { step: number },
  output: OutputPosition,
): void {
  drawOutputChassis(g, cfg, output);
}
