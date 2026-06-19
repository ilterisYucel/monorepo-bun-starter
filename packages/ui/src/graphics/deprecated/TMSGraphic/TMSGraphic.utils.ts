import type { StepConfig, TMSLayout, RoomPosition, RectPosition } from "./TMSGraphic.types";

export const calculateStepConfig = (
  width: number,
  roomCount: number,
): StepConfig => {
  const step = width / 20;
  const startX = 0.5 * step;
  const panelWidth = 2.2 * step;
  const panelGap = step * 0.6;
  const endPadding = step * 0.5;

  const availableWidth = width - startX - panelGap - panelWidth - endPadding;
  const roomWidth = availableWidth / Math.max(1, roomCount);

  return {
    step,
    panelWidth,
    roomWidth,
    roomHeight: 7.5 * step,
    startX,
    startY: 0.8 * step,
  };
};

export const getTMSLayout = (
  config: StepConfig,
  roomCount: number,
): TMSLayout => {
  const { step, panelWidth, roomWidth, roomHeight, startX, startY } = config;

  const rooms: RoomPosition[] = [];

  for (let i = 0; i < roomCount; i++) {
    const x = startX + i * roomWidth;
    const y = startY;

    const hvacAreaHeight = roomHeight * 0.35;
    const hvacY = y + roomHeight - hvacAreaHeight - step * 0.15;
    const hvacGap = step * 0.4;
    const hvacPadding = step * 0.6;
    const hvacWidth =
      (roomWidth - hvacPadding * 2 - hvacGap) / 2;

    const hvac1: RectPosition = {
      x: x + hvacPadding,
      y: hvacY,
      width: hvacWidth,
      height: hvacAreaHeight,
    };

    const hvac2: RectPosition = {
      x: x + hvacPadding + hvacWidth + hvacGap,
      y: hvacY,
      width: hvacWidth,
      height: hvacAreaHeight,
    };

    rooms.push({ index: i, x, y, width: roomWidth, height: roomHeight, hvac1, hvac2 });
  }

  const panelX = startX + roomCount * roomWidth + step * 0.6;
  const panel: RectPosition = {
    x: panelX,
    y: startY,
    width: panelWidth,
    height: roomHeight,
  };

  return { step, panel, rooms };
};
