import { Graphics } from "pixi.js";
import type { Rack } from "../../../types";
import type { RackCellConfig } from "./RackCell.types";
import { COLOR } from "../../../colors";

// ── Geometri: batarya devre sembolü (step=100 referansı, gövde 120x380) ──────
// PANEL YOK — yalnız sembol: üst/alt terminal nubları + dikey iletken +
// 6 plaka çifti (uzun/kısa dönüşümlü). Etiketler sembol altında YÜZER.
// Terminal nubları kutu kenarlarındadır — BSCUnitRow kablo bağlantı noktaları
// ile birebir aynı kalır (düzen matematiği değişmez).
// Sembol sprite sınırları: x 16..104, y -14..394 (logical) — sprites-spec frame.

export interface RackCellRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PLATE_PAIRS = 6;

export function rackPlateRects(cfg: RackCellConfig): RackCellRect[] {
  const { rackWidth: w, step } = cfg;
  const zoneY = step * 0.36;
  const pitch = step * 0.16;
  const plateH = step * 0.08;
  const longW = w * 0.73;
  const shortW = w * 0.37;
  const cx = w / 2;

  const rects: RackCellRect[] = [];
  for (let i = 0; i < PLATE_PAIRS; i++) {
    const y = zoneY + i * pitch * 2;
    rects.push({ x: cx - longW / 2, y, width: longW, height: plateH });
    rects.push({ x: cx - shortW / 2, y: y + pitch, width: shortW, height: plateH });
  }
  return rects;
}

// Etiket satırları: 2 sütun x 3 satır, plaka stack'inin altında YÜZER.
// Sol sütun omurganın solunda sağa yaslı, sağ sütun omurganın sağında
// sola yaslı — metinler omurga çizgisinden dışa doğru boş alana açılır.
// Her iki sütun dikeyde ortalı (y=0.5) — kanatlar aynı satır hizasındadır.
export function rackLabelRows(
  cfg: RackCellConfig,
): Array<{ x: number; y: number; anchor: { x: number; y: number } }> {
  const { rackWidth: w, rackHeight: h } = cfg;
  const startY = h * 0.7;
  const pitch = h * 0.09;
  const leftX = w * 0.46;
  const rightX = w * 0.54;
  const rows: Array<{ x: number; y: number; anchor: { x: number; y: number } }> = [];
  for (let i = 0; i < 3; i++) {
    rows.push({ x: leftX, y: startY + pitch * i, anchor: { x: 1, y: 0.5 } });
  }
  for (let i = 0; i < 3; i++) {
    rows.push({ x: rightX, y: startY + pitch * i, anchor: { x: 0, y: 0.5 } });
  }
  return rows;
}

// ── Çizimler ─────────────────────────────────────────────────────────────────

// Nötr chassis (Base story / sprite üretim referansı): PANELSIZ sembol.
// Yalnızca nublar + iletken + plakalar. AI yüzeyleri bu yapı üzerine boyar.
export function drawRackSymbolBase(g: Graphics, cfg: RackCellConfig): void {
  const { rackWidth: w, rackHeight: h, step } = cfg;
  const cx = w / 2;

  const nubW = w * 0.25;
  const nubH = step * 0.14;
  const nubR = step * 0.05;

  g.roundRect(cx - nubW / 2, -nubH, nubW, nubH + 1, nubR);
  g.fill(COLOR.terminal);
  g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.terminal });

  g.roundRect(cx - nubW / 2, h, nubW, nubH + 1, nubR);
  g.fill(COLOR.terminal);
  g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.terminal });

  g.rect(cx - step * 0.012, 0, step * 0.024, h);
  g.fill({ color: COLOR.borderStroke });

  for (const plate of rackPlateRects(cfg)) {
    g.roundRect(plate.x, plate.y, plate.width, plate.height, step * 0.02);
    g.fill({ color: COLOR.textNearBlack });
    g.stroke({ width: Math.max(0.5, step * 0.015), color: COLOR.borderStroke, alpha: 0.9 });
  }
}

// Çizim modu (fallback): aynı sembol.
export function drawRackSymbol(g: Graphics, cfg: RackCellConfig): void {
  drawRackSymbolBase(g, cfg);
}

// Durum glow: sembol bölgesi çevresinde nabız — Idle'da çizilmez.
export function drawRackSymbolGlow(
  g: Graphics,
  rack: Rack,
  cfg: RackCellConfig,
  flowDirection: string,
  time: number,
): void {
  if (flowDirection === "Idle") return;

  const { rackWidth: w, step } = cfg;
  const pulse = 1 + Math.sin(time * 4.0) * 0.4;
  const color = flowDirection === "Charge" ? COLOR.success : COLOR.warning;
  const alpha = 0.15 + Math.sin(time * 4.0) * 0.08;

  const plates = rackPlateRects(cfg);
  const top = plates[0]!.y - step * 0.08;
  const bottom = plates[plates.length - 1]!.y + plates[plates.length - 1]!.height + step * 0.08;
  const gw = w * 0.8;
  g.roundRect(w / 2 - gw / 2, top, gw, bottom - top, step * 0.1);
  g.stroke({ width: Math.max(1, step * 0.07 * pulse), color, alpha });
}
