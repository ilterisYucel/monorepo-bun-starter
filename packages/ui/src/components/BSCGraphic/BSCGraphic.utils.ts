import type { StepConfig, BSCPositions, RackPosition } from "./BSCGraphic.types";

const RACK_COUNT = 8;

export const calculateStepConfig = (width: number): StepConfig => {
  const step = width / 20;

  return {
    step,
    rackWidth: 1.55 * step,
    rackHeight: 5.5 * step,
    rackGap: 0.12 * step,
    outputRadius: 0.78 * step,
    startX: 1.0 * step,
    startY: 0.8 * step,
  };
};

export const getRackPositions = (config: StepConfig): BSCPositions => {
  const { step, rackWidth, rackHeight, rackGap, outputRadius, startX, startY } =
    config;

  const topBusY = startY - 0.3 * step;
  const bottomBusY = startY + rackHeight + 0.3 * step;
  const centerY = startY + rackHeight / 2;

  const positions: RackPosition[] = [];
  let currentX = startX;

  for (let i = 0; i < RACK_COUNT; i++) {
    positions.push({ id: i + 1, x: currentX, y: startY });
    currentX += rackWidth + rackGap;
  }

  const lastRack = positions[positions.length - 1]!;
  const lastRackRight = lastRack.x + rackWidth;
  const convergenceX = lastRackRight + 0.5 * step;
  const cbGapSize = 0.22 * step;
  const cbStartX = convergenceX + 0.3 * step;
  const cbLength = 2.0 * step;

  const outputX = cbStartX + cbLength + outputRadius;

  return {
    racks: positions,
    topBusY,
    bottomBusY,
    convergence: {
      x: convergenceX,
      topY: topBusY,
      bottomY: bottomBusY,
    },
    circuitBreaker: {
      startX: cbStartX,
      endX: cbStartX + cbLength,
      y: centerY,
      gapSize: cbGapSize,
    },
    output: {
      x: outputX,
      y: centerY,
      radius: outputRadius,
    },
  };
};
