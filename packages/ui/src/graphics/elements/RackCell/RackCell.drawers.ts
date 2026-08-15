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
// batarya hücre kolonu gövde sağında. Tüm değerler step/rackWidth/rackHeight türevidir.

export interface RackCellRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rackWindowRects(cfg: RackCellConfig): RackCellRect[] {
  const { rackWidth: w, step } = cfg;
  const boxW = w * 0.52;
  const boxH = step * 0.38;
  const boxCX = w * 0.40;
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

const CELL_COUNT = 8;

export function rackCellColumnRect(cfg: RackCellConfig): RackCellRect {
  const { rackWidth: w, rackHeight: h, step } = cfg;
  const cellH = step * 0.33;
  const gap = step * 0.06;
  const total = CELL_COUNT * cellH + (CELL_COUNT - 1) * gap;
  return {
    x: w - step * 0.30,
    y: (h - total) / 2,
    width: step * 0.20,
    height: total,
  };
}

// Hücre rect'leri (üstten alta): [0] = en üst, [7] = en alt
export function rackCellRects(cfg: RackCellConfig): RackCellRect[] {
  const col = rackCellColumnRect(cfg);
  const cellH = cfg.step * 0.33;
  const gap = cfg.step * 0.06;
  const rects: RackCellRect[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    rects.push({
      x: col.x,
      y: col.y + i * (cellH + gap),
      width: col.width,
      height: cellH,
    });
  }
  return rects;
}

// ── Gövde ────────────────────────────────────────────────────────────────────

// Üretim referansı için DÜZ (gradyansız) gövde: pencere/hücre yuvaları her
// satırda yüksek kontrastla görünür — ölçüm tespitini güvenilir kılar.
// Yalnızca Base story yakalamasında kullanılır; üretim çizimi drawRackBody'dir.
export function drawRackBaseBody(g: Graphics, cfg: RackCellConfig): void {
  const { rackWidth: w, rackHeight: h, step } = cfg;
  const r = w * 0.42;

  const so = step * 0.08;
  g.roundRect(so, so, w, h, r);
  g.fill({ color: COLOR.shadow, alpha: 0.25 });

  g.roundRect(0, 0, w, h, r);
  g.fill({ color: COLOR.gradBodyTop });
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

// ── Batarya hücre kolonu (sağ) ───────────────────────────────────────────────

export function drawRackCellStackHousing(
  g: Graphics,
  cfg: RackCellConfig,
): void {
  const { step } = cfg;
  const cells = rackCellRects(cfg);
  const r = step * 0.05;

  for (const cell of cells) {
    g.roundRect(cell.x, cell.y, cell.width, cell.height, r);
    g.fill({ color: COLOR.textNearBlack });
    g.stroke({ width: Math.max(1, step * 0.03), color: COLOR.borderStroke, alpha: 0.9 });
  }
}

export function drawRackCellsFill(
  g: Graphics,
  soc: number,
  flowDirection: string,
  cfg: RackCellConfig,
  columnOverride?: RackCellRect,
): void {
  const { step } = cfg;
  const pct = Math.min(1, Math.max(0, soc / 100));
  if (pct <= 0) return;

  let base: number;
  let glow: number;
  if (flowDirection === "Charge") { base = COLOR.success; glow = COLOR.successGlow; }
  else if (flowDirection === "Discharge") { base = COLOR.warning; glow = COLOR.warningGlow; }
  else { base = COLOR.idle; glow = COLOR.textMuted; }

  // ölçülen kolon verilmişse hücreler oradan türetilir
  const cells = columnOverride
    ? Array.from({ length: CELL_COUNT }, (_, i) => ({
        x: columnOverride.x,
        y: columnOverride.y + i * (columnOverride.height / CELL_COUNT),
        width: columnOverride.width,
        height: columnOverride.height / CELL_COUNT,
      }))
    : rackCellRects(cfg);

  const lit = Math.round(pct * CELL_COUNT);
  const pad = step * 0.02;
  const fillGrad = rackFillGrad(glow, base);

  // alttan yukarı hücreleri doldur
  for (let i = 0; i < lit; i++) {
    const cell = cells[CELL_COUNT - 1 - i];
    if (!cell) break;
    const gap = step * 0.02;
    const hh = cell.height - gap * 2;
    if (hh <= 0) continue;

    g.roundRect(cell.x + pad, cell.y + gap, cell.width - pad * 2, hh, step * 0.04);
    g.fill({ fill: fillGrad, alpha: 0.85 });

    // üst yüzey parlaması
    g.roundRect(cell.x + pad, cell.y + gap, cell.width - pad * 2, Math.min(step * 0.05, hh * 0.35), step * 0.03);
    g.fill({ color: glow, alpha: 0.9 });
  }
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
    g.fill({ color: COLOR.textNearBlack });
    g.stroke({ width: Math.max(0.8, step * 0.02), color: COLOR.borderStroke, alpha: 0.9 });
  }
}

// Sprite modunda: pencereler sprite'ta; kod durum renkli ince kenar çizgileri
// ve okunabilirlik için hafif koyu cam dolgu çizer (ölçülen rect'lerde).
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
    g.fill({ color: COLOR.gradScreen, alpha: 0.55 });
    g.stroke({ width: Math.max(0.6, step * 0.02), color: borders[row]!, alpha: borderAlphas[row]! });
  });
}
