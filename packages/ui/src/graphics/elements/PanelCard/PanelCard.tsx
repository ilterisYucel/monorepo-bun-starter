import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { PanelCardProps } from "./PanelCard.types";
import { drawPanelBody, drawPanelBarSlot, drawPanelTemp, drawPanelTempBorder } from "./PanelCard.drawers";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";
import { COLOR } from "../../../colors";

export const PanelCard: React.FC<PanelCardProps> = ({ pos, panelTemp, panelHumidity, config, minimal }) => {
  const bodyTexture = useSpriteTexture("panelcard");

  const drawBody = useCallback(
    (g: GraphicsType) => { g.clear(); drawPanelBody(g, pos, config); },
    [pos, config],
  );

  const drawBarSlot = useCallback(
    (g: GraphicsType) => { g.clear(); drawPanelBarSlot(g, pos, config); },
    [pos, config],
  );

  const drawTemp = useCallback(
    (g: GraphicsType) => {
      g.clear();
      // Termometre SOL ÜSTTE — sprite yuvasından bağımsız, deterministic geometri.
      if (bodyTexture) {
        drawPanelTempBorder(g, pos, config);
      }
      drawPanelTemp(g, pos, panelTemp, config);
    },
    [pos, panelTemp, config, bodyTexture],
  );

  const margin = 6;

  const fs = Math.max(11, config.step * 0.3);
  const smallFs = Math.max(7, config.step * 0.17);

  return (
    <pixiContainer>
      {bodyTexture ? (
        <pixiSprite
          texture={bodyTexture}
          x={pos.x - margin}
          y={pos.y - margin}
          width={pos.width + margin * 2}
          height={pos.height + margin * 2}
        />
      ) : (
        <>
          <pixiGraphics draw={drawBody} />
          <pixiGraphics draw={drawBarSlot} />
        </>
      )}
      <pixiGraphics draw={drawTemp} />
      <pixiText text="PANEL" x={pos.x + pos.width / 2} y={pos.y + config.step * 0.8} anchor={0.5}
        style={{ fontSize: fs, fill: COLOR.textPrimary, fontFamily: "monospace", fontWeight: "bold" }} />
      <pixiText text={`${panelTemp.toFixed(1)}°C`} x={pos.x + pos.width / 2} y={pos.y + config.step * (minimal ? 1.4 : 1.7)} anchor={0.5}
        style={{ fontSize: Math.max(12, config.step * 0.32), fill: COLOR.textWhite, fontFamily: "monospace", fontWeight: "bold" }} />
      {!minimal && panelHumidity != null && (
        <pixiText text={`💧 %${panelHumidity.toFixed(0)} RH`} x={pos.x + pos.width / 2} y={pos.y + config.step * 2.5} anchor={0.5}
          style={{ fontSize: smallFs, fill: COLOR.info, fontFamily: "monospace" }} />
      )}
    </pixiContainer>
  );
};

PanelCard.displayName = "PanelCard";
