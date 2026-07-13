import { Graphics } from "pixi.js";
import type { Rack } from "../../../types";
import type { ChargeStatus } from "@gd-monorepo/shared-types";
import type {
  StepConfig,
  BSCPositions,
  RackPosition,
} from "./BSCGraphic.types";

const COLOR_BG = 0x1e1e2e;
const COLOR_BORDER = 0x3d3d5e;
const COLOR_CHARGE = 0x10b981;
const COLOR_DISCHARGE = 0xf59e0b;
const COLOR_IDLE = 0x6b7280;
const COLOR_OFFLINE = 0xef4444;
const COLOR_OUTPUT = 0x3b82f6;
const COLOR_CABLE = 0x5a5a7a;
const COLOR_WHITE = 0xffffff;

export function drawRack(
  g: Graphics,
  rackPos: RackPosition,
  rack: Rack,
  config: StepConfig,
  flowDirection: string,
): void {
  const { rackWidth, rackHeight, step } = config;
  const fillPercent = Math.min(1, Math.max(0, (rack?.soc || 0) / 100));

  let fillColor = COLOR_IDLE;
  if (flowDirection === "Charge") fillColor = COLOR_CHARGE;
  if (flowDirection === "Discharge") fillColor = COLOR_DISCHARGE;

  const x = rackPos.x;
  const y = rackPos.y;

  g.clear();
  g.rect(x, y, rackWidth, rackHeight);
  g.fill(COLOR_BG);
  g.stroke({ width: Math.max(1.5, step * 0.05), color: COLOR_BORDER });

  const terminalWidth = Math.max(5, step * 0.22);
  const terminalHeight = Math.max(3, step * 0.12);
  g.rect(
    x + rackWidth / 2 - terminalWidth / 2,
    y - terminalHeight,
    terminalWidth,
    terminalHeight,
  );
  g.fill(COLOR_BORDER);
  g.rect(
    x + rackWidth / 2 - terminalWidth / 2,
    y + rackHeight,
    terminalWidth,
    terminalHeight,
  );
  g.fill(COLOR_BORDER);

  const innerPadding = Math.max(2, step * 0.1);
  const innerWidth = rackWidth - innerPadding * 2;
  const innerHeight = rackHeight - innerPadding * 2;
  const fillHeight = innerHeight * fillPercent;
  g.rect(
    x + innerPadding,
    y + innerPadding + (innerHeight - fillHeight),
    innerWidth,
    fillHeight,
  );
  g.fill(fillColor);

  if (rack?.charge_status === "Charge") {
    g.stroke({ width: Math.max(1.5, step * 0.05), color: COLOR_CHARGE });
  } else if (rack?.charge_status === "Discharge") {
    g.stroke({ width: Math.max(1.5, step * 0.05), color: COLOR_DISCHARGE });
  }
}

export function drawRackBorders(
  g: Graphics,
  positions: BSCPositions,
  config: StepConfig,
  racks: Rack[],
): void {
  const { step } = config;

  for (let i = 0; i < positions.racks.length; i++) {
    const rackPos = positions.racks[i]!;
    const rack = racks[i];

    if (!rack) continue;

    g.rect(rackPos.x, rackPos.y, config.rackWidth, config.rackHeight);

    if (rack.charge_status === "Charge") {
      g.stroke({ width: Math.max(1.5, step * 0.05), color: COLOR_CHARGE });
    } else if (rack.charge_status === "Discharge") {
      g.stroke({ width: Math.max(1.5, step * 0.05), color: COLOR_DISCHARGE });
    }
  }
}

export function drawCables(
  g: Graphics,
  config: StepConfig,
  positions: BSCPositions,
): void {
  const { rackWidth, rackHeight, step } = config;
  const { racks, topBusY, bottomBusY, convergence } = positions;

  const firstRack = racks[0]!;
  const busLeftX = firstRack.x;
  const busRightX = convergence.x;

  g.clear();
  g.setStrokeStyle({
    width: Math.max(1.5, step * 0.06),
    color: COLOR_CABLE,
  });

  g.moveTo(busLeftX, topBusY);
  g.lineTo(busRightX, topBusY);
  g.stroke();

  g.moveTo(busLeftX, bottomBusY);
  g.lineTo(busRightX, bottomBusY);
  g.stroke();

  for (const rack of racks) {
    const centerX = rack.x + rackWidth / 2;
    g.moveTo(centerX, rack.y);
    g.lineTo(centerX, topBusY);
    g.stroke();
  }

  for (const rack of racks) {
    const centerX = rack.x + rackWidth / 2;
    g.moveTo(centerX, rack.y + rackHeight);
    g.lineTo(centerX, bottomBusY);
    g.stroke();
  }
}

