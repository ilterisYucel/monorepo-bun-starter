import { Graphics } from "pixi.js";
import type { FlowDirection, Point2D } from "../../types";
import { COLOR } from "../../../colors";

export function drawCableBody(
  g: Graphics,
  path: Point2D[],
  color: number,
  thickness: number,
): void {
  if (path.length < 2) return;

  g.setStrokeStyle({
    width: thickness,
    color,
    cap: "round",
    join: "round",
  });

  g.moveTo(path[0]!.x, path[0]!.y);
  for (let i = 1; i < path.length; i++) {
    g.lineTo(path[i]!.x, path[i]!.y);
  }
  g.stroke();
}

function segmentData(path: Point2D[]) {
  const segLens: number[] = [];
  const cumDists: number[] = [0];
  let totalLen = 0;

  for (let i = 1; i < path.length; i++) {
    const dx = path[i]!.x - path[i - 1]!.x;
    const dy = path[i]!.y - path[i - 1]!.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLens.push(len);
    totalLen += len;
    cumDists.push(totalLen);
  }

  return { segLens, cumDists, totalLen };
}

export function drawCableArrows(
  g: Graphics,
  path: Point2D[],
  flowDirection: FlowDirection,
  time: number,
  arrowSize: number,
): void {
  if (flowDirection === "idle" || path.length < 2) return;

  const { segLens, cumDists, totalLen } = segmentData(path);
  if (totalLen < 1) return;

  const isCharge = flowDirection === "charge";
  const arrowColor = isCharge ? COLOR.success : COLOR.warning;
  const speed = arrowSize * 8;
  const spacing = arrowSize * 4;
  const fadeDist = arrowSize * 3;
  const halfW = arrowSize * 0.5;

  const phase = (time * speed) % spacing;

  if (isCharge) {
    for (let pos = phase; pos <= totalLen; pos += spacing) {
      drawOneArrow(g, path, segLens, cumDists, pos, totalLen, fadeDist, arrowColor, arrowSize, halfW, true);
    }
  } else {
    for (let pos = totalLen - phase; pos >= 0; pos -= spacing) {
      drawOneArrow(g, path, segLens, cumDists, pos, totalLen, fadeDist, arrowColor, arrowSize, halfW, false);
    }
  }
}

function drawOneArrow(
  g: Graphics,
  path: Point2D[],
  segLens: number[],
  cumDists: number[],
  pos: number,
  totalLen: number,
  fadeDist: number,
  arrowColor: number,
  arrowSize: number,
  halfW: number,
  isCharge: boolean,
): void {
  const edgeDist = Math.min(pos, totalLen - pos);
  const alpha = Math.min(1, edgeDist / fadeDist);
  if (alpha <= 0.01) return;

  let segIdx = 0;
  while (segIdx < segLens.length && pos >= cumDists[segIdx + 1]!) segIdx++;
  if (segIdx >= segLens.length) return;

  const segStart = cumDists[segIdx]!;
  const segOffset = pos - segStart;
  const segLen = segLens[segIdx]!;
  if (segLen < 0.01) return;

  const t = segOffset / segLen;
  const p1 = path[segIdx]!;
  const p2 = path[segIdx + 1]!;
  const ax = p1.x + (p2.x - p1.x) * t;
  const ay = p1.y + (p2.y - p1.y) * t;

  const ux = (p2.x - p1.x) / segLen;
  const uy = (p2.y - p1.y) / segLen;
  const perpX = -uy;
  const perpY = ux;

  const tipDir = isCharge ? 1 : -1;
  const tipX = ax + ux * arrowSize * tipDir;
  const tipY = ay + uy * arrowSize * tipDir;

  g.moveTo(tipX, tipY);
  g.lineTo(ax + perpX * halfW, ay + perpY * halfW);
  g.lineTo(ax - perpX * halfW, ay - perpY * halfW);
  g.closePath();
  g.fill({ color: arrowColor, alpha });
}

export function getCableColor(): number {
  return COLOR.cable;
}
