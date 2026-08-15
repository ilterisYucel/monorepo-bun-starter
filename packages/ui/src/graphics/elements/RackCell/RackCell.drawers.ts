import { Graphics, FillGradient } from "pixi.js";
import type { Rack } from "../../../types";
import type { RackCellConfig } from "./RackCell.types";
import { COLOR } from "../../../colors";

let _rackBodyGrad: FillGradient | null = null;
const _rackFillGrads = new Map<string, FillGradient>();

function rackBodyGrad(): FillGradient {
  _rackBodyGrad ??= new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: COLOR.gradBodyTop },
      { offset: 0.45, color: COLOR.gradMid2 },
      { offset: 1, color: COLOR.gradBodyBot },
    ],
    textureSpace: "local",
  });
  return _rackBodyGrad;
}

function rackFillGrad(glow: number, base: number): FillGradient {
  const key = `${glow}_${base}`;
  if (!_rackFillGrads.has(key)) {
    _rackFillGrads.set(key, new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: glow },
        { offset: 1, color: base },
      ],
      textureSpace: "local",
    }));
  }
  return _rackFillGrads.get(key)!;
}

// ── Geometri (sprite tasarımıyla birebir) ────────────────────────────────────
// Gövde 120x380 (step=100 referansında). Pencereler sol-orta blokta,
// dolgu tüpü gövde sağında. Tüm değerler step/rackWidth/rackHeight türevidir.

export interface RackCellRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rackWindowRects(cfg: RackCellConfig): RackCellRect[] {
  const { rackWidth: w, step } = cfg;
  const boxW = w * 0.55;
  const boxH = step * 0.38;
  const boxCX = w * 0.42;
  const gap = step * 0.08;
  const startY = step * 0.35;
  const rects: RackCellRect[] = [];
  for (let row = 0; row < 6; row++) {
    rects.push({
      x: boxCX - boxW / 2,
      y: startY + row * (boxH + gap),
      width: boxW,
      height: boxH,
    });
  }
  return rects;
}

export function rackTubeRect(cfg: RackCellConfig): RackCellRect {
  const { rackWidth: w, rackHeight: h, step } = cfg;
  return {
    x: w - step * 0.35,
    y: step * 0.35,
    width: step * 0.22,
    height: h - step * 0.85,
  };
}

// ── Gövde ────────────────────────────────────────────────────────────────────

export function drawRackBody(g: Graphics, cfg: RackCellConfig): void {
  const { rackWidth: w, rackHeight: h, step } = cfg;
  const r = w * 0.42;

  const so = step * 0.08;
  g.roundRect(so, so, w, h, r);
  g.fill({ color: COLOR.shadow, alpha: 0.25 });

  g.roundRect(0, 0, w, h, r);
  g.fill(rackBodyGrad());
  g.stroke({ width: Math.max(1, step * 0.04), color: COLOR.borderStroke });

  const nubW = w * 0.25;
  const nubH = step * 0.14;
  const nubR = step * 0.05;

  g.roundRect(w / 2 - nubW / 2, -nubH, nubW, nubH + 1, nubR);
  g.fill(COLOR.terminal);
  g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.terminal });

  g.roundRect(w / 2 - nubW / 2, h, nubW, nubH + 1, nubR);
  g.fill(COLOR.terminal);
  g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.terminal });
}

// ── Dolgu tüpü (sağ) ─────────────────────────────────────────────────────────

export function drawRackTubeHousing(
  g: Graphics,
  cfg: RackCellConfig,
): void {
  const { step } = cfg;
  const tube = rackTubeRect(cfg);
  const r = step * 0.1;

  g.roundRect(tube.x, tube.y, tube.width, tube.height, r);
  g.fill({ color: COLOR.gradScreen, alpha: 0.6 });
  g.stroke({ width: Math.max(0.6, step * 0.02), color: COLOR.borderStroke, alpha: 0.7 });

  // Çentikler: 0/25/50/75/100
  const innerTop = tube.y + step * 0.08;
  const innerH = tube.height - step * 0.16;
  for (let i = 0; i <= 4; i++) {
    const ty = innerTop + (innerH * i) / 4;
    g.moveTo(tube.x - step * 0.04, ty);
    g.lineTo(tube.x + step * 0.06, ty);
    g.stroke({ width: Math.max(0.4, step * 0.012), color: COLOR.borderStroke, alpha: 0.6 });
  }
}