export function drawConvergence(
  g: Graphics,
  config: StepConfig,
  positions: BSCPositions,
  breakerStatus: "online" | "offline",
  breakerPosition: "open" | "close",
): void {
  const { step } = config;
  const { convergence: cv, topBusY, bottomBusY } = positions;
  const isActive = breakerStatus === "online";
  const isClosed = breakerPosition === "close";

  const color = isActive
    ? isClosed
      ? COLOR_CHARGE
      : COLOR_DISCHARGE
    : COLOR_OFFLINE;
  const strokeW = Math.max(1.5, step * 0.06);

  const centerY = (topBusY + bottomBusY) / 2;
  const diagonalX = cv.x + step * 0.2;

  g.setStrokeStyle({ width: strokeW, color });

  // Top bus → corner → diagonal down to center
  g.moveTo(cv.x - step * 0.25, topBusY);
  g.lineTo(cv.x, topBusY);
  g.lineTo(diagonalX, centerY);
  g.stroke();

  // Bottom bus → corner → diagonal up to center
  g.moveTo(cv.x - step * 0.25, bottomBusY);
  g.lineTo(cv.x, bottomBusY);
  g.lineTo(diagonalX, centerY);
  g.stroke();

  // Convergence dot
  const dotRadius = Math.max(2, step * 0.08);
  g.circle(diagonalX, centerY, dotRadius);
  g.fill(isActive ? color : COLOR_OFFLINE);
}

export function drawCircuitBreaker(
  g: Graphics,
  config: StepConfig,
  positions: BSCPositions,
  breakerStatus: "online" | "offline",
  breakerPosition: "open" | "close",
  timestampRef: { current: number },
): void {
  const { step } = config;
  const {
    circuitBreaker: cb,
    convergence: cv,
    topBusY,
    bottomBusY,
  } = positions;

  const isActive = breakerStatus === "online";
  const isClosed = breakerPosition === "close";

  const centerY = (topBusY + bottomBusY) / 2;
  const lineStartX = cv.x + step * 0.2;
  const strokeW = Math.max(3, step * 0.14);

  const actualMidX = (lineStartX + cb.endX) / 2;
  const gap = cb.gapSize * 1.8;

  if (isClosed) {
    const color = isActive ? COLOR_CHARGE : COLOR_OFFLINE;

    // Left segment
    g.setStrokeStyle({ width: strokeW, color });
    g.moveTo(lineStartX, centerY);
    g.lineTo(actualMidX - gap, centerY);
    g.stroke();

    // `/` diagonal — closed = connected
    g.setStrokeStyle({ width: strokeW, color });
    g.moveTo(actualMidX - gap, centerY - gap * 0.5);
    g.lineTo(actualMidX + gap, centerY + gap * 0.5);
    g.stroke();

    // Right segment
    g.setStrokeStyle({ width: strokeW, color });
    g.moveTo(actualMidX + gap, centerY);
    g.lineTo(cb.endX, centerY);
    g.stroke();
  } else {
    const color = isActive ? COLOR_DISCHARGE : COLOR_OFFLINE;

    // Left segment
    g.setStrokeStyle({ width: strokeW, color });
    g.moveTo(lineStartX, centerY);
    g.lineTo(actualMidX - gap, centerY);
    g.stroke();

    // `|` vertical — open = disconnected
    g.setStrokeStyle({ width: strokeW, color });
    g.moveTo(actualMidX, centerY - gap * 0.85);
    g.lineTo(actualMidX, centerY + gap * 0.85);
    g.stroke();

    // Right segment
    g.setStrokeStyle({ width: strokeW, color });
    g.moveTo(actualMidX + gap, centerY);
    g.lineTo(cb.endX, centerY);
    g.stroke();
  }

  // Pulse node — same size for both open/closed when active
  const dotColor = isActive
    ? isClosed
      ? COLOR_CHARGE
      : COLOR_DISCHARGE
    : COLOR_OFFLINE;
  const pulse = isActive ? 1 + Math.sin(timestampRef.current * 0.004) * 0.3 : 1;
  const dotR = step * 0.1 * pulse;
  g.circle(actualMidX, centerY, dotR);
  g.fill(dotColor);
}

