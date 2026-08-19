import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { RackCellProps } from "./RackCell.types";
import {
  drawRackSymbol,
  drawRackSymbolGlow,
  rackLabelRows,
} from "./RackCell.drawers";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";
import { hudTextStyle } from "../../hud";
import { COLOR } from "../../../colors";

// Batarya devre sembolü: PANELSIZ sprite (yalnız plakalar + iletken + terminaller)
// + sembol altında YÜZER etiketler (omurganın sağında/solunda, dışa yaslı).
// SOC dolgusu yok — seviye yalnızca % etiketinde gösterilir.
export const RackCell: React.FC<RackCellProps> = ({
  rack, x, y, config, flowDirection, onClick,
}) => {
  const { step, rackWidth: w, rackHeight: h } = config;
  const bodyTexture = useSpriteTexture("rackcell");

  // Sprite sınırları (logical, step=100 referansı): 88x408 sembol, 120x380 kutuda.
  // Kutu oranlarına bağlanır — BSC/TMS/BESS dahil her konfigürasyonda
  // sembol kutu merkezine oturur, üst/alt nublar bus kablolarına değer.
  const spriteRect = {
    x: w * (16 / 120),
    y: -h * (14 / 380),
    width: w * (88 / 120),
    height: h * (408 / 380),
  };

  const drawSymbol = useCallback(
    (g: GraphicsType) => { g.clear(); drawRackSymbol(g, config); },
    [config],
  );

  const gGlowRef = usePixiTickerEffect(
    (g, time) => { drawRackSymbolGlow(g, rack, config, flowDirection, time); },
    [rack, config, flowDirection],
  );

  const handleClick = useCallback(() => {
    onClick?.(rack, { x, y });
  }, [onClick, rack, x, y]);

  const statusOnline = rack.status === "online";
  const statusColor = statusOnline ? COLOR.success : COLOR.error;

  let chargeColor: number;
  let chargeLabel: string;
  if (rack.charge_status === "Charge") { chargeColor = COLOR.success; chargeLabel = "CHARGE"; }
  else if (rack.charge_status === "Discharge") { chargeColor = COLOR.warning; chargeLabel = "DISCHARGE"; }
  else { chargeColor = COLOR.idle; chargeLabel = "IDLE"; }

  const textFs = Math.max(6, step * 0.15);

  // Tüm etiketler CB alt yazılarıyla aynı stil: boyut, kalınlık, glow.
  const styleId = hudTextStyle({ size: textFs, color: COLOR.textMuted, bold: true, glow: true });
  const styleStatus = hudTextStyle({ size: textFs, color: statusColor, bold: true, glow: true });
  const styleCharge = hudTextStyle({ size: textFs, color: chargeColor, bold: true, glow: true });
  const styleSoc = hudTextStyle({ size: textFs, color: COLOR.textWhite, bold: true, glow: true });
  const styleVolt = hudTextStyle({ size: textFs, color: COLOR.textVoltage, bold: true, glow: true });
  const styleAmp = hudTextStyle({ size: textFs, color: COLOR.warningGlow, bold: true, glow: true });

  const texts = [
    { text: `R${String(rack?.id ?? 0).padStart(2, "0")}`, style: styleId },
    { text: statusOnline ? "ONLINE" : "OFFLINE", style: styleStatus },
    { text: chargeLabel, style: styleCharge },
    { text: `${(rack?.soc ?? 0).toFixed(1)}%`, style: styleSoc },
    { text: `${rack.voltage?.toFixed(1) ?? "0.0"}V`, style: styleVolt },
    { text: `${rack.current?.toFixed(1) ?? "0.0"}A`, style: styleAmp },
  ];

  const labelRows = rackLabelRows(config);

  return (
    <pixiContainer x={x} y={y} cursor="pointer" eventMode="static" onClick={handleClick}>
      {bodyTexture ? (
        <pixiSprite
          texture={bodyTexture}
          x={spriteRect.x}
          y={spriteRect.y}
          width={spriteRect.width}
          height={spriteRect.height}
        />
      ) : (
        <pixiGraphics draw={drawSymbol} />
      )}
      <pixiGraphics draw={(g: GraphicsType) => { gGlowRef.current = g; }} />

      {texts.map((t, row) => {
        const pos = labelRows[row];
        if (!pos) return null;
        return (
          <pixiText
            key={row}
            text={t.text}
            x={pos.x}
            y={pos.y}
            anchor={pos.anchor}
            style={t.style}
          />
        );
      })}
    </pixiContainer>
  );
};

RackCell.displayName = "RackCell";