export function drawRackTubeFill(
  g: Graphics,
  soc: number,
  flowDirection: string,
  cfg: RackCellConfig,
  tubeOverride?: RackCellRect,
): void {
  const { step } = cfg;
  const tube = tubeOverride ?? rackTubeRect(cfg);
  const pct = Math.min(1, Math.max(0, soc / 100));
  if (pct <= 0) return;

  let base: number;
  let glow: number;
  if (flowDirection === "Charge") { base = COLOR.success; glow = COLOR.successGlow; }
  else if (flowDirection === "Discharge") { base = COLOR.warning; glow = COLOR.warningGlow; }
  else { base = COLOR.idle; glow = COLOR.textMuted; }

  const pad = step * 0.03;
  const innerTop = tube.y + step * 0.06;
  const innerH = tube.height - step * 0.12;
  const fillH = innerH * pct;
  const fy = innerTop + (innerH - fillH);

  const fillGrad = rackFillGrad(glow, base);
  g.roundRect(tube.x + pad, fy, tube.width - pad * 2, fillH, step * 0.06);
  g.fill({ fill: fillGrad, alpha: 0.8 });

  const capH = Math.max(step * 0.04, fillH * 0.05);
  g.roundRect(tube.x + pad * 0.6, fy - capH, tube.width - pad * 1.2, capH * 2, capH);
  g.fill({ color: glow, alpha: 0.9 });

  g.roundRect(tube.x + pad, fy - capH * 0.6, tube.width - pad * 2, capH * 3.2, capH);
  g.fill({ color: glow, alpha: 0.18 });
}

// ── Durum glow ───────────────────────────────────────────────────────────────

export function drawRackGlow(
  g: Graphics,
  rack: Rack,
  cfg: RackCellConfig,
  flowDirection: string,
  time: number,
): void {
  if (flowDirection === "Idle") return;

  const { rackWidth: w, rackHeight: h, step } = cfg;
  const r = w * 0.42;
  const pulse = 1 + Math.sin(time * 4.0) * 0.4;
  const color = flowDirection === "Charge" ? COLOR.success : COLOR.warning;
  const alpha = 0.15 + Math.sin(time * 4.0) * 0.08;

  g.roundRect(-step * 0.08, -step * 0.08, w + step * 0.16, h + step * 0.16, r + step * 0.08);
  g.stroke({ width: Math.max(1, step * 0.07 * pulse), color, alpha });
}

// ── Bilgi pencereleri (çizim modu) ───────────────────────────────────────────

export function drawRackTerminals(
  g: Graphics,
  rack: Rack,
  cfg: RackCellConfig,
): void {
  const { step } = cfg;
  const rects = rackWindowRects(cfg);
  const boxR = step * 0.06;

  const statusOnline = rack.status === "online";
  const statusBorder = statusOnline ? COLOR.success : COLOR.error;

  let chargeBorder: number;
  if (rack.charge_status === "Charge") chargeBorder = COLOR.success;
  else if (rack.charge_status === "Discharge") chargeBorder = COLOR.warning;
  else chargeBorder = COLOR.idle;

  const borders = [COLOR.borderStroke, statusBorder, chargeBorder, COLOR.info, COLOR.info, COLOR.warning];
  const borderAlphas = [0.6, 0.6, 0.6, 0.25, 0.18, 0.18];

  rects.forEach((rect, row) => {
    g.roundRect(rect.x, rect.y, rect.width, rect.height, boxR);
    g.fill({ color: COLOR.gradScreen, alpha: 0.85 });
    g.stroke({ width: Math.max(0.4, step * 0.015), color: borders[row]!, alpha: borderAlphas[row]! });
  });
}

// Nötr pencere çizimi: yalnızca Base story yakalamasında kullanılır.
// AI, bu pencereleri sprite gövdesine "boş display penceresi" olarak gömer.
export function drawRackWindows(
  g: Graphics,
  cfg: RackCellConfig,
): void {
  const { step } = cfg;
  const rects = rackWindowRects(cfg);
  const boxR = step * 0.06;

  for (const rect of rects) {
    g.roundRect(rect.x, rect.y, rect.width, rect.height, boxR);
    g.fill({ color: COLOR.gradScreen, alpha: 0.85 });
    g.stroke({ width: Math.max(0.4, step * 0.015), color: COLOR.borderStroke, alpha: 0.6 });
  }
}

// Sprite modunda: pencereler sprite'ta; kod yalnızca durum renkli
// ince kenar çizgilerini (dolgu yok) ölçülen rect'lerin içine çizer.
export function drawRackWindowBorders(
  g: Graphics,
  rack: Rack,
  cfg: RackCellConfig,
  rects: RackCellRect[],
): void {
  const { step } = cfg;
  const boxR = step * 0.06;

  const statusOnline = rack.status === "online";
  const statusBorder = statusOnline ? COLOR.success : COLOR.error;

  let chargeBorder: number;
  if (rack.charge_status === "Charge") chargeBorder = COLOR.success;
  else if (rack.charge_status === "Discharge") chargeBorder = COLOR.warning;
  else chargeBorder = COLOR.idle;

  const borders = [COLOR.borderStroke, statusBorder, chargeBorder, COLOR.info, COLOR.info, COLOR.warning];
  const borderAlphas = [0.5, 0.85, 0.85, 0.35, 0.25, 0.25];

  rects.forEach((rect, row) => {
    if (!rect) return;
    g.roundRect(rect.x, rect.y, rect.width, rect.height, boxR);
    g.stroke({ width: Math.max(0.6, step * 0.02), color: borders[row]!, alpha: borderAlphas[row]! });
  });
}
