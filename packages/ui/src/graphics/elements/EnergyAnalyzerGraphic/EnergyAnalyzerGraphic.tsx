import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { EnergyAnalyzerGraphicProps } from "./EnergyAnalyzerGraphic.types";
import { drawEABox, drawEADial } from "./EnergyAnalyzerGraphic.drawers";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";
import { hudTextStyle } from "../../hud";
import { COLOR } from "../../../colors";

// Enerji analizörü: iç içe 2 kutu sprite (kablo grisi tonunda) — kutu merkezi
// yatay kablo hattına hizalanır. Değer satırları kutunun altında, alt alta,
// ortalanmış (CB/DC etiket stiliyle). V/I/P/E önekleri yok.
export const EnergyAnalyzerGraphic: React.FC<EnergyAnalyzerGraphicProps> = ({
  data, x, y, width: w, height: h, config,
}) => {
  const { step } = config;

  const bodyTexture = useSpriteTexture("energyanalyzergraphic");

  // Kutu: tasarım 300x206 oranında — genişlikten türetilir.
  const boxH = w * (206 / 300);
  // Kutu, alanın dikey ortasına (kablo hattı) merkezlenir.
  const boxY = y + (h - boxH) / 2;

  const drawBody = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawEABox(g, x, boxY, w, boxH, step);
      drawEADial(g, x + w / 2, boxY + boxH / 2, Math.min(w, boxH) * 0.17, step);
    },
    [x, boxY, w, boxH, step],
  );

  // Kadran: iç kutunun ortasında, sprite üstüne kod çizimi.
  const drawDial = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawEADial(g, x + w / 2, boxY + boxH / 2, Math.min(w, boxH) * 0.17, step);
    },
    [x, boxY, w, boxH, step],
  );

  const textFs = Math.max(6, step * 0.15);
  const rows = [
    { text: data.voltage != null ? `${data.voltage.toFixed(1)} V` : "-- V", color: COLOR.textVoltage },
    { text: data.current != null ? `${data.current.toFixed(1)} A` : "-- A", color: COLOR.warningGlow },
    { text: data.power != null ? `${data.power.toFixed(1)} kW` : "-- kW", color: COLOR.textMuted },
    { text: data.energy != null ? `${data.energy.toFixed(1)} kWh` : "-- kWh", color: COLOR.textMuted },
  ];

  const rowsY = boxY + boxH + step * 0.18;

  return (
    <pixiContainer>
      {bodyTexture ? (
        <>
          <pixiSprite
            texture={bodyTexture}
            x={x}
            y={boxY}
            width={w}
            height={boxH}
          />
          <pixiGraphics draw={drawDial} />
        </>
      ) : (
        <pixiGraphics draw={drawBody} />
      )}

      {rows.map((row, ri) => (
        <pixiText
          key={ri}
          text={row.text}
          x={x + w / 2}
          y={rowsY + ri * (textFs + step * 0.06)}
          anchor={0.5}
          style={hudTextStyle({ size: textFs, color: row.color, bold: true, glow: true })}
        />
      ))}
    </pixiContainer>
  );
};

EnergyAnalyzerGraphic.displayName = "EnergyAnalyzerGraphic";
