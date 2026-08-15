import { Graphics } from "pixi.js";
import { COLOR } from "../../../colors";

// Nötr chassis: sprite üretimi Base story yakalaması için.
// Çizim modu (drawGridSymbol) infoLight vurgusunu korur.
export function drawGridChassis(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  step: number,
): void {
  const r = step * 0.12;

  g.roundRect(x, y, w, h, r);
  g.fill({ color: COLOR.bgSystemBar, alpha: 0.9 });
  g.stroke({ width: Math.max(1, step * 0.04), color: COLOR.borderStroke, alpha: 0.5 });

  const waveX = x + step * 0.2;
  const waveW = w - step * 0.4;
  const midY = y + h * 0.4;
  const amplitude = step * 0.12;
  const freq = 3;

  g.moveTo(waveX, midY);
  for (let i = 0; i <= freq; i++) {
    const t = i / freq;
    const sx = waveX + t * waveW;
    const sy = midY + Math.sin(t * Math.PI * 2) * amplitude;
    g.lineTo(sx, sy);
  }

  const termW = step * 0.2;
  const termH = step * 0.35;
  for (const ty of [y + h * 0.1, y + h * 0.7]) {
    g.roundRect(x + w / 2 - termW / 2, ty, termW, termH, termW * 0.3);
    g.fill({ color: COLOR.terminal });
  }
}

export function drawGridSymbol(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  step: number,
): void {
  const r = step * 0.12;

  g.roundRect(x, y, w, h, r);
  g.fill({ color: COLOR.bgSystemBar, alpha: 0.9 });
  g.stroke({ width: Math.max(1, step * 0.04), color: COLOR.infoLight, alpha: 0.5 });

  const waveX = x + step * 0.2;
  const waveW = w - step * 0.4;
  const midY = y + h * 0.4;
  const amplitude = step * 0.12;
  const freq = 3;

  g.moveTo(waveX, midY);
  for (let i = 0; i <= freq; i++) {
    const t = i / freq;
    const sx = waveX + t * waveW;
    const sy = midY + Math.sin(t * Math.PI * 2) * amplitude;
    g.lineTo(sx, sy);
  }

  const termW = step * 0.2;
  const termH = step * 0.35;
  for (const ty of [y + h * 0.1, y + h * 0.7]) {
    g.roundRect(x + w / 2 - termW / 2, ty, termW, termH, termW * 0.3);
    g.fill({ color: COLOR.terminal });
  }
}
