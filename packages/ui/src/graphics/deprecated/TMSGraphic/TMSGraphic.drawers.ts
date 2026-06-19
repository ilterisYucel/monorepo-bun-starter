import { Graphics } from "pixi.js";
import type {
  StepConfig,
  TMSLayout,
  RectPosition,
  HvacData,
} from "./TMSGraphic.types";

const COLOR_BG = 0x1f1f2e;
const COLOR_ROOM_BORDER = 0x3b82f6;
const COLOR_ROOM_BG = 0x14142a;
const COLOR_ONLINE = 0x10b981;
const COLOR_OFFLINE = 0xef4444;
const COLOR_COOLING = 0x3b82f6;
const COLOR_WARMING = 0xf59e0b;
const COLOR_IDLE = 0x6b7280;
const COLOR_PANEL_BORDER = 0x3d3d5e;
const COLOR_PANEL_BG = 0x16162a;
const COLOR_WHITE = 0xffffff;

export function getTempColor(temp: number): number {
  if (temp < 0) return 0x1e40af;
  if (temp < 10) return 0x3b82f6;
  if (temp < 20) return 0x06b6d4;
  if (temp < 25) return 0x10b981;
  if (temp < 30) return 0xf59e0b;
  if (temp < 35) return 0xef4444;
  return 0xdc2626;
}

export function drawRoomBorder(
  g: Graphics,
  pos: RectPosition,
  config: StepConfig,
): void {
  const { step } = config;

  g.rect(pos.x, pos.y, pos.width, pos.height);
  g.fill(COLOR_ROOM_BG);
  g.stroke({ width: Math.max(1.5, step * 0.04), color: COLOR_ROOM_BORDER });
}

export function drawRoomFill(
  g: Graphics,
  pos: RectPosition,
  config: StepConfig,
  temp: number,
): void {
  const { step } = config;
  const fillPadding = step * 0.25;
  const fillY = pos.y + step * 2.6;
  const hvacY = pos.y + pos.height - pos.height * 0.35 - step * 0.15;
  const fillHeight = Math.max(step, hvacY - fillY - step * 0.1);
  const fillX = pos.x + fillPadding;
  const fillWidth = pos.width - fillPadding * 2;

  const color = getTempColor(temp);

  g.rect(fillX, fillY, fillWidth, fillHeight);
  g.fill({ color, alpha: 0.2 });
  g.stroke({ width: Math.max(1.5, step * 0.045), color: COLOR_ROOM_BORDER });
}

export function drawHvac(
  g: Graphics,
  pos: RectPosition,
  hvac: HvacData,
  config: StepConfig,
): void {
  const { step } = config;

  const isOnline = hvac.status === "online";
  const borderColor = isOnline ? COLOR_ONLINE : COLOR_OFFLINE;

  let fillColor = COLOR_IDLE;
  if (isOnline) {
    if (hvac.mode === "cooling") fillColor = COLOR_COOLING;
    else if (hvac.mode === "warming") fillColor = COLOR_WARMING;
  }

  g.rect(pos.x, pos.y, pos.width, pos.height);
  g.fill({ color: fillColor, alpha: 0.2 });
  g.stroke({ width: Math.max(1.5, step * 0.04), color: borderColor });

  const statusDotR = Math.max(2, step * 0.06);
  g.circle(pos.x + pos.width - statusDotR * 2, pos.y + statusDotR * 2, statusDotR);
  g.fill(isOnline ? COLOR_ONLINE : COLOR_OFFLINE);
}

export function drawHvacAnimation(
  g: Graphics,
  pos: RectPosition,
  hvac: HvacData,
  config: StepConfig,
  timestampRef: { current: number },
): void {
  if (hvac.status !== "online" || hvac.mode === "idle") return;

  const { step } = config;
  const isCooling = hvac.mode === "cooling";
  const color = isCooling ? COLOR_COOLING : COLOR_WARMING;

  const glowAlpha = 0.2 + Math.sin(timestampRef.current * 0.004) * 0.2;
  const glowWidth = step * 0.06 * (1 + Math.sin(timestampRef.current * 0.004) * 0.5);
  g.rect(pos.x - glowWidth * 0.5, pos.y - glowWidth * 0.5, pos.width + glowWidth, pos.height + glowWidth);
  g.stroke({ width: glowWidth, color, alpha: glowAlpha });

  const arrowSize = Math.max(4, step * 0.1);
  const arrowGap = step * 0.15;
  const centerX = pos.x + pos.width / 2;
  const arrowAreaTop = pos.y - arrowGap * 3;
  const arrowAreaBottom = pos.y;
  const arrowAreaHeight = arrowAreaBottom - arrowAreaTop;

  const flowProgress = (timestampRef.current % 2500) / 2500;

  for (let i = 0; i < 3; i++) {
    const phase = i * 0.33;
    const raw = (flowProgress + phase) % 1;
    const offset = isCooling ? 1 - raw : raw;
    const ay = arrowAreaTop + arrowAreaHeight * offset;

    g.moveTo(centerX, ay + (isCooling ? arrowSize : -arrowSize));
    g.lineTo(centerX - arrowSize * 0.6, ay);
    g.lineTo(centerX + arrowSize * 0.6, ay);
    g.closePath();
    g.fill({ color, alpha: 0.6 + raw * 0.4 });
  }
}

export function drawPanel(
  g: Graphics,
  pos: RectPosition,
  config: StepConfig,
  panelTemp: number,
): void {
  const { step } = config;

  const tempColor = getTempColor(panelTemp);

  g.rect(pos.x, pos.y, pos.width, pos.height);
  g.fill(COLOR_PANEL_BG);
  g.stroke({ width: Math.max(1.5, step * 0.04), color: COLOR_PANEL_BORDER });

  const innerPad = step * 0.2;
  const innerY = pos.y + step * 2.2;
  const innerHeight = pos.height - step * 3.2;
  g.rect(pos.x + innerPad, innerY, pos.width - innerPad * 2, innerHeight);
  g.fill({ color: tempColor, alpha: 0.25 });
  g.stroke({ width: Math.max(1, step * 0.02), color: tempColor, alpha: 0.5 });
}
