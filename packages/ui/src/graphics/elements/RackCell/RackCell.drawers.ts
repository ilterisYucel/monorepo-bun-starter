import { Graphics, FillGradient } from "pixi.js";
import type { Rack } from "../../../types";
import type { RackCellConfig } from "./RackCell.types";
import { COLOR } from "../../../colors";

export function drawRackBody(g: Graphics, cfg: RackCellConfig): void {
  const { rackWidth: w, rackHeight: h, step } = cfg;
  const r = w * 0.42;

  const so = step * 0.08;
  g.roundRect(so, so, w, h, r);
  g.fill({ color: COLOR.shadow, alpha: 0.25 });

  const grad = new FillGradient({
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

  g.roundRect(0, 0, w, h, r);
  g.fill(grad);
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
  if (flowDirection === "Charge") { base = COLOR.success; glow = COLOR.successGlow; }
  else if (flowDirection === "Discharge") { base = COLOR.warning; glow = COLOR.warningGlow; }
  else { base = COLOR.idle; glow = COLOR.textMuted; }

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
  g.fill({ color: COLOR.textWhite, alpha: 0.15 });
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
  const color = flowDirection === "Charge" ? COLOR.success : COLOR.warning;
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
  const statusBorder = statusOnline ? COLOR.success : COLOR.error;

  let chargeBorder: number;
  if (rack.charge_status === "Charge") chargeBorder = COLOR.success;
  else if (rack.charge_status === "Discharge") chargeBorder = COLOR.warning;
  else chargeBorder = COLOR.idle;

  const borders = [COLOR.borderStroke, statusBorder, chargeBorder, COLOR.info, COLOR.info, COLOR.warning];
  const borderAlphas = [0.6, 0.6, 0.6, 0.25, 0.18, 0.18];

  for (let row = 0; row < 6; row++) {
    const bx = boxCX - boxW / 2;
    const by = startY + row * (boxH + gap);

    g.roundRect(bx, by, boxW, boxH, boxR);
    g.fill({ color: COLOR.gradScreen, alpha: 0.85 });
    g.stroke({ width: Math.max(0.4, step * 0.015), color: borders[row]!, alpha: borderAlphas[row]! });
  }
}