export function drawOutput(
  g: Graphics,
  config: StepConfig,
  positions: BSCPositions,
  dcOutput: { status: "online" | "offline" } | undefined,
  timestampRef: { current: number },
): void {
  const { step, outputRadius } = config;
  const { output } = positions;
  const isActive = dcOutput?.status === "online";
  const color = isActive ? COLOR_OUTPUT : COLOR_IDLE;

  const glowSize = isActive
    ? 1.5 + Math.sin(timestampRef.current * 0.005) * 0.8
    : 0;

  g.clear();

  if (isActive && glowSize > 0) {
    g.circle(output.x, output.y, outputRadius + glowSize);
    g.fill({ color: COLOR_OUTPUT, alpha: 0.2 });
  }

  g.circle(output.x, output.y, outputRadius);
  g.fill(color);
  g.stroke({ width: Math.max(1, step * 0.04), color: COLOR_BORDER });

  // Lightning bolt symbol — horizontal, 5-segment electric zigzag
  const boltSize = Math.max(5, step * 0.24);
  g.moveTo(output.x - boltSize, output.y + boltSize * 0.6);
  g.lineTo(output.x - boltSize * 0.4, output.y - boltSize * 0.4);
  g.lineTo(output.x - boltSize * 0.1, output.y + boltSize * 0.5);
  g.lineTo(output.x + boltSize * 0.2, output.y - boltSize * 0.5);
  g.lineTo(output.x + boltSize * 0.5, output.y + boltSize * 0.3);
  g.lineTo(output.x + boltSize, output.y - boltSize * 0.6);
  g.stroke({ width: Math.max(2, step * 0.06), color: COLOR_WHITE });

  // Status dot top-right
  const dotR = Math.max(1.5, step * 0.05);
  g.circle(output.x, output.y - outputRadius + dotR * 2, dotR);
  g.fill(isActive ? COLOR_OUTPUT : COLOR_IDLE);
}

export function drawFlowArrows(
  g: Graphics,
  config: StepConfig,
  positions: BSCPositions,
  flowDirection: ChargeStatus,
  breakerStatus: "online" | "offline",
  breakerPosition: "open" | "close",
  dcOutput: { status: "online" | "offline" } | undefined,
  timestampRef: { current: number },
): void {
  const { step } = config;
  const {
    racks,
    convergence: cv,
    circuitBreaker: cb,
    output,
    topBusY,
    bottomBusY,
  } = positions;

  const canFlow =
    flowDirection !== "Idle" &&
    breakerStatus === "online" &&
    breakerPosition === "close" &&
    dcOutput?.status === "online";

  if (!canFlow) return;

  const flowProgress = (timestampRef.current % 2500) / 2500;
  const flowColor = flowDirection === "Charge" ? COLOR_CHARGE : COLOR_DISCHARGE;
  const arrowSize = Math.max(3, step * 0.1);
  const convergenceCenterY = (topBusY + bottomBusY) / 2;
  const lineStartX = cv.x + step * 0.2;
  const isCharge = flowDirection === "Charge";

  const drawArrow = (x: number, y: number, dir: number) => {
    g.moveTo(x + arrowSize * dir, y);
    g.lineTo(x, y - arrowSize / 2);
    g.lineTo(x, y + arrowSize / 2);
    g.closePath();
    g.fill(flowColor);
  };

  // Segment 1: CB line (convergence center → output edge)
  {
    const segStart = lineStartX;
    const segEnd = output.x - output.radius;
    const distance = segEnd - segStart;

    for (let i = 0; i < 4; i++) {
      const phase = i * 0.2;
      const raw = (flowProgress + phase) % 1;
      const offset = isCharge ? 1 - raw : raw;
      const x = segStart + distance * offset;
      const dir = isCharge ? -1 : 1;
      drawArrow(x, convergenceCenterY, dir);
    }
  }

  // Segment 2: Top bus bar (all racks)
  {
    const segStart = racks[0]!.x + config.rackWidth / 2;
    const segEnd = cv.x;
    const distance = segEnd - segStart;

    for (let i = 0; i < 5; i++) {
      const phase = i * 0.16;
      const raw = (flowProgress + phase) % 1;
      const offset = isCharge ? 1 - raw : raw;
      const x = segStart + distance * offset;
      const dir = isCharge ? -1 : 1;
      drawArrow(x, topBusY, dir);
    }
  }

  // Segment 3: Bottom bus bar (all racks, opposite phase)
  {
    const segStart = racks[0]!.x + config.rackWidth / 2;
    const segEnd = cv.x;
    const distance = segEnd - segStart;

    for (let i = 0; i < 5; i++) {
      const phase = i * 0.16 + 0.5;
      const raw = (flowProgress + phase) % 1;
      const offset = raw;
      const x = segStart + distance * offset;
      const dir = isCharge ? 1 : -1;
      drawArrow(x, bottomBusY, dir);
    }
  }
}
