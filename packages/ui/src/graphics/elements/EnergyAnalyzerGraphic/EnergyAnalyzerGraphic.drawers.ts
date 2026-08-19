import { Graphics } from "pixi.js";
import { COLOR } from "../../../colors";

// Enerji analizörü şema sembolü: PANELSIZ İÇ İÇE 2 KUTU (dış + iç dikdörtgen
// outline, içleri transparent) + üst/alt belirgin terminal nubları (polarite).
// Yatay devre kabloları dış kutunun sol/sağ kenarlarına dokunur.
// Sembol kutusu (logical): 300x206 — sprites-spec frame ile birebir.
// Çizgi rengi kablo grisi (COLOR.cable) — sprite ve kablolar tek ton.
export function drawEABox(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  step: number,
): void {
  const cx = x + w / 2;
  const cy = y + h / 2;

  const boxR = step * 0.08;
  g.roundRect(x, y, w, h, boxR);
  g.stroke({ width: Math.max(1, step * 0.04), color: COLOR.cable });

  const innerW = w * 0.64;
  const innerH = h * 0.46;
  g.roundRect(cx - innerW / 2, cy - innerH / 2, innerW, innerH, boxR * 0.6);
  g.stroke({ width: Math.max(0.8, step * 0.03), color: COLOR.cable });

  const stubW = Math.max(8, step * 0.22);
  const stubH = Math.max(10, step * 0.5);

  g.roundRect(cx - stubW / 2, cy - innerH / 2 - stubH - step * 0.1, stubW, stubH, stubW * 0.3);
  g.fill(COLOR.cable);
  g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.cable });

  g.roundRect(cx - stubW / 2, cy + innerH / 2 + step * 0.1, stubW, stubH, stubW * 0.3);
  g.fill(COLOR.cable);
  g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.cable });
}

// Kadranlı ölçü aleti işareti: daire + ibre (çapraz iğne) + skala çentikleri.
// Kod çizilir (sprite'a metin/ince detay koyulmaz) — kablo grisi tonunda.
export function drawEADial(
  g: Graphics,
  cx: number,
  cy: number,
  r: number,
  step: number,
): void {
  g.circle(cx, cy, r);
  g.stroke({ width: Math.max(0.8, step * 0.03), color: COLOR.cable });

  // ibre: merkezden sağ-üst 45° çapraz iğne
  const needleLen = r * 0.78;
  const ang = -Math.PI / 4;
  g.setStrokeStyle({ width: Math.max(1, step * 0.035), color: COLOR.cable, cap: "round" });
  g.moveTo(cx, cy);
  g.lineTo(cx + Math.cos(ang) * needleLen, cy + Math.sin(ang) * needleLen);
  g.stroke();

  // skala çentikleri: sol, sağ, alt (daire iç yüzeyinde kısa çizgiler)
  const tickLen = r * 0.18;
  g.setStrokeStyle({ width: Math.max(0.8, step * 0.025), color: COLOR.cable, cap: "round" });
  g.moveTo(cx - r * 0.9, cy);
  g.lineTo(cx - r * 0.9 + tickLen, cy);
  g.stroke();
  g.moveTo(cx + r * 0.9 - tickLen, cy);
  g.lineTo(cx + r * 0.9, cy);
  g.stroke();
  g.moveTo(cx, cy + r * 0.9 - tickLen);
  g.lineTo(cx, cy + r * 0.9);
  g.stroke();
}
