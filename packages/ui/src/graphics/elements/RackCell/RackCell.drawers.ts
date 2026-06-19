import { Graphics, FillGradient } from "pixi.js";
import type { Rack } from "../../../types";
import type { RackCellConfig } from "./RackCell.types";

const BODY_TOP = 0x2a2a4e;
const BODY_BOT = 0x16162e;
const BODY_STROKE = 0x3d3d5e;
const TERMINAL_COLOR = 0x4a4a6a;
const SHADOW_COLOR = 0x000000;
const SCREEN_BG = 0x0a0a1a;

export function drawRackBody(g: Graphics, cfg: RackCellConfig): void {
  const { rackWidth: w, rackHeight: h, step } = cfg;
  const r = w * 0.42;

  const so = step * 0.08;
  g.roundRect(so, so, w, h, r);
  g.fill({ color: SHADOW_COLOR, alpha: 0.25 });

  const grad = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: BODY_TOP },
      { offset: 0.45, color: 0x1a1a3a },
      { offset: 1, color: BODY_BOT },
    ],
    textureSpace: "local",
  });

  g.roundRect(0, 0, w, h, r);
  g.fill(grad);
  g.stroke({ width: Math.max(1, step * 0.04), color: BODY_STROKE });

  const nubW = w * 0.25;
  const nubH = step * 0.14;
  const nubR = step * 0.05;

  g.roundRect(w / 2 - nubW / 2, -nubH, nubW, nubH + 1, nubR);
  g.fill(TERMINAL_COLOR);
  g.stroke({ width: Math.max(0.5, step * 0.02), color: 0x5a5a8a });

  g.roundRect(w / 2 - nubW / 2, h, nubW, nubH + 1, nubR);
  g.fill(TERMINAL_COLOR);
  g.stroke({ width: Math.max(0.5, step * 0.02), color: 0x5a5a8a });
}

export function drawRackFill(
  g: Graphics,
  rack: Rack,
  cfg: RackCellConfig,
  flowDirection: string,
): void {
  const { rackWidth: w, rackHeight: h, step } = cfg;
  const fillPct = Math.min(1, Math.max(0, (rack?.soc || 0) / 100));
  const r = w * 0.42;
  const pad = step * 0.14;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const fh = ih * fillPct;
  const fy = pad + (ih - fh);
  const ir = Math.max(0, r - pad);

  let base: number;
  let glow: number;
  if (flowDirection === "Charge") { base = 0x10b981; glow = 0x34d399; }
  else if (flowDirection === "Discharge") { base = 0xf59e0b; glow = 0xfbbf24; }
  else { base = 0x6b7280; glow = 0x9ca3af; }

  if (fillPct <= 0) return;

  const grad = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: glow },
      { offset: 1, color: base },
    ],
    textureSpace: "local",
  });

  g.roundRect(pad, fy, iw, fh, Math.min(ir, fh * 0.5));
  g.fill(grad);

  g.roundRect(pad + step * 0.04, fy, iw - step * 0.08, step * 0.06, step * 0.03);
  g.fill({ color: 0xffffff, alpha: 0.15 });
}

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
  const color = flowDirection === "Charge" ? 0x10b981 : 0xf59e0b;
  const alpha = 0.15 + Math.sin(time * 4.0) * 0.08;

  g.roundRect(-step * 0.08, -step * 0.08, w + step * 0.16, h + step * 0.16, r + step * 0.08);
  g.stroke({ width: Math.max(1, step * 0.07 * pulse), color, alpha });
}

export function drawRackTerminals(
  g: Graphics,
  rack: Rack,
  cfg: RackCellConfig,
): void {
  const { rackWidth: w, step } = cfg;
  const boxW = w * 0.7;
  const boxH = step * 0.38;
  const boxR = step * 0.06;
  const boxCX = w / 2;
  const gap = step * 0.08;
  const startY = step * 0.35;

  const statusOnline = rack.status === "online";
  const statusBorder = statusOnline ? 0x10b981 : 0xef4444;

  let chargeBorder: number;
  if (rack.charge_status === "Charge") chargeBorder = 0x10b981;
  else if (rack.charge_status === "Discharge") chargeBorder = 0xf59e0b;
  else chargeBorder = 0x6b7280;

  const borders = [0x3d3d5e, statusBorder, chargeBorder, 0x3b82f6, 0x3b82f6, 0xf59e0b];
  const borderAlphas = [0.6, 0.6, 0.6, 0.25, 0.18, 0.18];

  for (let row = 0; row < 6; row++) {
    const bx = boxCX - boxW / 2;
    const by = startY + row * (boxH + gap);

    g.roundRect(bx, by, boxW, boxH, boxR);
    g.fill({ color: SCREEN_BG, alpha: 0.85 });
    g.stroke({ width: Math.max(0.4, step * 0.015), color: borders[row]!, alpha: borderAlphas[row]! });
  }
}
