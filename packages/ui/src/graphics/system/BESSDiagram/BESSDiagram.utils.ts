import type { BESSConfig, BSCLayout } from "./BESSDiagram.types";

const RACK_COUNT = 8;
const PAD = 2;

export function calculateBESSConfig(
  width: number,
  height: number,
  bscCount: number,
  roomCount: number,
): BESSConfig {
  const step = width / 28;

  const summaryBarHeight = step * 1.8;
  const topCardFlowW = step * 0.6;
  const topCardEaW = step * 4.0;
  const topCardFireW = step * 3.0;

  const eaWidth = step * 5.0;
  const eaHeight = step * 2.8;
  const gridWidth = step * 1.8;
  const gridHeight = step * 1.2;

  const rackWidth = 1.9 * step;
  const rackHeight = step * 3.6;
  const rackGap = step * 0.08;
  const cbLength = step * 2.0;
  const dcRadius = step * 0.65;

  const bscStartX = step * 0.25;
  const bscStartY = PAD + summaryBarHeight + step * 1.0;

  const bscTotalWidth = RACK_COUNT * (rackWidth + rackGap) - rackGap + step * 0.65 + cbLength + dcRadius * 2;

  const rightBusX = bscStartX + bscTotalWidth + 6;

  const bscMidDCY = bscStartY + (bscCount - 1) * (rackHeight + step * 0.8) / 2 + rackHeight / 2;

  const eaStartX = rightBusX + 10;
  const eaY = bscMidDCY - eaHeight / 2;

  const gridStartX = eaStartX + eaWidth + 10;
  const gridY = bscMidDCY - gridHeight / 2;

  const bscUnitVH = rackHeight + step * 0.8;
  const hvacStartY = bscStartY + bscCount * bscUnitVH + step * 0.8;

  const fireWidth = step * 7.0;
  const fireHeight = step * 3.2;

  const hStep = step;
  const hPanelWidth = step * 2.2;
  const hPanelGap = step * 0.6;
  const hStartX = step * 0.5;
  const roomWidth = step * 2.8;
  const roomHeight = step * 3.8;

  const fireStartX = PAD;
  const fireY = hvacStartY;

  const totalHeight = hvacStartY + roomHeight + step;

  return {
    step,
    hStep,
    summaryBarHeight,
    topCardFlowW,
    topCardEaW,
    topCardFireW,
    rightBusX,
    eaStartX,
    eaY,
    eaWidth,
    eaHeight,
    gridStartX,
    gridY,
    gridWidth,
    gridHeight,
    bscStartX,
    bscStartY,
    rackWidth,
    rackHeight,
    rackGap,
    cbLength,
    dcRadius,
    hvacStartY,
    roomWidth,
    roomHeight,
    panelWidth: hPanelWidth,
    panelGap: hPanelGap,
    fireStartX,
    fireY,
    fireWidth,
    fireHeight,
    totalHeight: Math.max(totalHeight, height),
  };
}

export function getBSCLayout(
  config: BESSConfig,
  bscIndex: number,
): BSCLayout {
  const { rackWidth, rackGap, cbLength, dcRadius, rackHeight, step } = config;

  const perUnitWidth = RACK_COUNT * (rackWidth + rackGap) - rackGap + cbLength + dcRadius * 2 + step * 0.6;

  const startX = config.bscStartX;
  const startY = config.bscStartY + bscIndex * (rackHeight + step * 0.8);

  return {
    startX,
    startY,
    totalWidth: perUnitWidth,
  };
}
