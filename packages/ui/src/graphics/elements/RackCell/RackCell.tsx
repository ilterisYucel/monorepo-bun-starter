import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { RackCellProps } from "./RackCell.types";
import {
  drawRackBody,
  drawRackFill,
  drawRackGlow,
  drawRackTerminals,
  drawRackWindowBorders,
} from "./RackCell.drawers";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";
import { hudTextStyle } from "../../hud";
import { COLOR } from "../../../colors";

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

  const { step, rackWidth: w, rackHeight: h } = config;
  const boxH = step * 0.38;
  const boxCX = w / 2;
  const gap = step * 0.08;
  const startY = step * 0.35;
  const boxCY = (row: number) => startY + row * (boxH + gap) + boxH / 2;

  const bodyTexture = useSpriteTexture("rackcell");
  const nubH = step * 0.14;
  const shadowOffset = step * 0.08;

  const statusOnline = rack.status === "online";
  const statusColor = statusOnline ? COLOR.success : COLOR.error;

  let chargeColor: number;
  let chargeLabel: string;
  if (rack.charge_status === "Charge") { chargeColor = COLOR.success; chargeLabel = "CHARGE"; }
  else if (rack.charge_status === "Discharge") { chargeColor = COLOR.warning; chargeLabel = "DISCHARGE"; }
  else { chargeColor = COLOR.idle; chargeLabel = "IDLE"; }

  const textFs = Math.max(7, step * 0.19);

  const styleId = hudTextStyle({ size: textFs, color: COLOR.textMuted });
  const styleStatus = hudTextStyle({ size: textFs, color: statusColor, bold: true, glow: true });
  const styleCharge = hudTextStyle({ size: textFs, color: chargeColor, bold: true, glow: true });
  const styleSoc = hudTextStyle({ size: textFs, color: COLOR.textWhite, bold: true, glow: true });
  const styleVolt = hudTextStyle({ size: textFs, color: COLOR.textVoltage });
  const styleAmp = hudTextStyle({ size: textFs, color: COLOR.warningGlow });

  return (
    <pixiContainer x={x} y={y} cursor="pointer" eventMode="static" onClick={handleClick}>
      {bodyTexture ? (
        <pixiSprite
          texture={bodyTexture}
          x={0}
          y={-nubH}
          width={w + shadowOffset}
          height={h + nubH * 2}
        />
      ) : (
        <pixiGraphics draw={drawBody} />
      )}
      <pixiGraphics draw={(g: GraphicsType) => { gGlowRef.current = g; }} />
      <pixiGraphics draw={drawFill} />
      {bodyTexture ? (
        <pixiGraphics
          draw={(g: GraphicsType) => { g.clear(); drawRackWindowBorders(g, rack, config); }}
        />
      ) : (
        <pixiGraphics draw={drawTerminals} />
      )}

      <pixiText text={`R${String(rack?.id ?? 0).padStart(2, "0")}`} x={boxCX} y={boxCY(0)} anchor={0.5}
        style={styleId} />
      <pixiText text={statusOnline ? "ONLINE" : "OFFLINE"} x={boxCX} y={boxCY(1)} anchor={0.5}
        style={styleStatus} />
      <pixiText text={chargeLabel} x={boxCX} y={boxCY(2)} anchor={0.5}
        style={styleCharge} />
      <pixiText text={`${(rack?.soc ?? 0).toFixed(1)}%`} x={boxCX} y={boxCY(3)} anchor={0.5}
        style={styleSoc} />
      <pixiText text={`${rack.voltage?.toFixed(1) ?? "0.0"}V`} x={boxCX} y={boxCY(4)} anchor={0.5}
        style={styleVolt} />
      <pixiText text={`${rack.current?.toFixed(1) ?? "0.0"}A`} x={boxCX} y={boxCY(5)} anchor={0.5}
        style={styleAmp} />
    </pixiContainer>
  );
};

RackCell.displayName = "RackCell";
