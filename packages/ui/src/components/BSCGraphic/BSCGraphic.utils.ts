import type { StepConfig } from "./BSCGraphic.types";

export const calculateStepConfig = (width: number): StepConfig => {
  const step = width / 18;

  return {
    step,
    rackWidth: 1.5 * step,
    rackHeight: 5 * step,
    rackGap: 0.2 * step,
    breakerWidth: 1.2 * step, // 1.5 -> 1.2
    breakerHeight: 0.6 * step, // 2 -> 1.6
    outputWidth: 1.2 * step, // 1.5 -> 1.2
    outputHeight: 1.6 * step, // 2 -> 1.6
    startX: 0.5 * step,
    startY: 1.5 * step, // Yukarıdan boşluk (header için)
  };
};

export const getRackPositions = (config: StepConfig) => {
  const positions = [];
  let currentX = config.startX;

  for (let i = 0; i < 8; i++) {
    positions.push({
      id: i + 1,
      x: currentX,
      y: config.startY,
    });
    currentX += config.rackWidth + config.rackGap;
  }

  const breakerX = currentX + config.rackGap;
  const breakerCenterY = config.startY + config.rackHeight / 2;
  const outputX = breakerX + config.breakerWidth + config.rackGap;

  return {
    racks: positions,
    breaker: {
      x: breakerX,
      y: breakerCenterY - config.breakerHeight / 2,
    },
    output: {
      x: outputX,
      y: breakerCenterY - config.outputHeight / 2,
    },
  };
};
