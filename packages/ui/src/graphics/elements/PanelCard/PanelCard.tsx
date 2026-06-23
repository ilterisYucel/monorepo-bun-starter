import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { PanelCardProps } from "./PanelCard.types";
import { drawPanelBody, drawPanelTemp } from "./PanelCard.drawers";

export const PanelCard: React.FC<PanelCardProps> = ({ pos, panelTemp, config }) => {
  const drawBody = useCallback(
    (g: GraphicsType) => { g.clear(); drawPanelBody(g, pos, config); },
    [pos, config],
  );

  const drawTemp = useCallback(
    (g: GraphicsType) => { g.clear(); drawPanelTemp(g, pos, panelTemp, config); },
    [pos, panelTemp, config],
  );

  const fs = Math.max(11, config.step * 0.3);

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBody} />
      <pixiGraphics draw={drawTemp} />
      <pixiText text="PANEL" x={pos.x + pos.width / 2} y={pos.y + config.step * 0.8} anchor={0.5}
        style={{ fontSize: fs, fill: 0xe5e7eb, fontFamily: "monospace", fontWeight: "bold" }} />
      <pixiText text={`${panelTemp.toFixed(1)}°C`} x={pos.x + pos.width / 2} y={pos.y + config.step * 1.7} anchor={0.5}
        style={{ fontSize: Math.max(12, config.step * 0.32), fill: 0xffffff, fontFamily: "monospace", fontWeight: "bold" }} />
    </pixiContainer>
  );
};

PanelCard.displayName = "PanelCard";
