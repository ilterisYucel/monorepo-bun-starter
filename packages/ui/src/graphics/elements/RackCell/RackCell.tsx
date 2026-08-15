import React, { useCallback, useMemo } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { RackCellProps } from "./RackCell.types";
import {
  drawRackBody,
  drawRackGlow,
  drawRackTerminals,
  drawRackTubeHousing,
  drawRackTubeFill,
  drawRackWindowBorders,
  rackWindowRects,
  rackTubeRect,
} from "./RackCell.drawers";
import { RACKCELL_META } from "./rackcell-meta";
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

  const drawTubeHousing = useCallback(
    (g: GraphicsType) => { g.clear(); drawRackTubeHousing(g, config); },
    [config],
  );

  const gGlowRef = usePixiTickerEffect(
    (g, time) => { drawRackGlow(g, rack, config, flowDirection, time); },
    [rack, config, flowDirection],
  );

  const handleClick = useCallback(() => {
    onClick?.(rack, { x, y });
  }, [onClick, rack, x, y]);

  const { step, rackWidth: w, rackHeight: h } = config;
  const bodyTexture = useSpriteTexture("rackcell");
  const nubH = step * 0.14;
  const shadowOffset = step * 0.08;

  // Pencere/tüp rect'leri: sprite modunda AI çıktısından ölçülmüş meta,
  // değilse tasarım geometrisi. Meta gövdeye oran olduğu için gerçek
  // rackWidth/rackHeight ile ölçeklenir.
  const windows = useMemo(() => {
    const src = bodyTexture && RACKCELL_META.measured ? RACKCELL_META.windows : null;
    if (src) {
      return src.map((rect) => ({
        x: rect.x * w,
        y: rect.y * h,
        width: rect.width * w,
        height: rect.height * h,
      }));
    }
    return rackWindowRects(config);
  }, [bodyTexture, w, h, config]);

  const tube = useMemo(() => {
    const src = bodyTexture && RACKCELL_META.measured ? RACKCELL_META.tube : null;
    if (src) {
      return {
        x: src.x * w,
        y: src.y * h,
        width: src.width * w,
        height: src.height * h,
      };
    }
    return rackTubeRect(config);
  }, [bodyTexture, w, h, config]);

  const drawTubeFill = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawRackTubeFill(g, rack?.soc ?? 0, flowDirection, config, bodyTexture ? tube : undefined);
    },
    [rack, config, flowDirection, bodyTexture, tube],
  );

  const drawWindowBorders = useCallback(
    (g: GraphicsType) => { g.clear(); drawRackWindowBorders(g, rack, config, windows); },
    [rack, config, windows],
  );

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

  const texts = [
    { text: `R${String(rack?.id ?? 0).padStart(2, "0")}`, style: styleId },
    { text: statusOnline ? "ONLINE" : "OFFLINE", style: styleStatus },
    { text: chargeLabel, style: styleCharge },
    { text: `${(rack?.soc ?? 0).toFixed(1)}%`, style: styleSoc },
    { text: `${rack.voltage?.toFixed(1) ?? "0.0"}V`, style: styleVolt },
    { text: `${rack.current?.toFixed(1) ?? "0.0"}A`, style: styleAmp },
  ];

  const centerY = (rect: { y: number; height: number }) => rect.y + rect.height / 2;

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

      {bodyTexture ? (
        <>
          <pixiGraphics draw={drawWindowBorders} />
          <pixiGraphics draw={drawTubeFill} />
        </>
      ) : (
        <>
          <pixiGraphics draw={drawTubeHousing} />
          <pixiGraphics draw={drawTubeFill} />
          <pixiGraphics draw={drawTerminals} />
        </>
      )}

      {texts.map((t, row) => {
        const rect = windows[row];
        if (!rect) return null;
        return (
          <pixiText
            key={row}
            text={t.text}
            x={rect.x + rect.width / 2}
            y={centerY(rect)}
            anchor={0.5}
            style={t.style}
          />
        );
      })}
    </pixiContainer>
  );
};

RackCell.displayName = "RackCell";
