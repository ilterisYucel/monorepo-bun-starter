// HUD tipografi katmanı: sprite gövdeyle görsel bütünlük sağlayan
// neon okuma stili (TextStyle dropShadow glow + koyu kontur).
import { TextStyle } from "pixi.js";
import { COLOR } from "../colors";

export interface HudTextStyleOptions {
  size: number;
  color: number;
  bold?: boolean;
  glow?: boolean;
  letterSpacing?: number;
}

export function hudTextStyle(opts: HudTextStyleOptions): TextStyle {
  const { size, color, bold, glow, letterSpacing } = opts;
  return new TextStyle({
    fontFamily: "monospace",
    fontSize: size,
    fontWeight: bold ? "bold" : "normal",
    letterSpacing: letterSpacing ?? Math.max(0.3, size * 0.04),
    fill: color,
    stroke: { color: COLOR.textNearBlack, width: Math.max(1, size * 0.09), alpha: 0.55 },
    dropShadow: glow
      ? { color, alpha: 0.65, blur: Math.max(2, size * 0.25), distance: 0 }
      : undefined,
  });
}
