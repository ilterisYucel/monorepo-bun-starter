import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { RackCellProps } from "./RackCell.types";
import {
  drawRackBody,
  drawRackFill,
  drawRackGlow,
  drawRackTerminals,
} from "./RackCell.drawers";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";

export const RackCell: React.FC<RackCellProps> = ({
  rack, x, y, config, flowDirection, onClick,
}) => {
  const drawBody = useCallback(
    (g: GraphicsType) => { g.clear(); drawRackBody(g, config); },
    [config],
  );

  const drawTerminals = useCallback(
    (g: GraphicsType) => { g.clear(); drawRackTerminals(g, rack, config); },
    [rack, config],
  );

  const drawFill = useCallback(
    (g: GraphicsType) => { g.clear(); drawRackFill(g, rack, config, flowDirection); },
    [rack, config, flowDirection],
  );

  const gGlowRef = usePixiTickerEffect(
    (g, time) => { drawRackGlow(g, rack, config, flowDirection, time); },
    [rack, config, flowDirection],
  );

  const handleClick = useCallback(() => {
    onClick?.(rack, { x, y });
  }, [onClick, rack, x, y]);

  const { step, rackWidth: w } = config;
  const boxH = step * 0.38;
  const boxCX = w / 2;
  const gap = step * 0.08;
  const startY = step * 0.35;
  const boxCY = (row: number) => startY + row * (boxH + gap) + boxH / 2;

  const statusOnline = rack.status === "online";
  const statusColor = statusOnline ? 0x10b981 : 0xef4444;

  let chargeColor: number;
  let chargeLabel: string;
  if (rack.charge_status === "Charge") { chargeColor = 0x10b981; chargeLabel = "CHARGE"; }
  else if (rack.charge_status === "Discharge") { chargeColor = 0xf59e0b; chargeLabel = "DISCHARGE"; }
  else { chargeColor = 0x6b7280; chargeLabel = "IDLE"; }

  const textFs = Math.max(7, step * 0.19);

  return (
    <pixiContainer x={x} y={y} cursor="pointer" eventMode="static" onClick={handleClick}>
      <pixiGraphics draw={drawBody} />
      <pixiGraphics draw={(g: GraphicsType) => { gGlowRef.current = g; }} />
      <pixiGraphics draw={drawFill} />
      <pixiGraphics draw={drawTerminals} />

      <pixiText text={`R${String(rack?.id ?? 0).padStart(2, "0")}`} x={boxCX} y={boxCY(0)} anchor={0.5}
        style={{ fontSize: textFs, fill: 0x9ca3af, fontFamily: "monospace" }} />
      <pixiText text={statusOnline ? "ONLINE" : "OFFLINE"} x={boxCX} y={boxCY(1)} anchor={0.5}
        style={{ fontSize: textFs, fill: statusColor, fontFamily: "monospace", fontWeight: "bold" }} />
      <pixiText text={chargeLabel} x={boxCX} y={boxCY(2)} anchor={0.5}
        style={{ fontSize: textFs, fill: chargeColor, fontFamily: "monospace", fontWeight: "bold" }} />
      <pixiText text={`${(rack?.soc ?? 0).toFixed(1)}%`} x={boxCX} y={boxCY(3)} anchor={0.5}
        style={{ fontSize: textFs, fill: 0xffffff, fontFamily: "monospace", fontWeight: "bold" }} />
      <pixiText text={`${rack.voltage?.toFixed(1) ?? "0.0"}V`} x={boxCX} y={boxCY(4)} anchor={0.5}
        style={{ fontSize: textFs, fill: 0x93c5fd, fontFamily: "monospace" }} />
      <pixiText text={`${rack.current?.toFixed(1) ?? "0.0"}A`} x={boxCX} y={boxCY(5)} anchor={0.5}
        style={{ fontSize: textFs, fill: 0xfbbf24, fontFamily: "monospace" }} />
    </pixiContainer>
  );
};

RackCell.displayName = "RackCell";
