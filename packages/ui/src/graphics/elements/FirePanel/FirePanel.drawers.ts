import { Graphics, FillGradient } from "pixi.js";
import { COLOR } from "../../../colors";
import type { FirePanelData, FirePanelConfig } from "./FirePanel.types";

let _panelBodyGrad: FillGradient | null = null;
let _lampActiveGrads = new Map<number, FillGradient>();

function panelBodyGrad(): FillGradient {
  _panelBodyGrad ??= new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: COLOR.gradPanelTop },
      { offset: 1, color: COLOR.gradBodyBot },
    ],
    textureSpace: "local",
  });
  return _panelBodyGrad;
}

function lampActiveGrad(glow: number): FillGradient {
  if (!_lampActiveGrads.has(glow)) {
    _lampActiveGrads.set(glow, new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: COLOR.textWhite },
        { offset: 0.3, color: glow },
        { offset: 1, color: COLOR.gradScreen },
      ],
      textureSpace: "global",
    }));
  }
  return _lampActiveGrads.get(glow)!;
}

export interface LampDef {
  key: keyof FirePanelData;
  label: string;
  colorActive: number;
  colorGlow: number;
}

export const LAMP_DEFS: LampDef[] = [
  { key: "fault", label: "FAULT", colorActive: COLOR.warning, colorGlow: COLOR.warningGlow },
  { key: "fire", label: "FIRE", colorActive: COLOR.error, colorGlow: COLOR.error },
  { key: "firstStageAlarm", label: "1.STAGE", colorActive: COLOR.warning, colorGlow: COLOR.warningGlow },
  { key: "secondStageAlarm", label: "2.STAGE", colorActive: COLOR.error, colorGlow: COLOR.error },
  { key: "discharged", label: "DISCH.", colorActive: COLOR.error, colorGlow: COLOR.error },
  { key: "extract", label: "EXTRACT", colorActive: COLOR.info, colorGlow: COLOR.infoLight },
];

export const KEY_DEFS = [
  { label: "MAN", sublabel: "SALIM" },
  { label: "HOLD", sublabel: "DURDUR" },
  { label: "ABORT", sublabel: "IPTAL" },
  { label: "MODE", sublabel: "AUTO" },
];

export function drawFirePanelChassis(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  cfg: FirePanelConfig,
): void {
  const { step } = cfg;
  const r = step * 0.2;

  // PANELSIZ: yalnız ince çerçeve — lamba/anahtar yuvaları kod tarafında.
  g.roundRect(x, y, w, h, r);
  g.stroke({ width: Math.max(1, step * 0.05), color: COLOR.borderStroke, alpha: 0.7 });
}

// Nötr soket çizimi: boş lamba + anahtar yuvaları (Base story + çizim modu).
export function drawFirePanelSockets(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  cfg: FirePanelConfig,
): void {
  const { step } = cfg;
  const lampRadius = Math.max(3, step * 0.22);
  const lampGap = step * 0.5;
  const lampsPerRow = 3;
  const totalLampW = lampsPerRow * lampRadius * 2 + (lampsPerRow - 1) * lampGap;
  const lampStartX = x + (w - totalLampW) / 2;
  const lampY1 = y + h * 0.15;
  const lampY2 = y + h * 0.30;

  for (let i = 0; i < LAMP_DEFS.length; i++) {
    const col = i < 3 ? i : i - 3;
    const cy = i < 3 ? lampY1 : lampY2;
    const cx = lampStartX + col * (lampRadius * 2 + lampGap) + lampRadius;
    g.circle(cx, cy, lampRadius);
    g.fill({ color: COLOR.gradScreen, alpha: 0.9 });
    g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.borderStroke, alpha: 0.5 });
  }

  const keyW = step * 1.2;
  const keyH = step * 0.8;
  const keyGap = step * 0.3;
  const totalKeyW = KEY_DEFS.length * keyW + (KEY_DEFS.length - 1) * keyGap;
  const keyStartX = x + (w - totalKeyW) / 2;
  const keyY = y + h * 0.46;

  for (let i = 0; i < KEY_DEFS.length; i++) {
    const kx = keyStartX + i * (keyW + keyGap);
    g.roundRect(kx, keyY, keyW, keyH, step * 0.08);
    g.fill({ color: COLOR.gradScreen, alpha: 0.9 });
    g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.borderStroke, alpha: 0.4 });
  }
}

export function drawPanelBody(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  data: FirePanelData,
  cfg: FirePanelConfig,
): void {
  const { step } = cfg;
  const r = step * 0.2;

  g.roundRect(x, y, w, h, r);
  g.fill(panelBodyGrad());
  g.stroke({ width: Math.max(1, step * 0.05), color: data.fire ? COLOR.error : COLOR.borderStroke, alpha: data.fire ? 0.8 : 0.5 });

  g.roundRect(x + step * 0.06, y + step * 0.06, w - step * 0.12, h - step * 0.12, r * 0.8);
  g.fill({ color: COLOR.gradScreen, alpha: 0.3 });
}

export function drawLamp(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  active: boolean,
  colorActive: number,
  colorGlow: number,
  pulse: number,
  step: number,
): void {
  g.circle(cx, cy, radius);
  if (active) {
    g.fill(lampActiveGrad(colorGlow));
  } else {
    g.fill({ color: COLOR.gradScreen, alpha: 0.8 });
  }
  g.stroke({ width: Math.max(0.5, step * 0.02), color: active ? colorActive : COLOR.borderStroke, alpha: active ? 0.9 : 0.4 });

  if (active) {
    const glowR = radius + step * 0.04 + pulse * step * 0.03;
    g.circle(cx, cy, glowR);
    g.stroke({ width: Math.max(0.4, step * 0.012), color: colorGlow, alpha: 0.15 + pulse * 0.12 });
  }
}

export function drawKeySwitch(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  active: boolean,
  step: number,
): void {
  const r = step * 0.08;

  g.roundRect(x, y, w, h, r);
  g.fill({ color: COLOR.bgSystemBar, alpha: 0.9 });
  g.stroke({ width: Math.max(0.5, step * 0.02), color: active ? COLOR.infoLight : COLOR.borderStroke, alpha: active ? 0.6 : 0.35 });

  const slotW = w * 0.18;
  const slotH = h * 0.55;
  g.roundRect(x + w / 2 - slotW / 2, y + h * 0.2, slotW, slotH, slotW * 0.4);
  g.fill({ color: COLOR.gradScreen, alpha: 0.9 });
  g.stroke({ width: Math.max(0.3, step * 0.01), color: active ? COLOR.info : COLOR.borderStroke, alpha: 0.4 });

  const dotR = slotW * 0.3;
  g.circle(x + w / 2, y + h * 0.2 + slotH / 2, dotR);
  g.fill({ color: COLOR.terminal });
}

export function drawLabelBox(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor: number,
  borderAlpha: number,
  step: number,
): void {
  const r = step * 0.05;
  g.roundRect(x, y, w, h, r);
  g.fill({ color: COLOR.gradScreen, alpha: 0.85 });
  g.stroke({ width: Math.max(0.3, step * 0.012), color: borderColor, alpha: borderAlpha });
}
