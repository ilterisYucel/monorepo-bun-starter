import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { DCOutputProps } from "./DCOutput.types";
import { drawOutputBody, drawOutputGlow } from "./DCOutput.drawers";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";

export const DCOutput: React.FC<DCOutputProps> = ({ config, output, dcOutput }) => {
  const isActive = dcOutput?.status === "online";

  const drawBody = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawOutputBody(g, config, output, isActive);
    },
    [config, output, isActive],
  );

  const gGlowRef = usePixiTickerEffect(
    (g, time) => { drawOutputGlow(g, config, output, isActive, time); },
    [config, output, isActive],
  );

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBody} />
      <pixiGraphics draw={(g: GraphicsType) => { gGlowRef.current = g; }} />
    </pixiContainer>
  );
};

DCOutput.displayName = "DCOutput";
