import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { HvacUnitProps } from "./HvacUnit.types";
import { drawHvacBody, drawHvacAnim } from "./HvacUnit.drawers";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";

export const HvacUnit: React.FC<HvacUnitProps> = ({ hvac, pos, config }) => {
  const drawBody = useCallback(
    (g: GraphicsType) => { g.clear(); drawHvacBody(g, pos, hvac, config); },
    [pos, hvac, config],
  );

  const gAnimRef = usePixiTickerEffect(
    (g, time) => { drawHvacAnim(g, pos, hvac, config, time); },
    [pos, hvac, config],
  );

  const fs = Math.max(7, config.step * 0.2);

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBody} />
      <pixiGraphics draw={(g: GraphicsType) => { gAnimRef.current = g; }} />
      <pixiText
        text={hvac.mode === "cooling" ? "COOL" : hvac.mode === "warming" ? "WARM" : "IDLE"}
        x={pos.x + pos.width / 2} y={pos.y + pos.height / 2} anchor={0.5}
        style={{ fontSize: fs, fill: 0x9ca3af, fontFamily: "monospace", fontWeight: "bold" }} />
    </pixiContainer>
  );
};

HvacUnit.displayName = "HvacUnit";
