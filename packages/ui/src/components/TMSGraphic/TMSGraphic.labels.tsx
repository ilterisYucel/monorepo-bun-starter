import type { JSX } from "react";
import type {
  StepConfig,
  TMSLayout,
  RoomData,
  HvacData,
} from "./TMSGraphic.types";
import { getTempColor } from "./TMSGraphic.drawers";

interface LabelInputs {
  config: StepConfig;
  layout: TMSLayout;
  rooms: RoomData[];
  panelTemp: number;
  canvasWidth: number;
}

export function buildLabels(inputs: LabelInputs): JSX.Element[] {
  const { config, layout, rooms, panelTemp, canvasWidth } = inputs;
  const { step } = config;

  const components: JSX.Element[] = [];
  const titleFontSize = Math.max(11, step * 0.3);
  const tempFontSize = Math.max(13, step * 0.4);
  const hvacFontSize = Math.max(8, step * 0.22);
  const smallFontSize = Math.max(7, step * 0.2);
  const panelFontSize = Math.max(10, step * 0.28);

  for (let i = 0; i < layout.rooms.length; i++) {
    const roomPos = layout.rooms[i]!;
    const roomData = rooms[i];
    if (!roomData) continue;

    const centerX = roomPos.x + roomPos.width / 2;

    components.push(
      <pixiText
        key={`room-title-${i}`}
        text={`Room ${i + 1} Temp`}
        x={centerX}
        y={roomPos.y + step * 0.7}
        anchor={0.5}
        style={{
          fontSize: titleFontSize,
          fill: 0xe5e7eb,
          fontFamily: "monospace",
          fontWeight: "bold",
        }}
      />,
      <pixiText
        key={`room-temp-${i}`}
        text={`${roomData.temp.toFixed(1)} °C`}
        x={centerX}
        y={roomPos.y + step * 1.7}
        anchor={0.5}
        style={{
          fontSize: tempFontSize,
          fill: getTempColor(roomData.temp),
          fontFamily: "monospace",
          fontWeight: "bold",
        }}
      />,
    );

    const hvacLabels = buildHvacLabels(roomPos.hvac1, roomData.hvacs[0], 1, i, config);
    const hvac2Labels = buildHvacLabels(roomPos.hvac2, roomData.hvacs[1]!, 2, i, config);
    components.push(...hvacLabels, ...hvac2Labels);
  }

  const panelCenterX = layout.panel.x + layout.panel.width / 2;

  components.push(
    <pixiText
      key="panel-title"
      text="Panel Temp"
      x={panelCenterX}
      y={layout.panel.y + step * 0.7}
      anchor={0.5}
      style={{
        fontSize: panelFontSize,
        fill: 0x9ca3af,
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
    <pixiText
      key="panel-temp"
      text={`${panelTemp.toFixed(1)} °C`}
      x={panelCenterX}
      y={layout.panel.y + config.step * 1.7}
      anchor={0.5}
      style={{
        fontSize: tempFontSize,
        fill: getTempColor(panelTemp),
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
  );

  return components;
}

function buildHvacLabels(
  pos: { x: number; y: number; width: number; height: number },
  hvac: HvacData,
  hvacNum: number,
  roomIdx: number,
  config: StepConfig,
): JSX.Element[] {
  const { step } = config;
  const centerX = pos.x + pos.width / 2;
  const isOnline = hvac.status === "online";

  const modeColor =
    hvac.mode === "cooling"
      ? 0x3b82f6
      : hvac.mode === "warming"
        ? 0xf59e0b
        : 0x6b7280;

  const labels: JSX.Element[] = [
    <pixiText
      key={`hvac-label-${roomIdx}-${hvacNum}`}
      text={`HVAC ${hvacNum}`}
      x={centerX}
      y={pos.y + step * 0.4}
      anchor={0.5}
      style={{
        fontSize: Math.max(9, step * 0.24),
        fill: 0xe5e7eb,
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
    <pixiText
      key={`hvac-status-${roomIdx}-${hvacNum}`}
      text={isOnline ? "Online" : "Offline"}
      x={centerX}
      y={pos.y + step * 0.85}
      anchor={0.5}
      style={{
        fontSize: Math.max(7, step * 0.2),
        fill: isOnline ? 0x10b981 : 0xef4444,
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
    <pixiText
      key={`hvac-mode-${roomIdx}-${hvacNum}`}
      text={
        hvac.mode === "cooling"
          ? "Cooling"
          : hvac.mode === "warming"
            ? "Warming"
            : "Idle"
      }
      x={centerX}
      y={pos.y + step * 1.3}
      anchor={0.5}
      style={{
        fontSize: Math.max(7, step * 0.2),
        fill: modeColor,
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
  ];

  return labels;
}
