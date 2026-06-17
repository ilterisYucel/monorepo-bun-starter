import type { JSX } from "react";
import type { Rack } from "../../types";
import type { StepConfig, BSCPositions } from "./BSCGraphic.types";

interface LabelInputs {
  config: StepConfig;
  positions: BSCPositions;
  racks: Rack[];
  deviceId: string;
  flowDirection: "Charge" | "Discharge" | "Idle";
  showFlowDirection?: boolean;
  breakerStatus: "online" | "offline";
  breakerPosition: "open" | "close";
  dcOutput:
    | { status: "online" | "offline"; voltage: number; current: number }
    | undefined;
  canvasWidth: number;
}

export function buildLabels(inputs: LabelInputs): JSX.Element[] {
  const {
    config,
    positions,
    racks,
    deviceId,
    flowDirection,
    showFlowDirection = true,
    breakerStatus,
    breakerPosition,
    dcOutput,
    canvasWidth,
  } = inputs;

  const { step, rackWidth, rackHeight } = config;
  const {
    racks: rackPositions,
    circuitBreaker: cb,
    convergence: cv,
    output,
    topBusY,
    bottomBusY,
  } = positions;

  if (!config || !positions) return [];

  const components: JSX.Element[] = [];
  const headerFontSize = Math.max(13, step * 0.36);
  const fontSize = Math.max(10, step * 0.28);
  const smallFontSize = Math.max(8, step * 0.25);
  const tinyFontSize = Math.max(7, step * 0.2);

  // Header - Device ID
  components.push(
    <pixiText
      key="device-id"
      text={deviceId}
      x={step * 0.8}
      y={step * 0.4}
      anchor={0.5}
      style={{
        fontSize: headerFontSize,
        fill: 0xe5e7eb,
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
  );

  // Header - Flow Direction
  if (showFlowDirection) {
    components.push(
      <pixiText
        key="flow-direction"
        text={
          flowDirection === "Charge"
            ? "CHARGE"
            : flowDirection === "Discharge"
              ? "DISCHARGE"
              : "IDLE"
        }
        x={canvasWidth - step * 1.5}
        y={step * 0.4}
        anchor={0.5}
        style={{
          fontSize: headerFontSize,
          fill:
            flowDirection === "Charge"
              ? 0x10b981
              : flowDirection === "Discharge"
                ? 0xf59e0b
                : 0x6b7280,
          fontFamily: "monospace",
          fontWeight: "bold",
        }}
      />,
    );
  }

  // Bus bar labels
  const busLabelX = rackPositions[0]!.x - step * 0.3;

  components.push(
    <pixiText
      key="bus-label-plus"
      text="+"
      x={busLabelX}
      y={topBusY}
      anchor={0.5}
      style={{
        fontSize: Math.max(15, step * 0.4),
        fill: 0x10b981,
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
    <pixiText
      key="bus-label-minus"
      text="-"
      x={busLabelX}
      y={bottomBusY}
      anchor={0.5}
      style={{
        fontSize: Math.max(15, step * 0.4),
        fill: 0xf59e0b,
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
  );

  // Rack labels
  for (let idx = 0; idx < rackPositions.length; idx++) {
    const rackPos = rackPositions[idx]!;
    const rackData = racks[idx];
    const isOnline = rackData?.status === "online";
    const centerX = rackPos.x + rackWidth / 2;

    components.push(
      <pixiText
        key={`id-${rackPos.id}`}
        text={`R${String(rackData?.id ?? rackPos.id).padStart(2, "0")}`}
        x={centerX}
        y={rackPos.y + step * 0.35}
        anchor={0.5}
        style={{
          fontSize,
          fill: 0xe5e7eb,
          fontFamily: "monospace",
          fontWeight: "bold",
        }}
      />,
      <pixiText
        key={`status-${rackPos.id}`}
        text={isOnline ? "Online" : "Offline"}
        x={centerX}
        y={rackPos.y + step * 0.8}
        anchor={0.5}
        style={{
          fontSize: smallFontSize,
          fill: isOnline ? 0x10b981 : 0xef4444,
          fontFamily: "monospace",
        }}
      />,
      <pixiText
        key={`voltage-${rackPos.id}`}
        text={`${rackData?.voltage?.toFixed(1) || "0.0"}V`}
        x={centerX}
        y={rackPos.y + step * 1.25}
        anchor={0.5}
        style={{
          fontSize: smallFontSize,
          fill: 0xffffff,
          fontFamily: "monospace",
          fontWeight: "bold",
          align: "center",
        }}
      />,
      <pixiText
        key={`charge-status-${rackPos.id}`}
        text={
          rackData?.charge_status === "Charge"
            ? "Charge"
            : rackData?.charge_status === "Discharge"
              ? "Discharge"
              : "Idle"
        }
        x={centerX}
        y={rackPos.y + step * 1.75}
        anchor={0.5}
        style={{
          fontSize: smallFontSize,
          fill:
            rackData?.charge_status === "Charge"
              ? 0x10b981
              : rackData?.charge_status === "Discharge"
                ? 0xf59e0b
                : 0x6b7280,
          fontFamily: "monospace",
          fontWeight: "bold",
        }}
      />,
      <pixiText
        key={`soc-${rackPos.id}`}
        text={`${rackData?.soc?.toFixed(1) || "0.0"}%`}
        x={centerX}
        y={rackPos.y + step * 2.25}
        anchor={0.5}
        style={{
          fontSize: smallFontSize,
          fill: 0x00ff00,
          fontFamily: "monospace",
          fontWeight: "bold",
        }}
      />,
    );

    // Top bus voltage (place above top bus bar)
    components.push(
      <pixiText
        key={`top-v-${rackPos.id}`}
        text={`${rackData?.voltage?.toFixed(1) || "0.0"}V`}
        x={centerX}
        y={topBusY - step * 0.25}
        anchor={0.5}
        style={{
          fontSize: tinyFontSize,
          fill: 0x9ca3af,
          fontFamily: "monospace",
        }}
      />,
    );

    // Bottom bus current (place below bottom bus bar)
    components.push(
      <pixiText
        key={`bottom-a-${rackPos.id}`}
        text={`${rackData?.current?.toFixed(1) || "0.0"}A`}
        x={centerX}
        y={bottomBusY + step * 0.25}
        anchor={0.5}
        style={{
          fontSize: tinyFontSize,
          fill: 0x9ca3af,
          fontFamily: "monospace",
        }}
      />,
    );
  }

  // Circuit breaker labels
  const isBreakerActive = breakerStatus === "online";
  const isBreakerClosed = breakerPosition === "close";
  const cbCenterX = (cv.x + step * 0.2 + cb.endX) / 2;
  const cbCenterY = (topBusY + bottomBusY) / 2;
  const labelY = cbCenterY + step * 0.6;

  components.push(
    <pixiText
      key="cb-label"
      text="CB"
      x={cbCenterX}
      y={labelY}
      anchor={0.5}
      style={{
        fontSize: tinyFontSize + 4,
        fill: 0x9ca3af,
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
    <pixiText
      key="cb-active"
      text={isBreakerActive ? "Online" : "Offline"}
      x={cbCenterX}
      y={labelY + step * 0.5}
      anchor={0.5}
      style={{
        fontSize: tinyFontSize + 1,
        fill: isBreakerActive ? 0x10b981 : 0xef4444,
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
    <pixiText
      key="cb-position"
      text={isBreakerClosed ? "Closed" : "Open"}
      x={cbCenterX}
      y={labelY + step}
      anchor={0.5}
      style={{
        fontSize: tinyFontSize + 1,
        fill: isBreakerClosed ? 0x10b981 : 0xf59e0b,
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
  );

  // DC Output labels
  components.push(
    <pixiText
      key="out-label"
      text="DC"
      x={output.x}
      y={output.y - output.radius - step * 0.25}
      anchor={0.5}
      style={{
        fontSize: Math.max(9, step * 0.22),
        fill: 0xffffff,
        fontFamily: "monospace",
        fontWeight: "bold",
      }}
    />,
  );

  if (dcOutput) {
    components.push(
      <pixiText
        key="out-voltage"
        text={`${dcOutput.voltage}V`}
        x={output.x}
        y={output.y + output.radius + step * 0.25}
        anchor={0.5}
        style={{
          fontSize: tinyFontSize + 3,
          fill: 0x9ca3af,
          fontFamily: "monospace",
        }}
      />,
      <pixiText
        key="out-current"
        text={`${dcOutput.current}A`}
        x={output.x}
        y={output.y + output.radius + 0.75 * step}
        anchor={0.5}
        style={{
          fontSize: tinyFontSize + 3,
          fill: 0xf59e0b,
          fontFamily: "monospace",
          fontWeight: "bold",
        }}
      />,
    );
  }

  return components;
}
