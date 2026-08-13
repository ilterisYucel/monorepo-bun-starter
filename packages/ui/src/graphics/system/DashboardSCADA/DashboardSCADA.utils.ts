import type { SCADAStepConfig } from "./DashboardSCADA.types";

const RACK_COUNT = 8;

export function calculateSCADAConfig(
  width: number,
  bscCount: number,
  roomCount: number,
): SCADAStepConfig {
  const step = width / 20;

  const rackWidth = 1.55 * step;
  const rackHeight = 5.5 * step;
  const rackGap = 0.12 * step;
  const outputRadius = 0.78 * step;
  const bscStartX = 1.0 * step;
  const cbLength = 2.0 * step;
  const summaryHeight = 3.0 * step;

  const bscSectionHeight = (rackHeight + step * 1.0 + summaryHeight + step * 0.5) * bscCount;

  const hvacStartY = bscStartX + bscSectionHeight + step * 1.5;
  const panelWidth = 2.2 * step;
  const panelGap = step * 0.6;
  const endPadding = step * 0.5;
  const availableRoomWidth = width - bscStartX - panelGap - panelWidth - endPadding;
  const roomWidth = roomCount > 0 ? availableRoomWidth / roomCount : 3 * step;
  const roomHeight = 7.5 * step;

  const hvacSectionHeight = roomCount > 0 ? roomHeight + step * 1.0 : step * 2.0;
  const terminalStartY = hvacStartY + hvacSectionHeight + step;
  const terminalHeight = 5.0 * step;

  const totalHeight = terminalStartY + terminalHeight + step;

  return {
    step,
    rackWidth,
    rackHeight,
    rackGap,
    outputRadius,
    bscStartX,
    bscStartY: step * 1.3,
    cbLength,
    summaryHeight,
    roomWidth,
    roomHeight,
    hvacStartY,
    panelWidth,
    panelGap,
    terminalStartY,
    terminalHeight,
    totalHeight,
  };
}
